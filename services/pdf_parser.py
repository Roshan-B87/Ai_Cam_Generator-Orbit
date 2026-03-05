"""
PDF Parser Service — Enhanced with Table Extraction
------------------------------------------------------
Uses PyMuPDF for text-based PDFs + pdfplumber for structured table extraction.
Falls back to Tesseract OCR for scanned image PDFs.
Handles: raw text, complex financial tables, merged cells, multi-page tables,
         section detection, and financial figure extraction.
"""

import fitz  # PyMuPDF
import pdfplumber
import pytesseract
from PIL import Image
import io
import re
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# If Tesseract is not in PATH, set it manually:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ─────────────────────────────────────────────
# TABLE EXTRACTION ENGINE (pdfplumber)
# ─────────────────────────────────────────────

# Custom table extraction settings tuned for Indian financial statements
TABLE_SETTINGS_STRICT = {
    "vertical_strategy":   "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance":      4,
    "join_tolerance":      4,
    "edge_min_length":     10,
    "min_words_vertical":  2,
    "min_words_horizontal": 1,
    "intersection_tolerance": 8,
}

TABLE_SETTINGS_RELAXED = {
    "vertical_strategy":   "text",
    "horizontal_strategy": "text",
    "snap_tolerance":      6,
    "join_tolerance":      6,
    "edge_min_length":     5,
    "min_words_vertical":  1,
    "min_words_horizontal": 1,
    "text_x_tolerance":    5,
    "text_y_tolerance":    5,
}


def extract_tables_from_pdf(file_path: str) -> Dict[str, Any]:
    """
    Extract ALL tables from a PDF using pdfplumber with two-pass strategy:
    1. Strict mode  — line-based detection for well-formatted tables
    2. Relaxed mode — text-alignment detection for borderless / partial-border tables

    Returns:
        {
            "tables": [
                {
                    "page": int,
                    "table_index": int,
                    "headers": [...],
                    "rows": [[...], ...],
                    "table_type": "balance_sheet" | "profit_loss" | "cash_flow" | "notes" | "general",
                    "raw_text": "flattened text of table for RAG"
                },
                ...
            ],
            "total_tables": int,
            "tables_by_page": { page_num: count, ... }
        }
    """
    all_tables = []
    tables_by_page = {}

    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                page_tables = _extract_page_tables(page, page_num)
                if page_tables:
                    all_tables.extend(page_tables)
                    tables_by_page[page_num] = len(page_tables)
    except Exception as e:
        logger.warning(f"pdfplumber table extraction failed: {e}")

    # Post-process: merge multi-page tables & classify
    all_tables = _merge_continuation_tables(all_tables)

    for i, tbl in enumerate(all_tables):
        tbl["table_index"] = i
        tbl["table_type"] = _classify_table(tbl)
        tbl["raw_text"]   = _table_to_text(tbl)

    return {
        "tables": all_tables,
        "total_tables": len(all_tables),
        "tables_by_page": tables_by_page,
    }


def _extract_page_tables(page, page_num: int) -> List[Dict]:
    """Extract tables from a single page using strict then relaxed strategy."""
    results = []

    # Pass 1: Strict (line-based) — catches well-formatted tables
    try:
        strict_tables = page.extract_tables(TABLE_SETTINGS_STRICT)
        if strict_tables:
            for raw_table in strict_tables:
                cleaned = _clean_raw_table(raw_table)
                if cleaned and len(cleaned) >= 2:  # at least header + 1 row
                    results.append({
                        "page": page_num,
                        "headers": cleaned[0],
                        "rows": cleaned[1:],
                        "extraction_method": "strict_lines",
                    })
    except Exception:
        pass

    # Pass 2: Relaxed (text-alignment) — catches borderless / partial tables
    if not results:
        try:
            relaxed_tables = page.extract_tables(TABLE_SETTINGS_RELAXED)
            if relaxed_tables:
                for raw_table in relaxed_tables:
                    cleaned = _clean_raw_table(raw_table)
                    if cleaned and len(cleaned) >= 2:
                        # Avoid duplicates from strict pass
                        if not _is_duplicate_table(cleaned, results):
                            results.append({
                                "page": page_num,
                                "headers": cleaned[0],
                                "rows": cleaned[1:],
                                "extraction_method": "relaxed_text",
                            })
        except Exception:
            pass

    # Pass 3: Fall back to word-based reconstruction for truly complex tables
    if not results:
        try:
            words = page.extract_words(
                x_tolerance=3, y_tolerance=3,
                keep_blank_chars=True, use_text_flow=True
            )
            reconstructed = _reconstruct_table_from_words(words, page.width)
            if reconstructed and len(reconstructed) >= 2:
                results.append({
                    "page": page_num,
                    "headers": reconstructed[0],
                    "rows": reconstructed[1:],
                    "extraction_method": "word_reconstruction",
                })
        except Exception:
            pass

    return results


