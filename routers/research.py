from fastapi import APIRouter, BackgroundTasks
from models.request_models import CompanyRequest, OfficerNotes
from models.response_models import ResearchResponse
from services.claude_agent import run_research_agent, adjust_score_with_notes
import json, os, asyncio

router = APIRouter()

# In-memory research results store
_research_store = {}


@router.post("/run/{company_id}")
async def run_research(
    company_id: str,
    request: CompanyRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger AI research agent for a company.
    Runs in background — returns immediately so frontend isn't blocked.
    Poll /research/results/{company_id} for completion.
    """
    _research_store[company_id] = {"status": "running"}

    background_tasks.add_task(
        _run_and_store,
        company_id=company_id,
        company_name=request.company_name,
        cin=request.cin,
        gstin=request.gstin
    )

    return {"company_id": company_id, "status": "research_started"}


async def _run_and_store(company_id: str, company_name: str, cin: str = None, gstin: str = None):
    """Background wrapper that runs agent and saves result."""
    try:
        result = await run_research_agent(
            company_id=company_id,
            company_name=company_name,
            cin=cin,
            gstin=gstin
        )
        _research_store[company_id] = result

        # Persist to disk
        os.makedirs(f"uploads/{company_id}", exist_ok=True)
        with open(f"uploads/{company_id}/research_results.json", "w") as f:
            json.dump(result, f, indent=2)

    except Exception as e:
        _research_store[company_id] = {
            "status": "error",
            "error": str(e),
            "company_id": company_id
        }


@router.post("/officer-notes")
async def add_officer_notes(notes: OfficerNotes):
    """
    Credit officer submits qualitative observations.
    Saved and used during scoring to adjust base scores.
    """
    os.makedirs(f"uploads/{notes.company_id}", exist_ok=True)
    notes_path = f"uploads/{notes.company_id}/officer_notes.json"

    with open(notes_path, "w") as f:
        json.dump({
            "company_id": notes.company_id,
            "notes": notes.notes,
            "site_visit_date": notes.site_visit_date
        }, f, indent=2)

    return {
        "status": "notes_saved",
        "company_id": notes.company_id,
        "message": "Officer notes saved. They will be applied during scoring."
    }


@router.get("/results/{company_id}")
async def get_research_results(company_id: str):
    """Fetch completed research findings for a company."""

    # Check memory first
    if company_id in _research_store:
        return _research_store[company_id]

    # Try loading from disk
    result_path = f"uploads/{company_id}/research_results.json"
    if os.path.exists(result_path):
        with open(result_path) as f:
            return json.load(f)

    return {
        "company_id": company_id,
        "status": "not_found",
        "message": "Run POST /research/run/{company_id} first"
    }
