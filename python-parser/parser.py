import pdfplumber
import re
import os
import base64
import io
from typing import List, Dict, Optional, Any
from openai import OpenAI
from pdf2image import convert_from_path
from PIL import Image

# Section sizes: Universal beams/columns, SHS, RHS, plates, etc.
SECTION_REGEX = re.compile(r"\b(\d+\s*[xX]?\s*\d*\s*(?:UB|UC|WB|SHS|RHS|CHS|FB|WC|CWB|PFC|EA|UA|SB|WF|mm\s*Plate)\s*\d*)\b", re.I)
# Also match plates: 16mmPlate, 32mm Plate, etc.
PLATE_REGEX = re.compile(r"\b(\d+\s*mm\s*Plate)\b", re.I)
# AkzoNobel member format: "AU SHS 89x89x6.0", "AU 250UB37.3", "Plate 1000x10", "A 200x200x8"
AKZONOBEL_MEMBER_REGEX = re.compile(
    r"\b(?:AU\s+)?(?:A\s+)?(?:Plate\s+)?(\d+(?:\.\d+)?(?:\s*[xX]\s*\d+(?:\.\d+)?)*(?:\s*(?:UB|UC|SHS|RHS|CHS|PFC|EA))?(?:\s*\d+(?:\.\d+)?)?)\b",
    re.I
)

FRR_REGEX = re.compile(r"\b(?:R|FRR)[-:\s]*(\d{2,3})\b", re.I)
FRR_LEGACY_REGEX = re.compile(r"\b(?:FRR|Fire\s+Rating)[-:\s]*(\d+)", re.I)
HAZARD_RATING_REGEX = re.compile(r"\b(?:R|FRR)[-:\s]*(\d{2,3})\s*Hazard\s*Rating", re.I)
# DFT in microns OR millimeters
DFT_REGEX = re.compile(r"\b(\d{2,4})\s*(?:micron|μm|um|mic)?\b", re.I)
DFT_MM_REGEX = re.compile(r"\b(\d+(?:\.\d+)?)\s*mm\b", re.I)
MEMBER_MARK_REGEX = re.compile(r"\b([A-Z]{1,3}\d+[A-Z]?|[A-Z]\d+-[A-Z]\d+|M\d+)\b")

# Configuration types (for Altex format)
CONFIGURATION_REGEX = re.compile(r"\b(Beam|Column|Brace|Plate)\b", re.I)

def normalize_section(section_raw: str) -> str:
    """Normalize section size to standard format"""
    normalized = section_raw.upper().strip()
    normalized = re.sub(r"\s+", "", normalized)
    normalized = re.sub(r"X", "x", normalized, flags=re.I)
    return normalized

def extract_section_size(text: str) -> Optional[tuple]:
    """
    Extract section size from text - handles both standard and plate formats.
    Returns: (raw_section, normalized_section) or None
    """
    # Try plate format first (16mmPlate, 32mm Plate)
    plate_match = PLATE_REGEX.search(text)
    if plate_match:
        raw = plate_match.group(1)
        normalized = normalize_section(raw)
        return (raw, normalized)

    # Try standard section format (610UB125, 200x200SHS, etc.)
    section_match = SECTION_REGEX.search(text)
    if section_match:
        raw = section_match.group(1)
        normalized = normalize_section(raw)
        return (raw, normalized)

    return None

def extract_hazard_rating_from_header(text: str) -> Optional[Dict[str, Any]]:
    """Extract hazard rating from column header (e.g., 'R60 Hazard Rating (Mins)')"""
    match = HAZARD_RATING_REGEX.search(text)
    if not match:
        return None

    minutes = int(match.group(1))

    if minutes not in [30, 60, 90, 120, 180, 240]:
        return None

    return {
        "frr_minutes": minutes,
        "frr_format": f"{minutes}/-/-"
    }

def normalize_frr(text: str) -> Optional[Dict[str, Any]]:
    """Extract and normalize FRR rating (handles R30, R60, R120 format and FRR: 60 format)"""
    match = FRR_REGEX.search(text)
    if not match:
        match = FRR_LEGACY_REGEX.search(text)

    if not match:
        return None

    minutes = int(match.group(1))

    if minutes not in [30, 60, 90, 120, 180, 240]:
        return None

    return {
        "frr_minutes": minutes,
        "frr_format": f"{minutes}/-/-"
    }

def extract_dft(text: str) -> Optional[int]:
    """Extract DFT value in microns"""
    matches = DFT_REGEX.findall(text)

    for match in matches:
        value = int(match)
        # Accept wider range: 100-5000 microns (was 300-3000)
        if 100 <= value <= 5000:
            return value

    return None

def extract_member_mark(text: str) -> Optional[str]:
    """Extract member mark (e.g., B10, C5, BR1)"""
    match = MEMBER_MARK_REGEX.search(text)
    if match:
        return match.group(1)
    return None

def extract_coating_product(text: str) -> Optional[str]:
    """Extract coating product name - preserves all alphanumeric characters and spaces"""
    coating_patterns = [
        r"(Interchar\s+\d+\w*)",           # Interchar 212, Interchar 1120
        r"(Nullifire\s+\S+)",              # Nullifire SC601, Nullifire S607
        r"(Carboline\s+\S+)",              # Carboline Pyrocrete, etc.
        r"(Steelguard\s+\S+)",             # Steelguard products
        r"(Chartek\s+\S+)",                # Chartek products
        r"(Isolatek\s+\S+)",               # Isolatek products
        r"(Jotun\s+\S+)",                  # Jotun products
        r"(International\s+\S+)",          # International Paints
        r"(PPG\s+\S+)",                    # PPG products
        r"(Hempel\s+\S+)",                 # Hempel products
        r"(Sherwin[\-\s]Williams\s+\S+)",  # Sherwin-Williams products
        r"(\w+fire\s+\S+)",                # Generic *fire products
        r"(\w+char\s+\S+)"                 # Generic *char products
    ]

    for pattern in coating_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            product_name = match.group(1).strip()
            # Clean up excessive whitespace but preserve the name
            product_name = re.sub(r"\s+", " ", product_name)
            return product_name

    return None