def _clean_raw_table(raw_table: list) -> list:
    """
    Clean a raw table from pdfplumber:
    - Strip whitespace, replace None with empty string
    - Remove entirely empty rows/columns
    - Handle merged cells (forward-fill empty header cells)
    """
    if not raw_table:
        return []

    cleaned = []
    for row in raw_table:
        if row is None:
            continue
        clean_row = []
        for cell in row:
            if cell is None:
                clean_row.append("")
            else:
                # Normalize whitespace — Indian PDFs often have weird spacing
                text = re.sub(r'\s+', ' ', str(cell).strip())
                clean_row.append(text)
        # Skip completely empty rows
        if any(c.strip() for c in clean_row):
            cleaned.append(clean_row)

    if not cleaned:
        return []

    # Normalize column count (pad shorter rows)
    max_cols = max(len(row) for row in cleaned)
    cleaned = [row + [""] * (max_cols - len(row)) for row in cleaned]

    # Forward-fill merged header cells (common in Indian financial tables)
    if cleaned:
        header = cleaned[0]
        for i in range(1, len(header)):
            if header[i] == "" and header[i - 1] != "":
                header[i] = header[i - 1]

    # Remove entirely blank columns
    non_empty_cols = []
    for col_idx in range(max_cols):
        col_vals = [row[col_idx] for row in cleaned]
        if any(v.strip() for v in col_vals):
            non_empty_cols.append(col_idx)

    cleaned = [[row[c] for c in non_empty_cols] for row in cleaned]

    return cleaned


def _reconstruct_table_from_words(words: list, page_width: float) -> list:
    """
    Reconstruct a table from extracted words by detecting column/row alignment.
    Useful for tables with no visible borders (common in older Indian filings).
    """
    if not words or len(words) < 6:
        return []

    # Group words into rows by y-coordinate (within tolerance)
    Y_TOLERANCE = 4
    sorted_words = sorted(words, key=lambda w: (round(w['top'] / Y_TOLERANCE), w['x0']))

    rows_map = {}
    for w in sorted_words:
        row_key = round(w['top'] / Y_TOLERANCE)
        if row_key not in rows_map:
            rows_map[row_key] = []
        rows_map[row_key].append(w)

    if len(rows_map) < 3:
        return []

    # Detect column boundaries from word x-positions
    all_x0 = sorted(set(round(w['x0'] / 10) * 10 for w in sorted_words))
    if len(all_x0) < 2:
        return []

    # Cluster x-positions into columns
    columns = _cluster_positions(all_x0, tolerance=30)
    if len(columns) < 2:
        return []

    # Build table rows
    table = []
    for row_key in sorted(rows_map.keys()):
        row_words = rows_map[row_key]
        row = [""] * len(columns)
        for w in row_words:
            col_idx = _find_column(w['x0'], columns)
            if col_idx is not None:
                existing = row[col_idx]
                row[col_idx] = (existing + " " + w['text']).strip() if existing else w['text']
        if any(cell.strip() for cell in row):
            table.append(row)

    # Only return if it looks like a real table (multiple cols with data)
    data_cols = sum(1 for c in range(len(columns))
                    if sum(1 for row in table if row[c].strip()) > len(table) * 0.3)
    if data_cols >= 2 and len(table) >= 3:
        return table

    return []


def _cluster_positions(positions: list, tolerance: int = 30) -> list:
    """Cluster nearby x-positions into column boundaries."""
    if not positions:
        return []
    clusters = [[positions[0]]]
    for p in positions[1:]:
        if p - clusters[-1][-1] <= tolerance:
            clusters[-1].append(p)
        else:
            clusters.append([p])
    return [sum(c) / len(c) for c in clusters]


def _find_column(x: float, columns: list) -> Optional[int]:
    """Find which column a word belongs to based on its x-position."""
    min_dist = float('inf')
    best_col = None
    for i, col_x in enumerate(columns):
        dist = abs(x - col_x)
        if dist < min_dist:
            min_dist = dist
            best_col = i
    return best_col if min_dist < 60 else None


