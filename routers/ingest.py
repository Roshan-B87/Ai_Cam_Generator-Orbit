from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from models.response_models import IngestResponse, DocumentClassificationResponse, ClassificationApprovalResponse
from models.request_models import ClassificationApprovalRequest, ExtractionSchemaRequest
from services.pdf_parser import process_document
from services.gst_validator import compare_gstr_2b_vs_3b, cross_check_revenue, analyse_bank_statement
from services.rag_service import build_vector_store
import uuid, os, shutil, json, re

router = APIRouter()

# In-memory job status store (swap for Redis/DB in production)
_job_status = {}

# Document type classification patterns
DOC_TYPE_PATTERNS = {
    "alm": [r"alm", r"asset[\s-]*liabilit", r"maturity[\s-]*profile", r"liquidity"],
    "shareholding": [r"sharehold", r"equity[\s-]*pattern", r"ownership", r"promoter[\s-]*holding"],
    "borrowing": [r"borrow", r"debt[\s-]*profile", r"loan[\s-]*outstanding", r"credit[\s-]*facilit"],
    "annual_report": [
        r"annual[\s-]*report", r"balance[\s-]*sheet", r"profit[\s&]*loss",
        r"cash[\s-]*flow", r"p[\s&]*l", r"financial[\s-]*statement",
        r"schedule", r"notes[\s-]*to[\s-]*account"
    ],
    "portfolio": [r"portfolio", r"performance[\s-]*data", r"portfolio[\s-]*cut", r"asset[\s-]*quality", r"npa"],
}


def _classify_document(filename: str, text_sample: str = "") -> dict:
    """Auto-classify a document based on filename and content patterns."""
    filename_lower = filename.lower()
    combined = filename_lower + " " + (text_sample or "").lower()

    scores = {}
    for doc_type, patterns in DOC_TYPE_PATTERNS.items():
        match_count = sum(1 for p in patterns if re.search(p, combined))
        if match_count > 0:
            scores[doc_type] = match_count

    if scores:
        best_type = max(scores, key=scores.get)
        confidence = min(0.95, 0.5 + scores[best_type] * 0.15)
        return {"type": best_type, "confidence": round(confidence, 2)}

    # Fallback heuristics
    if "gst" in filename_lower or "gstr" in filename_lower:
        return {"type": "gst_filing", "confidence": 0.85}
    elif "bank" in filename_lower or "statement" in filename_lower:
        return {"type": "bank_statement", "confidence": 0.8}
    elif "rating" in filename_lower:
        return {"type": "rating_report", "confidence": 0.8}

    return {"type": "other", "confidence": 0.3}


@router.post("/upload", response_model=IngestResponse)
async def upload_documents(
    company_name: str = Form(...),
    company_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    files: List[UploadFile] = File(...)
):
    """
    Receive all company documents from the frontend.
    Saves files, auto-classifies them, and triggers background processing.
    """
    if not company_id:
        company_id = str(uuid.uuid4())[:8]
    save_dir = f"uploads/{company_id}"
    os.makedirs(save_dir, exist_ok=True)

    saved_files = []
    auto_classifications = []
    for file in files:
        file_path = f"{save_dir}/{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        saved_files.append(file_path)

        # Auto-classify based on filename
        classification = _classify_document(file.filename)
        auto_classifications.append({
            "filename": file.filename,
            "auto_type": classification["type"],
            "confidence": classification["confidence"],
            "user_approved": False,
            "user_override_type": None,
        })

    # Store initial status with classifications
    _job_status[company_id] = {
        "company_name": company_name,
        "status": "uploaded",
        "files": [f.filename for f in files],
        "classifications": auto_classifications,
        "parsed_docs": []
    }

    # Save classifications to disk
    with open(f"{save_dir}/classifications.json", "w") as f:
        json.dump(auto_classifications, f, indent=2)

    # Trigger background processing
    background_tasks.add_task(
        _process_pipeline,
        company_id=company_id,
        file_paths=saved_files,
        classifications=auto_classifications
    )

    return IngestResponse(
        company_id=company_id,
        files_received=len(files),
        status="uploaded"
    )


