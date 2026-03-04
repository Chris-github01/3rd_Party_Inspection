import pdfplumber
import re
from typing import List, Dict, Optional, Any

# Section sizes: Universal beams/columns, SHS, RHS, plates, etc.
SECTION_REGEX = re.compile(r"\b(\d+\s*[xX]?\s*\d*\s*(?:UB|UC|WB|SHS|RHS|CHS|FB|WC|CWB|PFC|EA|UA|SB|WF|mm\s*Plate)\s*\d*)\b", re.I)
# Also match plates: 16mmPlate, 32mm Plate, etc.
PLATE_REGEX = re.compile(r"\b(\d+\s*mm\s*Plate)\b", re.I)

FRR_REGEX = re.compile(r"\b(?:R|FRR)[-:\s]*(\d{2,3})\b", re.I)
FRR_LEGACY_REGEX = re.compile(r"\b(?:FRR|Fire\s+Rating)[-:\s]*(\d+)", re.I)
HAZARD_RATING_REGEX = re.compile(r"\b(?:R|FRR)[-:\s]*(\d{2,3})\s*Hazard\s*Rating", re.I)
DFT_REGEX = re.compile(r"\b(\d{2,4})\s*(?:micron|μm|um|mic)?\b", re.I)
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

def extract_document_metadata(text: str) -> Dict[str, Any]:
    """
    Extract document-level metadata from full PDF text.
    Looks for:
    - Schedule Reference (e.g., "Schedule Reference: CST-250911A")
    - Project name (e.g., "Project: Scott Point Road, Interior...")
    - Coating system (e.g., "NULLIFIRE SC601")
    - Supplier (e.g., "Altex Coatings Limited")
    """
    metadata = {
        "schedule_reference": None,
        "project_name": None,
        "coating_system": None,
        "supplier": None,
    }

    # Schedule Reference
    schedule_ref_match = re.search(r"Schedule\s+Reference\s*[:：]\s*([A-Z0-9\-]+)", text, re.I)
    if schedule_ref_match:
        metadata["schedule_reference"] = schedule_ref_match.group(1).strip()

    # Project name
    project_match = re.search(r"Project\s*[:：]\s*([^\n]+)", text, re.I)
    if project_match:
        metadata["project_name"] = project_match.group(1).strip()

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
        r"(Jotun)",
        r"(International\s+Protective\s+Coatings)",
        r"(PPG)",
        r"(Hempel)",
    ]
    for pattern in supplier_patterns:
        supplier_match = re.search(pattern, text, re.I)
        if supplier_match:
            metadata["supplier"] = supplier_match.group(1).strip()
            break

    return metadata

def parse_loading_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse a loading schedule PDF using deterministic position-based extraction

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

            # Extract document metadata
            document_metadata = extract_document_metadata(full_text)

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
                        "header_frr": header_frr
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
                "errors": [str(e)]
            }
        }