def _is_duplicate_table(new_table: list, existing: list) -> bool:
    """Check if a table is a duplicate of one already extracted."""
    if not existing or not new_table:
        return False
    new_text = " ".join(" ".join(row) for row in new_table[:3])
    for tbl in existing:
        existing_rows = [tbl["headers"]] + tbl["rows"][:2]
        existing_text = " ".join(" ".join(row) for row in existing_rows)
        # Simple overlap check
        if len(set(new_text.split()) & set(existing_text.split())) > len(new_text.split()) * 0.7:
            return True
    return False


def _merge_continuation_tables(tables: list) -> list:
    """
    Merge tables that span across pages (common in Indian annual reports).
    Detects continuation when a table on page N+1 has matching headers.
    """
    if len(tables) <= 1:
        return tables

    merged = [tables[0]]
    for tbl in tables[1:]:
        prev = merged[-1]
        # Check if same headers and consecutive pages
        if (tbl["page"] == prev["page"] + 1
                and _headers_match(prev["headers"], tbl["headers"])):
            # Continuation — append rows to previous table
            prev["rows"].extend(tbl["rows"])
            prev["_merged_pages"] = prev.get("_merged_pages", [prev["page"]]) + [tbl["page"]]
        else:
            merged.append(tbl)

    return merged


def _headers_match(h1: list, h2: list) -> bool:
    """Check if two header rows match (fuzzy for minor formatting differences)."""
    if len(h1) != len(h2):
        return False
    matches = sum(1 for a, b in zip(h1, h2)
                  if a.strip().lower() == b.strip().lower() or not a.strip() or not b.strip())
    return matches >= len(h1) * 0.7


# ─────────────────────────────────────────────
# TABLE CLASSIFICATION
# ─────────────────────────────────────────────

TABLE_TYPE_KEYWORDS = {
    "balance_sheet": ["balance sheet", "financial position", "assets", "liabilities", "equity",
                      "reserves", "share capital", "non-current assets", "current assets"],
    "profit_loss":   ["profit", "loss", "revenue", "income", "expense", "ebitda", "turnover",
                      "cost of goods", "operating profit", "tax expense", "earnings"],
    "cash_flow":     ["cash flow", "operating activities", "investing activities",
                      "financing activities", "cash and cash equivalents", "net increase"],
    "notes":         ["note", "schedule", "particulars", "as at", "for the year",
                      "contingent", "related party", "segment"],
    "ratios":        ["ratio", "current ratio", "debt equity", "return on",
                      "net profit margin", "ebitda margin", "dscr"],
    "shareholding":  ["shareholding", "shareholder", "promoter", "public", "shares held"],
    "gst_summary":   ["gstr", "gst", "taxable value", "igst", "cgst", "sgst", "input tax"],
}


def _classify_table(table: dict) -> str:
    """Classify a table type based on header and content keywords."""
    text = " ".join(table.get("headers", [])).lower()
    # Also check first few data rows
    for row in table.get("rows", [])[:5]:
        text += " " + " ".join(row).lower()

    scores = {}
    for table_type, keywords in TABLE_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[table_type] = score

    return max(scores, key=scores.get) if scores else "general"


def _table_to_text(table: dict) -> str:
    """Convert a structured table to flat text for RAG indexing."""
    lines = []
    headers = table.get("headers", [])
    if headers:
        lines.append(" | ".join(headers))
        lines.append("-" * 60)
    for row in table.get("rows", []):
        lines.append(" | ".join(row))
    return "\n".join(lines)


# ─────────────────────────────────────────────
# STRUCTURED FINANCIAL TABLE → DICT CONVERTER
# ─────────────────────────────────────────────

def tables_to_financial_dict(tables: list) -> Dict[str, Any]:
    """
    Convert classified tables into structured financial data dictionaries.
    Handles:
    - Balance Sheet → assets, liabilities, equity line items
    - Profit & Loss → revenue, expenses, profit line items
    - Cash Flow → operating, investing, financing activities
    - Ratios → key ratio extractions

    Returns dict keyed by table_type with structured rows.
    """
    result = {}
    NUMBER_RE = re.compile(r'[\(\-]?\s*[\d,]+(?:\.\d+)?\s*\)?')

    for tbl in tables:
        tbl_type = tbl.get("table_type", "general")
        headers = tbl.get("headers", [])
        rows = tbl.get("rows", [])

        structured_rows = []
        for row in rows:
            if not row or not any(r.strip() for r in row):
                continue

            row_dict = {}
            # First non-empty cell is usually the line item label
            label = ""
            values = []
            for i, cell in enumerate(row):
                cell_clean = cell.strip()
                if not cell_clean:
                    continue
                # Check if this cell looks like a number
                if NUMBER_RE.fullmatch(cell_clean.replace(",", "").replace(" ", "")):
                    val = _parse_financial_number(cell_clean)
                    header_label = headers[i] if i < len(headers) else f"col_{i}"
                    values.append({"header": header_label, "value": val, "raw": cell_clean})
                elif not label:
                    label = cell_clean

            if label:
                row_dict["line_item"] = label
                row_dict["values"] = values
                structured_rows.append(row_dict)

        if structured_rows:
            if tbl_type not in result:
                result[tbl_type] = []
            result[tbl_type].append({
                "page": tbl.get("page"),
                "headers": headers,
                "data": structured_rows,
            })

    return result


