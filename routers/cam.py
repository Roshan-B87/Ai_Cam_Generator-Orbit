from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from models.response_models import CAMResponse
from services.cam_generator import generate_cam_docx, generate_cam_pdf
import json, os

router = APIRouter()


def _load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


@router.post("/generate/{company_id}", response_model=CAMResponse)
async def generate_cam(company_id: str):
    """
    Generate both Word (.docx) and PDF CAM documents.
    Requires /appraise/score to have been run first.
    """
    score_data    = _load_json(f"uploads/{company_id}/score_results.json")
    research_data = _load_json(f"uploads/{company_id}/research_results.json")

    if not score_data:
        raise HTTPException(
            status_code=400,
            detail="No score found for this company. Run POST /appraise/score first."
        )

    # Generate both formats
    docx_path = generate_cam_docx(company_id, score_data, research_data)
    pdf_path  = generate_cam_pdf(company_id, score_data, research_data)

    return CAMResponse(
        company_id=company_id,
        docx_url=f"/cam/download/{company_id}/docx",
        pdf_url=f"/cam/download/{company_id}/pdf",
        status="generated"
    )


@router.get("/download/{company_id}/{format}")
async def download_cam(company_id: str, format: str):
    """
    Download the generated CAM document.
    format must be 'docx' or 'pdf'
    """
    if format not in ("docx", "pdf"):
        raise HTTPException(status_code=400, detail="Format must be 'docx' or 'pdf'")

    file_path = f"uploads/{company_id}/cam_report.{format}"

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"CAM {format} not found. Run POST /cam/generate/{company_id} first."
        )

    media_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if format == "docx" else "application/pdf"
    )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=f"CAM_{company_id}.{format}"
    )