async def _process_pipeline(company_id: str, file_paths: list, classifications: list = None):
    """
    Background task:
    1. Parse all PDFs using auto-classified document types
    2. Build RAG vector store
    3. Run GST validation if GST files present
    """
    try:
        _job_status[company_id]["status"] = "parsing"
        parsed_docs = []

        # Build classification lookup
        class_lookup = {}
        if classifications:
            for c in classifications:
                class_lookup[c["filename"]] = c.get("user_override_type") or c["auto_type"]

        for file_path in file_paths:
            filename = os.path.basename(file_path)
            filename_lower = filename.lower()

            # Use classification if available, otherwise fall back to heuristics
            doc_type = class_lookup.get(filename)
            if not doc_type:
                if "gst" in filename_lower or "gstr" in filename_lower:
                    doc_type = "gst_filing"
                elif "bank" in filename_lower or "statement" in filename_lower:
                    doc_type = "bank_statement"
                elif "annual" in filename_lower or "report" in filename_lower:
                    doc_type = "annual_report"
                elif "rating" in filename_lower:
                    doc_type = "rating_report"
                elif "sharehold" in filename_lower:
                    doc_type = "shareholding"
                elif "alm" in filename_lower or "asset" in filename_lower:
                    doc_type = "alm"
                elif "borrow" in filename_lower:
                    doc_type = "borrowing"
                elif "portfolio" in filename_lower:
                    doc_type = "portfolio"
                else:
                    doc_type = "other"

            result = process_document(file_path, doc_type=doc_type)
            parsed_docs.append(result)

        # Build RAG vector store FIRST (needs full parsed_docs with full_text)
        _job_status[company_id]["status"] = "building_rag"
        rag_success = build_vector_store(company_id, parsed_docs)

        # Store summary AFTER rag build (strip full_text to save memory)
        _job_status[company_id]["parsed_docs"] = [
            {
                "file": d["file_path"],
                "doc_type": d["doc_type"],
                "pages": d["total_pages"],
                "ocr_pages": d["ocr_pages"],
                "sections": d["sections_found"],
                "financials": d["financials"],
                "tables": d.get("tables", {}),
                "structured_financials": d.get("structured_financials", {}),
            }
            for d in parsed_docs
        ]

        _job_status[company_id]["rag_ready"] = rag_success
        _job_status[company_id]["status"] = "ready"

        # Save results to disk
        result_path = f"uploads/{company_id}/parse_results.json"
        with open(result_path, "w") as f:
            # Don't save full_text to disk (too large) — just metadata
            summary = {k: v for k, v in _job_status[company_id].items()}
            json.dump(summary, f, indent=2)

    except Exception as e:
        _job_status[company_id]["status"] = "error"
        _job_status[company_id]["error"] = str(e)


@router.get("/status/{company_id}")
async def get_ingest_status(company_id: str):
    """Check processing status of uploaded documents."""
    if company_id not in _job_status:
        # Try loading from disk
        result_path = f"uploads/{company_id}/parse_results.json"
        if os.path.exists(result_path):
            with open(result_path) as f:
                return json.load(f)
        return {"company_id": company_id, "status": "not_found"}

    return _job_status[company_id]


@router.get("/financials/{company_id}")
async def get_extracted_financials(company_id: str):
    """Return financial figures extracted from parsed documents."""
    if company_id not in _job_status:
        return {"error": "Company not found"}

    docs = _job_status[company_id].get("parsed_docs", [])
    all_financials = {}

    for doc in docs:
        all_financials[doc["doc_type"]] = doc.get("financials", {})

    return {
        "company_id": company_id,
        "financials_by_doc_type": all_financials
    }


@router.get("/tables/{company_id}")
async def get_extracted_tables(company_id: str):
    """Return structured tables extracted from parsed documents."""
    if company_id not in _job_status:
        return {"company_id": company_id, "error": "Company not found", "tables": []}

    docs = _job_status[company_id].get("parsed_docs", [])
    all_tables = []
    all_structured = {}

    for doc in docs:
        tables = doc.get("tables", {})
        structured = doc.get("structured_financials", {})
        if tables:
            all_tables.append({
                "doc_type": doc["doc_type"],
                "total_tables": tables.get("total_tables", 0),
                "tables_by_page": tables.get("tables_by_page", {}),
                "classified_tables": tables.get("classified_tables", []),
            })
        if structured:
            for key, val in structured.items():
                if key not in all_structured:
                    all_structured[key] = []
                all_structured[key].extend(val)

    return {
        "company_id": company_id,
        "documents": all_tables,
        "structured_financials": all_structured,
    }


@router.get("/classifications/{company_id}")
async def get_classifications(company_id: str):
    """Get auto-classification results for uploaded documents."""
    if company_id in _job_status:
        return {
            "company_id": company_id,
            "classifications": _job_status[company_id].get("classifications", []),
            "status": "ok"
        }

    path = f"uploads/{company_id}/classifications.json"
    if os.path.exists(path):
        with open(path) as f:
            return {"company_id": company_id, "classifications": json.load(f), "status": "ok"}

    return {"company_id": company_id, "classifications": [], "status": "not_found"}


@router.post("/classifications/approve")
async def approve_classifications(request: ClassificationApprovalRequest):
    """
    Human-in-the-loop: approve, deny, or edit auto-classifications.
    Re-triggers processing with corrected types.
    """
    company_id = request.company_id
    save_dir = f"uploads/{company_id}"

    approved = []
    for cls in request.classifications:
        approved.append({
            "filename": cls.filename,
            "auto_type": cls.classified_type,
            "confidence": 1.0,
            "user_approved": cls.user_approved,
            "user_override_type": cls.user_override_type,
            "final_type": cls.user_override_type or cls.classified_type,
        })

    with open(f"{save_dir}/classifications.json", "w") as f:
        json.dump(approved, f, indent=2)

    if company_id in _job_status:
        _job_status[company_id]["classifications"] = approved

    return ClassificationApprovalResponse(
        company_id=company_id,
        approved_count=sum(1 for c in approved if c["user_approved"]),
        status="approved"
    )