def extract_element_type(text: str) -> Optional[str]:
    """Extract element type (beam, column, brace)"""
    text_lower = text.lower()

    if "beam" in text_lower:
        return "beam"
    elif "column" in text_lower or "col" in text_lower:
        return "column"
    elif "brace" in text_lower:
        return "brace"

    return None

def group_rows(words: List[Dict], tolerance: int = 3) -> List[Dict]:
    """Group words by Y position to form rows"""
    rows = []
    words_sorted = sorted(words, key=lambda w: w["top"])

    for word in words_sorted:
        placed = False
        for row in rows:
            if abs(row["y"] - word["top"]) < tolerance:
                row["words"].append(word)
                placed = True
                break

        if not placed:
            rows.append({
                "y": word["top"],
                "words": [word]
            })

    for row in rows:
        row["words"].sort(key=lambda w: w["x0"])

    return rows

def stitch_rows(rows: List[Dict]) -> List[Dict]:
    """Stitch together broken rows (e.g., 10 + 0 → 100)"""
    stitched = []
    buffer = None

    for row in rows:
        row_text = " ".join(w["text"] for w in row["words"]).strip()

        if row_text.isdigit() and len(row_text) <= 2:
            if buffer:
                buffer["words"].extend(row["words"])
            continue

        if buffer:
            stitched.append(buffer)
        buffer = row

    if buffer:
        stitched.append(buffer)

    return stitched

def is_valid_structural_row(text: str, require_frr: bool = False) -> bool:
    """
    Check if row contains valid structural member data.
    NOW FLEXIBLE: Only requires a section size, FRR is optional.
    """
    # Check for section size OR plate
    if not SECTION_REGEX.search(text) and not PLATE_REGEX.search(text):
        return False

    # Skip obvious header rows
    text_lower = text.lower()
    header_keywords = ['element name', 'section size', 'configuration', 'member mark', 'frr minutes', 'dft microns']
    if any(kw in text_lower for kw in header_keywords):
        # Only skip if it doesn't also contain actual numeric data
        if not re.search(r'\d{3,}', text):  # No substantial numbers
            return False

    # Minimum length check
    if len(text) < 3:
        return False

    return True

def detect_document_format(text: str) -> str:
    """
    Detect the document format based on content markers.
    Returns: "akzonobel", "altex", "jotun", or "generic"
    """
    text_lower = text.lower()

    # AkzoNobel markers
    akzonobel_markers = [
        "client schedule",
        "protective coatings www.international-pc.com",
        "parts list",
        "hazard rating",
        "akzonobel"
    ]

    akzonobel_score = sum(1 for marker in akzonobel_markers if marker in text_lower)

    # Altex markers
    altex_markers = [
        "altex coatings limited",
        "nullifire",
        "p.o. box 142",
        "tauranga"
    ]

    altex_score = sum(1 for marker in altex_markers if marker in text_lower)

    # Jotun markers
    jotun_markers = [
        "jotun",
        "steelmaster",
        "zone loading schedule",
        "protection: 30 minutes",
        "protection: 60 minutes"
    ]

    jotun_score = sum(1 for marker in jotun_markers if marker in text_lower)

    # Decide format
    if akzonobel_score >= 2:
        return "akzonobel"
    elif jotun_score >= 2:
        return "jotun"
    elif altex_score >= 2:
        return "altex"
    else:
        return "generic"

def extract_document_metadata(text: str, format_type: str = "generic") -> Dict[str, Any]:
    """
    Extract document-level metadata from full PDF text.
    Looks for:
    - Schedule Reference (e.g., "Schedule Reference: CST-250911A" or "Reference AN022478-Rev 01-Option 01")
    - Project name (e.g., "Project: Scott Point Road, Interior..." or "Project Diocesan Shrewsbury Block Redevelopment")
    - Coating system (e.g., "NULLIFIRE SC601", "Interchar 3120")
    - Supplier (e.g., "Altex Coatings Limited", "AkzoNobel")
    """
    metadata = {
        "schedule_reference": None,
        "project_name": None,
        "coating_system": None,
        "supplier": None,
        "document_format": format_type,
    }

    # Schedule Reference - multiple formats
    schedule_ref_patterns = [
        r"Schedule\s+Reference\s*[:：]\s*([A-Z0-9\-]+)",  # Altex format
        r"Reference\s+([A-Z0-9\-]+)",  # AkzoNobel format
    ]
    for pattern in schedule_ref_patterns:
        schedule_ref_match = re.search(pattern, text, re.I)
        if schedule_ref_match:
            metadata["schedule_reference"] = schedule_ref_match.group(1).strip()
            break

    # Project name - multiple formats
    project_patterns = [
        r"Project\s*[:：]\s*([^\n]+)",  # Standard format with colon
        r"Project\s+([^\n]+?)\s+(?:Reference|Test\s+standards)",  # AkzoNobel format (until next field)
    ]
    for pattern in project_patterns:
        project_match = re.search(pattern, text, re.I)
        if project_match:
            project_name = project_match.group(1).strip()
            # Clean up extra words
            project_name = re.sub(r"\s+(Reference|Test\s+standards).*", "", project_name, flags=re.I)
            metadata["project_name"] = project_name
            break

    # Coating system - look for common patterns
    coating_patterns = [
        r"(NULLIFIRE\s+[A-Z0-9]+)",
        r"(Nullifire\s+[A-Z0-9]+)",
        r"(INTERCHAR\s+\d+)",
        r"(Interchar\s+\d+)",
        r"(CARBOLINE\s+\S+)",
    ]
    for pattern in coating_patterns:
        coating_match = re.search(pattern, text)
        if coating_match:
            metadata["coating_system"] = coating_match.group(1).strip()
            break

    # Supplier - look for known suppliers
    supplier_patterns = [
        r"(Altex\s+Coatings\s+Limited)",
        r"(AkzoNobel)",
        r"(International\s+(?:Paint|Protective\s+Coatings))",
        r"(Jotun)",
        r"(PPG)",
        r"(Hempel)",
    ]
    for pattern in supplier_patterns:
        supplier_match = re.search(pattern, text, re.I)
        if supplier_match:
            metadata["supplier"] = supplier_match.group(1).strip()
            break

    return metadata