def _parse_financial_number(text: str) -> float:
    """
    Parse Indian financial number formats:
    - 1,23,456.78  (Indian comma style)
    - (1,234.56)   (negative in parens)
    - -1234.56     (negative with dash)
    - 1234567      (no commas)
    """
    text = text.strip()
    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative = True
        text = text[1:-1]
    elif text.startswith("-"):
        negative = True
        text = text[1:]

    text = text.replace(",", "").replace(" ", "").strip()
    try:
        val = float(text)
        return -val if negative else val
    except (ValueError, TypeError):
        return 0.0


# ─────────────────────────────────────────────
# CORE TEXT EXTRACTION (PyMuPDF + OCR fallback)
# ─────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> dict:
    """
    Extract text from a PDF file page by page.
    - If a page has selectable text: use PyMuPDF directly (fast)
    - If a page is a scanned image: fall back to Tesseract OCR (slower)

    Returns:
        {
            "pages": { 1: "page text...", 2: "page text...", ... },
            "full_text": "all pages joined",
            "total_pages": int,
            "ocr_pages": [list of page numbers that needed OCR]
        }
    """
    doc = fitz.open(file_path)
    pages = {}
    ocr_pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().strip()

        # If very little text extracted, page is likely a scanned image
        if len(text) < 50:
            text = _ocr_page(page)
            ocr_pages.append(page_num + 1)

        pages[page_num + 1] = text

    doc.close()

    return {
        "pages": pages,
        "full_text": "\n\n".join(pages.values()),
        "total_pages": len(pages),
        "ocr_pages": ocr_pages
    }


def _ocr_page(page) -> str:
    """
    Convert a PDF page to image and run Tesseract OCR on it.
    Used for scanned/image-based pages.
    """
    try:
        # Render page at 2x resolution for better OCR accuracy
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_data))

        # Run Tesseract
        text = pytesseract.image_to_string(image, lang="eng")
        return text.strip()
    except Exception as e:
        return f"[OCR Error on page: {str(e)}]"


# ─────────────────────────────────────────────
# SECTION DETECTION
# ─────────────────────────────────────────────

# Keywords that signal important sections in Indian annual reports
SECTION_KEYWORDS = {
    "directors_report":     ["director", "board of director", "directors' report"],
    "balance_sheet":        ["balance sheet", "financial position"],
    "profit_loss":          ["profit and loss", "statement of profit", "income statement", "p&l"],
    "cash_flow":            ["cash flow statement", "cash flows"],
    "notes_to_accounts":    ["notes to account", "notes forming part"],
    "auditor_report":       ["auditor", "independent auditor", "audit report"],
    "related_party":        ["related party", "related-party transaction"],
    "contingent_liability": ["contingent liabilit", "contingencies"],
    "shareholding":         ["shareholding pattern", "share holding"],
    "rating_report":        ["credit rating", "rating rationale", "crisil", "icra", "care rating"],
}


def detect_sections(full_text: str) -> dict:
    """
    Scan full document text and identify which sections are present.
    Returns a dict mapping section names to approximate character positions.
    """
    full_text_lower = full_text.lower()
    sections_found = {}

    for section_name, keywords in SECTION_KEYWORDS.items():
        for kw in keywords:
            pos = full_text_lower.find(kw)
            if pos != -1:
                sections_found[section_name] = pos
                break  # Found this section, move to next

    return sections_found


def extract_section_text(full_text: str, section_name: str, window: int = 3000) -> Optional[str]:
    """
    Extract text around a detected section.
    window = number of characters to extract after the section heading.
    """
    full_text_lower = full_text.lower()
    keywords = SECTION_KEYWORDS.get(section_name, [])

    for kw in keywords:
        pos = full_text_lower.find(kw)
        if pos != -1:
            return full_text[pos: pos + window]

    return None