@router.post("/schema/configure")
async def configure_schema(request: ExtractionSchemaRequest):
    """
    User-defined schema: configure custom field mappings for extraction.
    """
    save_dir = f"uploads/{request.company_id}"
    os.makedirs(save_dir, exist_ok=True)

    schema_data = {
        "document_type": request.document_type,
        "field_mappings": [m.model_dump() for m in request.field_mappings],
        "custom_fields": request.custom_fields,
    }

    schema_path = f"{save_dir}/schema_{request.document_type}.json"
    with open(schema_path, "w") as f:
        json.dump(schema_data, f, indent=2)

    return {
        "company_id": request.company_id,
        "document_type": request.document_type,
        "status": "schema_saved",
        "fields_count": len(request.field_mappings) + len(request.custom_fields),
    }


@router.get("/schema/{company_id}/{document_type}")
async def get_schema(company_id: str, document_type: str):
    """Retrieve the configured extraction schema for a document type."""
    path = f"uploads/{company_id}/schema_{document_type}.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)

    # Return default schema based on document type
    default_schemas = {
        "alm": {
            "fields": ["maturity_bucket", "assets", "liabilities", "gap", "cumulative_gap"],
            "description": "Asset-Liability Management maturity profile"
        },
        "shareholding": {
            "fields": ["shareholder_name", "holding_percentage", "share_type", "din", "category"],
            "description": "Shareholding pattern and equity distribution"
        },
        "borrowing": {
            "fields": ["lender", "facility_type", "sanctioned_amount", "outstanding", "interest_rate", "tenure"],
            "description": "Borrowing profile and credit facilities"
        },
        "annual_report": {
            "fields": ["revenue", "ebitda", "net_profit", "total_assets", "total_debt",
                       "net_worth", "current_assets", "current_liabilities", "cash_flow"],
            "description": "P&L, Balance Sheet, Cash Flow from annual reports"
        },
        "portfolio": {
            "fields": ["asset_class", "amount", "npa_category", "provision", "performance_metric"],
            "description": "Portfolio cuts and performance data"
        },
    }

    return {
        "company_id": company_id,
        "document_type": document_type,
        "schema": default_schemas.get(document_type, {"fields": [], "description": "Unknown document type"}),
        "status": "default"
    }


@router.get("/extraction/{company_id}")
async def get_extraction_results(company_id: str):
    """
    Get all extracted data organized by document type with schema mapping.
    This is the main endpoint for Step 3 (Extraction & Schema Mapping).
    """
    base_dir = f"uploads/{company_id}"

    # Load parsed docs
    parse_path = f"{base_dir}/parse_results.json"
    if not os.path.exists(parse_path):
        return {"company_id": company_id, "status": "not_found", "extractions": []}

    with open(parse_path) as f:
        parse_data = json.load(f)

    # Load classifications
    class_path = f"{base_dir}/classifications.json"
    classifications = []
    if os.path.exists(class_path):
        with open(class_path) as f:
            classifications = json.load(f)

    # Build extraction results by document type
    extractions = []
    for doc in parse_data.get("parsed_docs", []):
        doc_type = doc.get("doc_type", "other")

        # Load custom schema if configured
        schema_path = f"{base_dir}/schema_{doc_type}.json"
        custom_schema = None
        if os.path.exists(schema_path):
            with open(schema_path) as f:
                custom_schema = json.load(f)

        extractions.append({
            "filename": os.path.basename(doc.get("file", "")),
            "doc_type": doc_type,
            "pages": doc.get("pages", 0),
            "sections": doc.get("sections", []),
            "financials": doc.get("financials", {}),
            "tables": doc.get("tables", {}),
            "structured_financials": doc.get("structured_financials", {}),
            "custom_schema": custom_schema,
        })

    return {
        "company_id": company_id,
        "status": parse_data.get("status", "unknown"),
        "total_documents": len(extractions),
        "classifications": classifications,
        "extractions": extractions,
    }


@router.put("/extraction/{company_id}/edit")
async def edit_extraction(company_id: str, edits: dict):
    """
    Human-in-the-loop: edit extracted data values.
    Accepts a dict of {field: corrected_value} pairs.
    """
    base_dir = f"uploads/{company_id}"
    edits_path = f"{base_dir}/extraction_edits.json"

    existing_edits = {}
    if os.path.exists(edits_path):
        with open(edits_path) as f:
            existing_edits = json.load(f)

    existing_edits.update(edits)

    with open(edits_path, "w") as f:
        json.dump(existing_edits, f, indent=2)

    return {
        "company_id": company_id,
        "status": "edits_saved",
        "total_edits": len(existing_edits),
    }