def parse_akzonobel_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse an AkzoNobel loading schedule PDF with specialized logic.

    AkzoNobel schedules have:
    - Header with Project, Reference, Test standards, Report Date
    - "Parts List" sections with "60 Minutes FRR" and "30 Minutes FRR"
    - Table columns: ID, Member, Type, Section Factor, Hazard Rating, Product, CCT, Quantity, Length, etc.
    - Member format: "AU SHS 89x89x6.0", "AU 250UB37.3", "Plate 1000x10"
    - Hazard Rating: "R60", "R30" (convert to minutes)
    - DFT in mm (convert to microns)
    """
    items = []
    errors = []
    document_metadata = {}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)

            # Extract full document text for metadata
            full_text = ""
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
                except:
                    pass

            # Extract document metadata
            document_metadata = extract_document_metadata(full_text, "akzonobel")

            # Parse each page
            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    # Extract tables
                    tables = page.extract_tables()

                    if not tables:
                        continue

                    for table in tables:
                        # Find header row to determine column indices
                        header_row = None
                        for idx, row in enumerate(table):
                            if row and any("Member" in str(cell) for cell in row if cell):
                                header_row = row
                                break

                        if not header_row:
                            continue

                        # Map column names to indices
                        col_map = {}
                        for idx, cell in enumerate(header_row):
                            if not cell:
                                continue
                            cell_lower = str(cell).lower().strip()
                            if "member" in cell_lower:
                                col_map["member"] = idx
                            elif "hazard" in cell_lower and "rating" in cell_lower:
                                col_map["hazard_rating"] = idx
                            elif "dft" in cell_lower:
                                col_map["dft"] = idx
                            elif "type" in cell_lower and "exp" not in cell_lower:
                                col_map["type"] = idx
                            elif "section" in cell_lower and "factor" in cell_lower:
                                col_map["section_factor"] = idx
                            elif "product" in cell_lower:
                                col_map["product"] = idx
                            elif "comment" in cell_lower:
                                col_map["comments"] = idx

                        # Parse data rows
                        for row in table:
                            if not row or row == header_row:
                                continue

                            # Skip if first cell is empty or "ID"
                            if not row[0] or str(row[0]).strip().upper() == "ID":
                                continue

                            # Extract member name
                            member_raw = None
                            if "member" in col_map and len(row) > col_map["member"]:
                                member_raw = str(row[col_map["member"]]).strip() if row[col_map["member"]] else None

                            if not member_raw:
                                continue

                            # Normalize member name (remove AU prefix, extra spaces, newlines)
                            member_normalized = re.sub(r"\s+", " ", member_raw).strip()
                            member_normalized = re.sub(r"^(AU|A)\s+", "", member_normalized)

                            # Check if it's a valid steel member
                            if not (re.search(r"\d+(?:UB|UC|SHS|RHS|CHS|PFC|EA)", member_normalized, re.I) or
                                    "plate" in member_normalized.lower()):
                                continue

                            # Extract FRR from Hazard Rating (R60 -> 60, R30 -> 30)
                            frr_minutes = None
                            if "hazard_rating" in col_map and len(row) > col_map["hazard_rating"]:
                                hazard_rating = str(row[col_map["hazard_rating"]]).strip() if row[col_map["hazard_rating"]] else ""
                                hazard_match = re.search(r"R(\d+)", hazard_rating, re.I)
                                if hazard_match:
                                    frr_minutes = int(hazard_match.group(1))

                            # Extract DFT in mm, convert to microns
                            dft_microns = None
                            if "dft" in col_map and len(row) > col_map["dft"]:
                                dft_str = str(row[col_map["dft"]]).strip() if row[col_map["dft"]] else ""
                                # Try to parse as float
                                try:
                                    dft_mm = float(dft_str)
                                    dft_microns = round(dft_mm * 1000)
                                except:
                                    pass

                            # Extract other fields
                            element_type = None
                            if "type" in col_map and len(row) > col_map["type"]:
                                element_type = str(row[col_map["type"]]).strip() if row[col_map["type"]] else None

                            coating_product = None
                            if "product" in col_map and len(row) > col_map["product"]:
                                coating_product = str(row[col_map["product"]]).strip() if row[col_map["product"]] else None

                            comments = None
                            if "comments" in col_map and len(row) > col_map["comments"]:
                                comments = str(row[col_map["comments"]]).strip() if row[col_map["comments"]] else None

                            # Build row text for reference
                            row_text = " | ".join(str(cell or "") for cell in row)

                            # Calculate confidence
                            missing_fields = 0
                            if not frr_minutes: missing_fields += 1
                            if not dft_microns: missing_fields += 1
                            if not coating_product: missing_fields += 0.5

                            confidence = max(0.6, 1.0 - (missing_fields * 0.15))
                            needs_review = missing_fields >= 1

                            item = {
                                "page": page_number,
                                "line": 0,  # Not available for table extraction
                                "raw_text": row_text.strip(),
                                "member_mark": None,  # AkzoNobel doesn't use member marks
                                "section_size_raw": member_raw,
                                "section_size_normalized": member_normalized,
                                "frr_minutes": frr_minutes,
                                "frr_format": f"{frr_minutes}/-/-" if frr_minutes else None,
                                "dft_required_microns": dft_microns,
                                "coating_product": coating_product,
                                "element_type": element_type,
                                "confidence": confidence,
                                "needs_review": needs_review,
                                "comments": comments,
                            }

                            items.append(item)

                except Exception as page_error:
                    errors.append(f"Page {page_number}: {str(page_error)}")

            if len(items) == 0:
                error_msg = "No structural members detected in AkzoNobel schedule.\n\n"
                error_msg += "Expected format:\n"
                error_msg += "• Member column with values like 'AU SHS 89x89x6.0', 'AU 250UB37.3', 'Plate 1000x10'\n"
                error_msg += "• Hazard Rating column with values like 'R60', 'R30'\n"
                error_msg += "• DFT column with values in mm\n\n"
                error_msg += "Possible issues:\n"
                error_msg += "1. PDF is scanned (text not selectable)\n"
                error_msg += "2. Table structure not recognized\n"
                error_msg += "3. Column headers don't match expected format\n"

                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": error_msg,
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {
                        "total_pages": total_pages,
                        "errors": errors,
                        "document_format": "akzonobel"
                    }
                }

            return {
                "status": "completed",
                "items_extracted": len(items),
                "items": items,
                "metadata": {
                    "total_pages": total_pages,
                    "errors": errors if errors else [],
                    "schedule_reference": document_metadata.get("schedule_reference"),
                    "project_name": document_metadata.get("project_name"),
                    "coating_system": document_metadata.get("coating_system"),
                    "supplier": document_metadata.get("supplier"),
                    "document_format": "akzonobel",
                }
            }

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "PARSER_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {
                "errors": [str(e)],
                "document_format": "akzonobel"
            }
        }

def parse_jotun_schedule(pdf_path: str) -> Dict[str, Any]:
    """Parse Jotun SteelMaster loading schedule - uses text extraction instead of tables"""
    items = []
    errors = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            full_text = ""
            for page in pdf.pages:
                try:
                    full_text += (page.extract_text() or "") + "\n"
                except:
                    pass

            document_metadata = extract_document_metadata(full_text, "jotun")

            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    page_text = page.extract_text() or ""
                    current_frr = None
                    protection_match = re.search(r"Protection:\s*(\d+)\s*Minutes", page_text, re.I)
                    if protection_match:
                        frr_value = int(protection_match.group(1))
                        if frr_value in [30, 60, 90, 120, 180, 240]:
                            current_frr = frr_value

                    lines = page_text.split('\n')
                    for line_num, line in enumerate(lines):
                        line = line.strip()
                        if not line or len(line) < 10:
                            continue
                        if "Total" in line and re.search(r"^\s*Total\s+[\d.]+", line):
                            continue
                        if any(x in line.lower() for x in ["steel type", "designation", "page ", "standard:", "steelmaster enquiry", "subset:"]):
                            continue

                        # Look for steel designations - more flexible patterns for Jotun format
                        steel_patterns = [
                            # SHS/RHS/CHS: "SHS 200x200x9.0", "200x200x9 SHS", "200x200x9"
                            r"(?:SHS|RHS|CHS)?\s*(\d+x\d+x[\d.]+)(?:\s*(?:SHS|RHS|CHS))?",
                            # UB/UC/WB/PFC: "310UB32.0", "AU 310UB32", "310 UB 32"
                            r"(?:AU\s+)?(\d+\s*(?:UB|UC|WB|PFC)\s*[\d.]+)",
                            # Reverse format: "UB 310 32"
                            r"((?:UB|UC|WB|PFC)\s+\d+\s*[\d.]+)",
                            # Plate Girder: "Plate Girder 900x16", "900x16"
                            r"(?:Plate\s+Girder\s+)?(\d+x\d+)",
                            # EQ sections: "EQ 150x150x10"
                            r"(EQ\s+\d+x\d+x\d+)",
                            # Flat Plate: "Flat Plate 200x16"
                            r"(Flat\s+Plate\s+\d+x\d+)"
                        ]

                        designation = None
                        for pattern in steel_patterns:
                            match = re.search(pattern, line, re.I)
                            if match:
                                designation = match.group(1).strip()
                                break

                        if not designation:
                            continue

                        # Clean up designation
                        designation = re.sub(r"^(AU\s+|A\s+)", "", designation).strip()
                        designation_normalized = normalize_section(designation)

                        # Extract DFT - look for decimal numbers in mm (0.441, 0.422, etc.)
                        dft_microns = None
                        dft_matches = re.findall(r"0\.(\d{3})", line)
                        if dft_matches:
                            try:
                                dft_mm = float("0." + dft_matches[-1])
                                dft_microns = round(dft_mm * 1000)
                            except:
                                pass

                        # Extract element type
                        element_type = None
                        line_lower = line.lower()
                        if "beam" in line_lower:
                            element_type = "beam"
                        elif "column" in line_lower or "alm" in line_lower:
                            element_type = "column"

                        item = {
                            "page": page_number,
                            "line": line_num,
                            "raw_text": line[:200],
                            "member_mark": None,
                            "section_size_raw": designation,
                            "section_size_normalized": designation_normalized,
                            "frr_minutes": current_frr,
                            "frr_format": f"{current_frr}/-/-" if current_frr else None,
                            "dft_required_microns": dft_microns,
                            "coating_product": "SteelMaster",
                            "element_type": element_type,
                            "confidence": 0.85 if (current_frr and dft_microns) else 0.7,
                            "needs_review": not (current_frr and dft_microns),
                            "comments": None,
                        }
                        items.append(item)

                except Exception as page_error:
                    errors.append(f"Page {page_number}: {str(page_error)}")

            if len(items) == 0:
                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": "No structural members detected",
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {"total_pages": total_pages, "errors": errors, "document_format": "jotun"}
                }

            return {
                "status": "completed",
                "items_extracted": len(items),
                "items": items,
                "metadata": {
                    "total_pages": total_pages,
                    "errors": errors if errors else [],
                    "schedule_reference": document_metadata.get("schedule_reference"),
                    "project_name": document_metadata.get("project_name"),
                    "coating_system": "Jotun SteelMaster",
                    "supplier": "Jotun",
                    "document_format": "jotun",
                }
            }

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "PARSER_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {"errors": [str(e)], "document_format": "jotun"}
        }

def parse_with_openai(pdf_path: str) -> Dict[str, Any]:
    """
    Parse loading schedule using OpenAI GPT-4 Vision to intelligently extract data
    """
    try:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            return {
                "status": "failed",
                "error_code": "NO_OPENAI_KEY",
                "error_message": "OPENAI_API_KEY not configured",
                "items_extracted": 0,
                "items": [],
                "metadata": {"errors": ["OPENAI_API_KEY environment variable not set"]}
            }

        client = OpenAI(api_key=openai_key)

        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=150)

        all_items = []
        total_pages = len(images)

        for page_num, img in enumerate(images, start=1):
            # Convert image to base64
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            img_base64 = base64.b64encode(buffer.getvalue()).decode()

            # Call GPT-4 Vision
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Extract ALL steel members from this loading schedule page. For each member, extract:
- member_mark: Member identifier (e.g., B1, C2, M10)
- section_size: Steel section designation (e.g., 310UB32, 200x200x9 SHS, 16mmPlate)
- element_type: One of: beam, column, brace, plate, other
- frr_minutes: Fire resistance rating in minutes (30, 60, 90, 120, 180, 240)
- dft_microns: Dry film thickness in microns (convert from mm if needed: 1mm = 1000 microns)
- coating_product: Coating system name

Return JSON array with this exact structure:
[{"member_mark": "B1", "section_size": "310UB32", "element_type": "beam", "frr_minutes": 60, "dft_microns": 450, "coating_product": "SteelMaster"}]

If FRR is in the header/title, apply it to all rows. If a value is missing, use null. Extract EVERY row with steel section data."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{img_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4000
            )

            # Parse response
            content = response.choices[0].message.content

            # Extract JSON from response (handle markdown code blocks)
            import json
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            page_items = json.loads(content.strip())

            # Add page number and normalize
            for item in page_items:
                all_items.append({
                    "page": page_num,
                    "line": 0,
                    "raw_text": "",
                    "member_mark": item.get("member_mark"),
                    "section_size_raw": item.get("section_size"),
                    "section_size_normalized": normalize_section(item.get("section_size", "")),
                    "frr_minutes": item.get("frr_minutes"),
                    "frr_format": f"{item.get('frr_minutes')}/-/-" if item.get("frr_minutes") else None,
                    "dft_required_microns": item.get("dft_microns"),
                    "coating_product": item.get("coating_product"),
                    "element_type": item.get("element_type", "").lower() if item.get("element_type") else None,
                    "confidence": 0.95,
                    "needs_review": False,
                    "comments": None,
                })

        if len(all_items) == 0:
            return {
                "status": "failed",
                "error_code": "NO_ITEMS_EXTRACTED",
                "error_message": "GPT-4 could not extract any items",
                "items_extracted": 0,
                "items": [],
                "metadata": {"total_pages": total_pages, "errors": [], "parser": "openai_gpt4"}
            }

        return {
            "status": "completed",
            "items_extracted": len(all_items),
            "items": all_items,
            "metadata": {
                "total_pages": total_pages,
                "errors": [],
                "parser": "openai_gpt4",
                "supplier": "AI Extracted",
                "coating_system": all_items[0].get("coating_product") if all_items else None,
            }
        }

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "OPENAI_PARSE_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {"errors": [str(e)], "parser": "openai_gpt4"}
        }

def parse_altex_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse an Altex loading schedule PDF with specialized logic.

    Altex schedules have:
    - Header with Project, Customer, Date, Schedule Reference
    - Product name in header (e.g., "NULLIFIRE SC902 FAST-TRACK INTUMESCENT - FIREPROOFING SCHEDULE")
    - Table columns: ITEM CODE, ELEMENT NAME, CONFIGURATION, SIDES, Hp/A, LINEAL Metres, AREA, FRR Minutes, DFT Microns, SC902 LITRES, COMMENTS
    - Element names are section designations (e.g., 150PFC, 200UB22, RB12)
    - Configuration is element type (Beam, Column, etc.)
    """
    items = []
    errors = []
    document_metadata = {}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)

            # Extract full document text for metadata
            full_text = ""
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
                except:
                    pass

            # Extract document metadata
            document_metadata = extract_document_metadata(full_text, "altex")

            # Extract product name from title (e.g., "NULLIFIRE SC902")
            product_name = None
            product_match = re.search(r"(NULLIFIRE\s+[A-Z0-9]+)", full_text, re.I)
            if product_match:
                product_name = product_match.group(1).strip()

            # Extract FRR from project description if present
            header_frr = None
            frr_match = re.search(r"(\d+)\s*min\s*FRR", full_text, re.I)
            if frr_match:
                header_frr = int(frr_match.group(1))

            # Parse each page
            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    # Extract tables
                    tables = page.extract_tables()

                    if not tables:
                        continue

                    for table in tables:
                        # Find header row to determine column indices
                        header_row = None
                        header_idx = None
                        for idx, row in enumerate(table):
                            if row and any(cell and ("ELEMENT NAME" in str(cell).upper() or "DFT" in str(cell).upper()) for cell in row):
                                header_row = row
                                header_idx = idx
                                break

                        if not header_row:
                            continue

                        # Map column names to indices
                        col_map = {}
                        for idx, cell in enumerate(header_row):
                            if not cell:
                                continue
                            cell_upper = str(cell).upper().strip()

                            if "ELEMENT NAME" in cell_upper or "ELEMENT" in cell_upper:
                                col_map["element_name"] = idx
                            elif "CONFIGURATION" in cell_upper:
                                col_map["configuration"] = idx
                            elif "FRR" in cell_upper and "MINUTES" in cell_upper:
                                col_map["frr"] = idx
                            elif "DFT" in cell_upper and "MICRONS" in cell_upper:
                                col_map["dft"] = idx
                            elif "ITEM" in cell_upper and "CODE" in cell_upper:
                                col_map["item_code"] = idx
                            elif "SIDES" in cell_upper:
                                col_map["sides"] = idx
                            elif "HP/A" in cell_upper.replace(" ", ""):
                                col_map["hp_a"] = idx

                        # Validate we found the critical columns
                        if "element_name" not in col_map or "dft" not in col_map:
                            continue

                        # Parse data rows (skip header)
                        for row_idx, row in enumerate(table):
                            if row_idx <= header_idx or not row:
                                continue

                            # Skip if no element name
                            element_name = None
                            if "element_name" in col_map and len(row) > col_map["element_name"]:
                                element_name = str(row[col_map["element_name"]]).strip() if row[col_map["element_name"]] else None

                            if not element_name:
                                continue

                            # Skip totals rows
                            if "total" in element_name.lower():
                                continue

                            # Normalize element name (section size)
                            section_normalized = normalize_section(element_name)

                            # Extract configuration (element type)
                            element_type = None
                            if "configuration" in col_map and len(row) > col_map["configuration"]:
                                config = str(row[col_map["configuration"]]).strip() if row[col_map["configuration"]] else None
                                if config:
                                    config_lower = config.lower()
                                    if "beam" in config_lower:
                                        element_type = "beam"
                                    elif "column" in config_lower:
                                        element_type = "column"
                                    elif "brace" in config_lower:
                                        element_type = "brace"

                            # Extract FRR (from column or header)
                            frr_minutes = header_frr
                            if "frr" in col_map and len(row) > col_map["frr"]:
                                frr_str = str(row[col_map["frr"]]).strip() if row[col_map["frr"]] else ""
                                if frr_str and frr_str.isdigit():
                                    frr_minutes = int(frr_str)

                            # Extract DFT in microns (CRITICAL: get from DFT Microns column, NOT Hp/A)
                            dft_microns = None
                            if "dft" in col_map and len(row) > col_map["dft"]:
                                dft_str = str(row[col_map["dft"]]).strip() if row[col_map["dft"]] else ""
                                # Try to parse as integer
                                try:
                                    dft_microns = int(dft_str)
                                except:
                                    pass

                            # Build row text for reference
                            row_text = " | ".join(str(cell or "") for cell in row)

                            # Calculate confidence
                            missing_fields = 0
                            if not frr_minutes: missing_fields += 1
                            if not dft_microns: missing_fields += 1
                            if not product_name: missing_fields += 0.5

                            confidence = max(0.6, 1.0 - (missing_fields * 0.15))
                            needs_review = missing_fields >= 1

                            item = {
                                "page": page_number,
                                "line": 0,
                                "raw_text": row_text.strip(),
                                "member_mark": None,
                                "section_size_raw": element_name,
                                "section_size_normalized": section_normalized,
                                "frr_minutes": frr_minutes,
                                "frr_format": f"{frr_minutes}/-/-" if frr_minutes else None,
                                "dft_required_microns": dft_microns,
                                "coating_product": product_name,
                                "element_type": element_type,
                                "confidence": confidence,
                                "needs_review": needs_review,
                                "comments": None,
                            }

                            items.append(item)

                except Exception as page_error:
                    errors.append(f"Page {page_number}: {str(page_error)}")

            if len(items) == 0:
                error_msg = "No structural members detected in Altex schedule.\n\n"
                error_msg += "Expected format:\n"
                error_msg += "• ELEMENT NAME column with section designations (e.g., 150PFC, 200UB22)\n"
                error_msg += "• CONFIGURATION column with element types (Beam, Column)\n"
                error_msg += "• FRR Minutes column with fire ratings\n"
                error_msg += "• DFT Microns column with thickness values\n\n"
                error_msg += "Possible issues:\n"
                error_msg += "1. PDF is scanned (text not selectable)\n"
                error_msg += "2. Table structure not recognized\n"
                error_msg += "3. Column headers don't match expected format\n"

                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": error_msg,
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {
                        "total_pages": total_pages,
                        "errors": errors,
                        "document_format": "altex"
                    }
                }

            return {
                "status": "completed",
                "items_extracted": len(items),
                "items": items,
                "metadata": {
                    "total_pages": total_pages,
                    "errors": errors if errors else [],
                    "schedule_reference": document_metadata.get("schedule_reference"),
                    "project_name": document_metadata.get("project_name"),
                    "coating_system": product_name or document_metadata.get("coating_system"),
                    "supplier": "Altex Coatings Limited",
                    "document_format": "altex",
                }
            }

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "PARSER_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {
                "errors": [str(e)],
                "document_format": "altex"
            }
        }