# ─────────────────────────────────────────────
# FINANCIAL NUMBER EXTRACTION
# ─────────────────────────────────────────────

def extract_financial_figures(text: str) -> dict:
    """
    Use regex to extract key financial figures from text.
    Looks for common Indian financial reporting patterns.
    Covers: Revenue, EBITDA, Net Profit, Debt, Net Worth, Current Assets/Liabilities,
    Receivables, Inventory, Interest Expense, CIBIL Score, Collateral, COGS.
    Returns dict of found metrics.
    """
    figures = {}

    # Match Indian number formats: 1,23,456.78 or 1234567 (crores/lakhs)
    number_pattern = r"[\d,]+(?:\.\d+)?"

    # Revenue / Turnover
    revenue_match = re.search(
        rf"(?:revenue|turnover|net sales|total income|gross revenue)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if revenue_match:
        figures["revenue"] = _clean_number(revenue_match.group(1))

    # EBITDA
    ebitda_match = re.search(
        rf"(?:ebitda|operating profit|ebidta)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if ebitda_match:
        figures["ebitda"] = _clean_number(ebitda_match.group(1))

    # Net Profit / Loss
    profit_match = re.search(
        rf"(?:net profit|profit after tax|pat|profit for the (?:year|period))[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if profit_match:
        figures["net_profit"] = _clean_number(profit_match.group(1))

    # Total Debt
    debt_match = re.search(
        rf"(?:total debt|total borrowing|long.term borrowing|total liabilities|secured loan)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if debt_match:
        figures["total_debt"] = _clean_number(debt_match.group(1))

    # Net Worth
    networth_match = re.search(
        rf"(?:net worth|shareholders.equity|total equity|shareholder.s fund)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if networth_match:
        figures["net_worth"] = _clean_number(networth_match.group(1))

    # Current Assets
    ca_match = re.search(
        rf"(?:current assets|total current assets)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if ca_match:
        figures["current_assets"] = _clean_number(ca_match.group(1))

    # Current Liabilities
    cl_match = re.search(
        rf"(?:current liabilities|total current liabilities)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if cl_match:
        figures["current_liabilities"] = _clean_number(cl_match.group(1))

    # Trade Receivables
    recv_match = re.search(
        rf"(?:trade receivable|sundry debtor|accounts receivable)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if recv_match:
        figures["receivables"] = _clean_number(recv_match.group(1))

    # Inventory
    inv_match = re.search(
        rf"(?:inventor(?:y|ies)|stock.in.trade|finished goods)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if inv_match:
        figures["inventory"] = _clean_number(inv_match.group(1))

    # Interest Expense / Finance Cost
    interest_match = re.search(
        rf"(?:interest expense|finance cost|interest paid|borrowing cost)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if interest_match:
        figures["interest_expense"] = _clean_number(interest_match.group(1))

    # Cost of Goods Sold / Material Consumed
    cogs_match = re.search(
        rf"(?:cost of goods|material consumed|cost of material|raw material consumed|cost of revenue)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if cogs_match:
        figures["cogs"] = _clean_number(cogs_match.group(1))

    # Total Assets
    ta_match = re.search(
        rf"(?:total assets)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if ta_match:
        figures["total_assets"] = _clean_number(ta_match.group(1))

    # CIBIL / Credit Score (for credit bureau reports)
    cibil_match = re.search(
        rf"(?:cibil|credit score|bureau score|commercial score|CMR rank)[^\d]{{0,30}}(\d{{3}})",
        text, re.IGNORECASE
    )
    if cibil_match:
        score_val = int(cibil_match.group(1))
        if 100 <= score_val <= 900:
            figures["cibil_score"] = score_val

    # Collateral / Security Value
    coll_match = re.search(
        rf"(?:collateral value|security value|property value|market value of security)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if coll_match:
        figures["collateral_value"] = _clean_number(coll_match.group(1))

    # Contingent Liabilities (important for Indian reports)
    cont_match = re.search(
        rf"(?:contingent liabilit)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if cont_match:
        figures["contingent_liabilities"] = _clean_number(cont_match.group(1))

    # Depreciation
    dep_match = re.search(
        rf"(?:depreciation|depreciation and amortis)[^\d]{{0,30}}({number_pattern})",
        text, re.IGNORECASE
    )
    if dep_match:
        figures["depreciation"] = _clean_number(dep_match.group(1))

    return figures


def _clean_number(num_str: str) -> float:
    """Remove commas and convert to float."""
    try:
        return float(num_str.replace(",", ""))
    except:
        return 0.0


# ─────────────────────────────────────────────
# MAIN PIPELINE FUNCTION
# ─────────────────────────────────────────────

def process_document(file_path: str, doc_type: str = "annual_report") -> dict:
    """
    Full pipeline for a single document:
    1. Extract text (with OCR fallback)
    2. Detect sections
    3. Extract financial figures
    4. Extract structured tables (NEW — handles complex tables)
    5. Convert tables to structured financial dicts

    Returns structured result ready for RAG ingestion.
    """
    extraction = extract_text_from_pdf(file_path)
    full_text = extraction["full_text"]

    sections = detect_sections(full_text)
    financials = extract_financial_figures(full_text)

    # NEW: Extract structured tables
    table_result = extract_tables_from_pdf(file_path)
    structured_financials = tables_to_financial_dict(table_result.get("tables", []))

    # Merge table-extracted figures into regex-extracted figures
    _enrich_financials_from_tables(financials, structured_financials)

    # Build table text for RAG injection
    table_texts = [t["raw_text"] for t in table_result.get("tables", []) if t.get("raw_text")]
    enriched_full_text = full_text
    if table_texts:
        enriched_full_text += "\n\n--- EXTRACTED TABLES ---\n\n" + "\n\n".join(table_texts)

    return {
        "file_path": file_path,
        "doc_type": doc_type,
        "total_pages": extraction["total_pages"],
        "ocr_pages": extraction["ocr_pages"],
        "sections_found": list(sections.keys()),
        "financials": financials,
        "tables": {
            "total_tables": table_result["total_tables"],
            "tables_by_page": table_result["tables_by_page"],
            "classified_tables": [
                {
                    "page": t["page"],
                    "type": t["table_type"],
                    "headers": t["headers"],
                    "row_count": len(t["rows"]),
                    "extraction_method": t.get("extraction_method", "unknown"),
                }
                for t in table_result["tables"]
            ],
        },
        "structured_financials": structured_financials,
        "full_text": enriched_full_text,
        "pages": extraction["pages"]
    }


def _enrich_financials_from_tables(financials: dict, structured_tables: dict):
    """
    If regex-based extraction missed key figures, try to fill them from
    table-extracted structured data.
    """
    # Map common line item labels to financial keys
    LINE_ITEM_MAP = {
        "revenue": ["revenue from operations", "revenue", "net sales", "turnover",
                     "total income", "gross revenue", "income from operations"],
        "net_profit": ["profit after tax", "net profit", "pat", "profit for the year",
                       "profit/(loss) for the year", "profit for the period"],
        "ebitda": ["ebitda", "operating profit", "profit before interest and tax"],
        "total_debt": ["total borrowings", "total debt", "borrowings", "long-term borrowings",
                       "long term borrowings", "secured loans"],
        "net_worth": ["net worth", "total equity", "shareholders' funds", "shareholder's equity",
                      "equity attributable"],
        "current_assets": ["total current assets", "current assets"],
        "current_liabilities": ["total current liabilities", "current liabilities"],
        "total_assets": ["total assets"],
        "interest_expense": ["finance costs", "finance cost", "interest expense",
                             "borrowing costs", "interest and finance charges"],
        "depreciation": ["depreciation", "depreciation and amortisation",
                         "depreciation and amortization"],
        "receivables": ["trade receivables", "sundry debtors", "accounts receivable"],
        "inventory": ["inventories", "inventory", "stock-in-trade"],
        "cogs": ["cost of materials consumed", "cost of goods sold",
                 "raw material consumed", "purchases of stock-in-trade"],
    }

    for fin_key, label_variants in LINE_ITEM_MAP.items():
        if fin_key in financials and financials[fin_key] > 0:
            continue  # Already have a value from regex

        # Search through all table types
        for tbl_type, tbl_list in structured_tables.items():
            for tbl in tbl_list:
                for row_data in tbl.get("data", []):
                    line_item = row_data.get("line_item", "").lower().strip()
                    for variant in label_variants:
                        if variant in line_item:
                            values = row_data.get("values", [])
                            if values:
                                # Take the most recent year (last value)
                                val = values[-1].get("value", 0)
                                if val and val != 0:
                                    financials[fin_key] = abs(val)
                                    break
                    if fin_key in financials:
                        break
                if fin_key in financials:
                    break
