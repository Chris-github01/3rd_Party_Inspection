import pdfplumber
import re
from typing import List, Dict, Optional, Any

SECTION_REGEX = re.compile(r"\b(\d+(?:x\d+(?:x\d+)?)?(?:UB|UC|WB|SHS|RHS|CHS|FB|WC|CWB)\d*)\b", re.I)
FRR_REGEX = re.compile(r"(?:^|\s)R?(\d+)(?:/\d+)?(?:\s|$|min)", re.I)
DFT_REGEX = re.compile(r"\b(\d{2,4})\s*(?:micron|μm|um)?\b", re.I)
MEMBER_MARK_REGEX = re.compile(r"\b([A-Z]{1,3}\d+[A-Z]?)\b")

def normalize_section(section_raw: str) -> str:
    """Normalize section size to standard format"""
    normalized = section_raw.upper().replace(" ", "")
    normalized = re.sub(r"X", "x", normalized)
    return normalized

def normalize_frr(text: str) -> Optional[Dict[str, Any]]:
    """Extract and normalize FRR rating"""
    match = FRR_REGEX.search(text)
    if not match:
        return None

    minutes = int(match.group(1))

    if minutes < 30 or minutes > 240:
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
        if 300 <= value <= 3000:
            return value

    return None

def extract_member_mark(text: str) -> Optional[str]:
    """Extract member mark (e.g., B10, C5, BR1)"""
    match = MEMBER_MARK_REGEX.search(text)
    if match:
        return match.group(1)
    return None

def extract_coating_product(text: str) -> Optional[str]:
    """Extract coating product name"""
    coating_patterns = [
        r"(Nullifire\s+\w+)",
        r"(Carboline\s+\w+)",
        r"(Steelguard\s+\w+)",
        r"(Chartek\s+\w+)",
        r"(Isolatek\s+\w+)",
        r"(\w+fire\s+\w+)"
    ]

    for pattern in coating_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(1)

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

def is_valid_structural_row(text: str) -> bool:
    """Check if row contains valid structural member data"""
    if not SECTION_REGEX.search(text):
        return False

    if not FRR_REGEX.search(text):
        return False

    if len(text) < 10:
        return False

    return True

def parse_loading_schedule(pdf_path: str) -> Dict[str, Any]:
    """
    Parse a loading schedule PDF using deterministic position-based extraction

    Returns:
        Dict with status, items_extracted, items, and metadata
    """
    items = []
    errors = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)

            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    words = page.extract_words(
                        use_text_flow=True,
                        extra_attrs=["fontname", "size"]
                    )

                    if not words:
                        errors.append(f"Page {page_number}: No text extracted")
                        continue

                    rows = group_rows(words)
                    rows = stitch_rows(rows)

                    for row_idx, row in enumerate(rows):
                        row_text = " ".join(w["text"] for w in row["words"])

                        if not is_valid_structural_row(row_text):
                            continue

                        frr_data = normalize_frr(row_text)
                        if not frr_data:
                            continue

                        section_match = SECTION_REGEX.search(row_text)
                        if not section_match:
                            continue

                        section = normalize_section(section_match.group(1))

                        dft_value = extract_dft(row_text)
                        member_mark = extract_member_mark(row_text)
                        coating = extract_coating_product(row_text)
                        element_type = extract_element_type(row_text)

                        needs_review = dft_value is None or member_mark is None

                        confidence = 0.95
                        if needs_review:
                            confidence = 0.75

                        item = {
                            "page": page_number,
                            "line": row_idx + 1,
                            "raw_text": row_text.strip(),
                            "member_mark": member_mark,
                            "section_size_raw": section_match.group(1),
                            "section_size_normalized": section,
                            "frr_minutes": frr_data["frr_minutes"],
                            "frr_format": frr_data["frr_format"],
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
                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": "No structural members detected. Check schedule format.",
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {
                        "total_pages": total_pages,
                        "errors": errors
                    }
                }

            return {
                "status": "completed",
                "items_extracted": len(items),
                "items": items,
                "metadata": {
                    "total_pages": total_pages,
                    "errors": errors if errors else []
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