def parse_loading_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse a loading schedule PDF using OpenAI first, with fallback to format-specific parsers

    Returns:
        Dict with status, items_extracted, items, and metadata
    """
    try:
        # Try OpenAI first if key is available
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            result = parse_with_openai(pdf_path)
            if result["status"] == "completed" and result["items_extracted"] > 0:
                return result

        # Fallback to regex-based parsers
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
                except:
                    pass

            # Detect format
            format_type = detect_document_format(full_text)

            # Route to appropriate parser
            if format_type == "akzonobel":
                return parse_akzonobel_schedule(pdf_path)
            elif format_type == "jotun":
                return parse_jotun_schedule(pdf_path)
            elif format_type == "altex":
                return parse_altex_schedule(pdf_path)
            else:
                # Use generic parser for other formats
                return parse_generic_schedule(pdf_path)

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "PARSER_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {
                "errors": [str(e)]
            }
        }

def parse_generic_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse a generic loading schedule PDF (Altex, Jotun, etc.) using deterministic position-based extraction

    Returns:
        Dict with status, items_extracted, items, and metadata
    """
    items = []
    errors = []
    debug_samples = []
    header_frr = None  # FRR extracted from column header
    document_metadata = {}  # Document-level metadata

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)

            # Extract full document text for metadata extraction
            full_text = ""
            for page in pdf.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
                except:
                    pass

            # Detect format
            format_type = detect_document_format(full_text)

            # Extract document metadata
            document_metadata = extract_document_metadata(full_text, format_type)

            # First pass: scan first few pages for hazard rating in headers
            for page_number in range(1, min(3, total_pages + 1)):
                page = pdf.pages[page_number - 1]
                try:
                    # Extract text and look for hazard rating header
                    page_text = page.extract_text()
                    if page_text:
                        hazard_data = extract_hazard_rating_from_header(page_text)
                        if hazard_data:
                            header_frr = hazard_data
                            print(f"Found hazard rating in header on page {page_number}: {hazard_data['frr_format']}")
                            break
                except Exception as e:
                    print(f"Error scanning page {page_number} for header: {e}")

            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    tables = page.extract_tables()
                    table_rows = []

                    if tables:
                        for table in tables:
                            for table_row in table:
                                if table_row:
                                    row_text = " ".join(str(cell or "") for cell in table_row).strip()
                                    if row_text:
                                        table_rows.append({"text": row_text, "idx": len(table_rows)})

                    words = page.extract_words(
                        use_text_flow=True,
                        extra_attrs=["fontname", "size"]
                    )

                    if not words and not table_rows:
                        errors.append(f"Page {page_number}: No text extracted")
                        continue

                    if table_rows:
                        for row_data in table_rows:
                            row_text = row_data["text"]
                            row_idx = row_data["idx"]

                            if len(debug_samples) < 10 and len(row_text) > 15:
                                has_section = bool(SECTION_REGEX.search(row_text))
                                has_frr = bool(FRR_REGEX.search(row_text))
                                debug_samples.append({
                                    "text": row_text[:100],
                                    "has_section": has_section,
                                    "has_frr": has_frr,
                                    "page": page_number,
                                    "source": "table"
                                })

                            # Check if row is valid (has section size)
                            if not is_valid_structural_row(row_text, require_frr=False):
                                continue

                            # Extract section size (required)
                            section_data = extract_section_size(row_text)
                            if not section_data:
                                continue

                            section_raw, section_normalized = section_data

                            # Extract FRR (optional - can be from header, row, or null)
                            frr_minutes = None
                            frr_format = None
                            if header_frr:
                                frr_minutes = header_frr["frr_minutes"]
                                frr_format = header_frr["frr_format"]
                            else:
                                frr_data = normalize_frr(row_text)
                                if frr_data:
                                    frr_minutes = frr_data["frr_minutes"]
                                    frr_format = frr_data["frr_format"]

                            # Extract other fields (all optional)
                            dft_value = extract_dft(row_text)
                            member_mark = extract_member_mark(row_text)
                            coating = extract_coating_product(row_text)
                            element_type = extract_element_type(row_text)

                            # Calculate completeness for confidence scoring
                            missing_fields = 0
                            if not frr_minutes: missing_fields += 1
                            if not dft_value: missing_fields += 1
                            if not member_mark: missing_fields += 1
                            if not coating: missing_fields += 0.5

                            # Confidence: 1.0 = complete, decreases with missing fields
                            confidence = max(0.5, 1.0 - (missing_fields * 0.15))
                            needs_review = missing_fields >= 1

                            item = {
                                "page": page_number,
                                "line": row_idx + 1,
                                "raw_text": row_text.strip(),
                                "member_mark": member_mark,
                                "section_size_raw": section_raw,
                                "section_size_normalized": section_normalized,
                                "frr_minutes": frr_minutes,
                                "frr_format": frr_format,
                                "dft_required_microns": dft_value,
                                "coating_product": coating,
                                "element_type": element_type,
                                "confidence": confidence,
                                "needs_review": needs_review
                            }

                            items.append(item)
                        continue

                    rows = group_rows(words)
                    rows = stitch_rows(rows)

                    for row_idx, row in enumerate(rows):
                        row_text = " ".join(w["text"] for w in row["words"])

                        if len(debug_samples) < 10 and len(row_text) > 15:
                            has_section = bool(SECTION_REGEX.search(row_text))
                            has_frr = bool(FRR_REGEX.search(row_text))
                            debug_samples.append({
                                "text": row_text[:100],
                                "has_section": has_section,
                                "has_frr": has_frr,
                                "page": page_number,
                                "source": "words"
                            })

                        # Check if row is valid (has section size)
                        if not is_valid_structural_row(row_text, require_frr=False):
                            continue

                        # Extract section size (required)
                        section_data = extract_section_size(row_text)
                        if not section_data:
                            continue

                        section_raw, section_normalized = section_data

                        # Extract FRR (optional - can be from header, row, or null)
                        frr_minutes = None
                        frr_format = None
                        if header_frr:
                            frr_minutes = header_frr["frr_minutes"]
                            frr_format = header_frr["frr_format"]
                        else:
                            frr_data = normalize_frr(row_text)
                            if frr_data:
                                frr_minutes = frr_data["frr_minutes"]
                                frr_format = frr_data["frr_format"]

                        # Extract other fields (all optional)
                        dft_value = extract_dft(row_text)
                        member_mark = extract_member_mark(row_text)
                        coating = extract_coating_product(row_text)
                        element_type = extract_element_type(row_text)

                        # Calculate completeness for confidence scoring
                        missing_fields = 0
                        if not frr_minutes: missing_fields += 1
                        if not dft_value: missing_fields += 1
                        if not member_mark: missing_fields += 1
                        if not coating: missing_fields += 0.5

                        # Confidence: 1.0 = complete, decreases with missing fields
                        confidence = max(0.5, 1.0 - (missing_fields * 0.15))
                        needs_review = missing_fields >= 1

                        item = {
                            "page": page_number,
                            "line": row_idx + 1,
                            "raw_text": row_text.strip(),
                            "member_mark": member_mark,
                            "section_size_raw": section_raw,
                            "section_size_normalized": section_normalized,
                            "frr_minutes": frr_minutes,
                            "frr_format": frr_format,
                            "dft_required_microns": dft_value,
                            "coating_product": coating,
                            "element_type": element_type,
                            "confidence": confidence,
                            "needs_review": needs_review
                        }

                        items.append(item)

                except Exception as page_error:
                    errors.append(f"Page {page_number}: {str(page_error)}")

            if len(items) == 0:
                debug_info = "\n\nSample rows found:\n"
                for sample in debug_samples:
                    debug_info += f"Page {sample['page']}: {sample['text']}\n"
                    debug_info += f"  - Has section size: {sample['has_section']}\n"
                    debug_info += f"  - Has FRR rating: {sample['has_frr']}\n"

                error_msg = f"No structural members detected in PDF.\n\n"
                error_msg += "The parser looks for rows containing section sizes such as:\n"
                error_msg += "• UB/UC sections: 610UB125, 310UC97, 460UB75\n"
                error_msg += "• SHS/RHS: 200x200SHS, 150x100RHS\n"
                error_msg += "• Plates: 16mmPlate, 32mm Plate\n\n"

                if header_frr:
                    error_msg += f"✓ Found FRR rating in header: {header_frr['frr_format']}\n"
                else:
                    error_msg += "Note: FRR rating is optional and can be in header or individual rows.\n"

                error_msg += "\nPossible issues:\n"
                error_msg += "1. PDF is scanned (text not selectable) - try CSV format\n"
                error_msg += "2. Section sizes use non-standard format\n"
                error_msg += "3. Table structure not detected properly\n"
                error_msg += f"{debug_info}"

                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": error_msg,
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {
                        "total_pages": total_pages,
                        "errors": errors,
                        "debug_samples": debug_samples,
                        "header_frr": header_frr,
                        "document_format": document_metadata.get("document_format", "generic")
                    }
                }

            return {
                "status": "completed",
                "items_extracted": len(items),
                "items": items,
                "metadata": {
                    "total_pages": total_pages,
                    "errors": errors if errors else [],
                    "schedule_reference": document_metadata.get("schedule_reference"),
                    "project_name": document_metadata.get("project_name"),
                    "coating_system": document_metadata.get("coating_system"),
                    "supplier": document_metadata.get("supplier"),
                    "document_format": document_metadata.get("document_format", "generic"),
                }
            }

    except Exception as e:
        return {
            "status": "failed",
            "error_code": "PARSER_ERROR",
            "error_message": str(e),
            "items_extracted": 0,
            "items": [],
            "metadata": {
                "errors": [str(e)],
                "document_format": "generic"
            }
        }
