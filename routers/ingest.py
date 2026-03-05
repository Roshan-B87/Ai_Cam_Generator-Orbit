from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from typing import List
from models.response_models import IngestResponse
from services.pdf_parser import process_document
from services.gst_validator import compare_gstr_2b_vs_3b, cross_check_revenue, analyse_bank_statement
from services.rag_service import build_vector_store
import uuid, os, shutil, json

router = APIRouter()

# In-memory job status store (swap for Redis/DB in production)
_job_status = {}


@router.post("/upload", response_model=IngestResponse)
async def upload_documents(
    company_name: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    files: List[UploadFile] = File(...)
):
    """
    Receive all company documents from the frontend.
    Saves files and triggers background processing pipeline.
    """
    company_id = str(uuid.uuid4())[:8]
    save_dir = f"uploads/{company_id}"
    os.makedirs(save_dir, exist_ok=True)

    saved_files = []
    for file in files:
        file_path = f"{save_dir}/{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        saved_files.append(file_path)

    # Store initial status
    _job_status[company_id] = {
        "company_name": company_name,
        "status": "uploaded",
        "files": [f.filename for f in files],
        "parsed_docs": []
    }

    # Trigger background processing
    background_tasks.add_task(
        _process_pipeline,
        company_id=company_id,
        file_paths=saved_files
    )

    return IngestResponse(
        company_id=company_id,
        files_received=len(files),
        status="uploaded"
    )


async def _process_pipeline(company_id: str, file_paths: list):
    """
    Background task:
    1. Parse all PDFs
    2. Build RAG vector store
    3. Run GST validation if GST files present
    """
    try:
        _job_status[company_id]["status"] = "parsing"
        parsed_docs = []

        for file_path in file_paths:
            filename = os.path.basename(file_path).lower()

            # Detect document type from filename
            if "gst" in filename or "gstr" in filename:
                doc_type = "gst_filing"
            elif "bank" in filename or "statement" in filename:
                doc_type = "bank_statement"
            elif "annual" in filename or "report" in filename:
                doc_type = "annual_report"
            elif "rating" in filename:
                doc_type = "rating_report"
            elif "shareholding" in filename:
                doc_type = "shareholding"
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
