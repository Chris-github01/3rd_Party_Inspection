import pdfplumber
import re
from typing import List, Dict, Optional, Any

SECTION_REGEX = re.compile(r"\b(\d+\s*[xX]?\s*\d*\s*(?:UB|UC|WB|SHS|RHS|CHS|FB|WC|CWB|PFC|EA|UA)\s*\d*)\b", re.I)
FRR_REGEX = re.compile(r"\bR(\d{2,3})\b", re.I)
FRR_LEGACY_REGEX = re.compile(r"\bFRR[-:\s]*(\d+)", re.I)
DFT_REGEX = re.compile(r"\b(\d{2,4})\s*(?:micron|μm|um|mic)?\b", re.I)
MEMBER_MARK_REGEX = re.compile(r"\b([A-Z]{1,3}\d+[A-Z]?)\b")

def normalize_section(section_raw: str) -> str:
    """Normalize section size to standard format"""
    normalized = section_raw.upper().strip()
    normalized = re.sub(r"\s+", "", normalized)
    normalized = re.sub(r"X", "x", normalized, flags=re.I)
    return normalized

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
    debug_samples = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)

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
                debug_info = "\n\nSample rows found:\n"
                for sample in debug_samples:
                    debug_info += f"Page {sample['page']}: {sample['text']}\n"
                    debug_info += f"  - Has section size: {sample['has_section']}\n"
                    debug_info += f"  - Has FRR rating: {sample['has_frr']}\n"

                return {
                    "status": "failed",
                    "error_code": "NO_STRUCTURAL_ROWS_DETECTED",
                    "error_message": f"No structural members detected. The parser requires rows with both section sizes (e.g., 610UB125) and FRR ratings (e.g., 60, 90, 120).{debug_info}",
                    "items_extracted": 0,
                    "items": [],
                    "metadata": {
                        "total_pages": total_pages,
                        "errors": errors,
                        "debug_samples": debug_samples
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
