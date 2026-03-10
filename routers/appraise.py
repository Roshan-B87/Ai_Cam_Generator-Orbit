from fastapi import APIRouter
from models.request_models import ScoringRequest, WhatIfRequest
from models.response_models import ScoreResponse, ExplainResponse, WhatIfResponse, SWOTResponse
from services.scorer import calculate_five_cs_score
from services.claude_agent import adjust_score_with_notes
from services.explainer import generate_explanation, run_what_if
from services.swot_service import generate_swot
import json, os

router = APIRouter()


def _build_score_response(result: dict) -> ScoreResponse:
    """Build a ScoreResponse from a scorer result dict."""
    return ScoreResponse(
        company_id=result["company_id"],
        overall_score=result["overall_score"],
        character_score=result["character_score"],
        capacity_score=result["capacity_score"],
        capital_score=result["capital_score"],
        collateral_score=result["collateral_score"],
        conditions_score=result["conditions_score"],
        decision=result["decision"],
        decision_reason=result.get("decision_reason"),
        recommended_amount=result.get("recommended_amount"),
        interest_rate=result.get("interest_rate"),
        explanation=result["explanation"],
        dscr=result.get("dscr"),
        financial_ratios=result.get("financial_ratios"),
        deductions=result.get("deductions")
    )


def _load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


@router.post("/score", response_model=ScoreResponse)
async def score_company(request: ScoringRequest):
    """
    Run the full Five Cs scoring engine for a company.
    Loads parsed financials, research results, GST flags, and officer notes.
    Returns overall score, sub-scores, decision, loan recommendation, and explanation.
    """
    company_id = request.company_id
    base_dir   = f"uploads/{company_id}"

    # Load all data produced in earlier sessions
    parse_results   = _load_json(f"{base_dir}/parse_results.json")
    research_data   = _load_json(f"{base_dir}/research_results.json")
    officer_notes_raw = _load_json(f"{base_dir}/officer_notes.json")
    gst_flags       = _load_json(f"{base_dir}/gst_flags.json")

    # Extract financials from parsed docs
    financial_data = {}
    for doc in parse_results.get("parsed_docs", []):
        financial_data.update(doc.get("financials", {}))

    # Inject CIBIL score into research data if provided
    if request.cibil_score is not None:
        research_data["cibil_score"] = request.cibil_score
    elif not research_data.get("cibil_score"):
        # Try loading from Databricks CIBIL file
        cibil_data = _load_json(f"{base_dir}/cibil_data.json")
        if cibil_data.get("cibil_score"):
            research_data["cibil_score"] = cibil_data["cibil_score"]

    # Apply officer note adjustments if requested
    if request.include_qualitative and officer_notes_raw:
        notes_text = officer_notes_raw.get("notes", "")
        if notes_text:
            # Get base scores first (rough pass)
            base = calculate_five_cs_score(
                company_id, financial_data, research_data, gst_flags
            )
            # Adjust with officer notes
            adjusted = await adjust_score_with_notes(company_id, notes_text, base)
            # Save adjustments for scorer to pick up
            with open(f"{base_dir}/officer_notes_adjustments.json", "w") as f:
                json.dump(adjusted, f, indent=2)

    # Final score calculation
    result = calculate_five_cs_score(
        company_id=company_id,
        financial_data=financial_data,
        research_data=research_data,
        gst_flags=gst_flags,
        requested_amount=request.requested_amount or 0,
    )

    return _build_score_response(result)


@router.get("/score/{company_id}", response_model=ScoreResponse)
async def get_score(company_id: str):
    """Retrieve a previously computed score from disk."""
    result = _load_json(f"uploads/{company_id}/score_results.json")

    if not result:
        return ScoreResponse(
            company_id=company_id,
            overall_score=0.0,
            character_score=0.0,
            capacity_score=0.0,
            capital_score=0.0,
            collateral_score=0.0,
            conditions_score=0.0,
            decision="NOT_SCORED",
            explanation="No score found. Run POST /appraise/score first."
        )

    return _build_score_response(result)


@router.post("/explain/{company_id}", response_model=ExplainResponse)
async def explain_decision(company_id: str):
    """
    AI-powered narrative walkthrough of the credit decision.
    Generates a prose explanation that 'walks the judge through' the logic,
    referencing specific data points, Indian regulatory context, and deduction reasoning.
    This is the KEY explainability feature.
    """
    result = await generate_explanation(company_id)
    return ExplainResponse(**result)


@router.post("/whatif", response_model=WhatIfResponse)
async def what_if_analysis(request: WhatIfRequest):
    """
    Scenario analysis — adjust financial inputs and see how the score changes.
    E.g. 'What if revenue increases to 50Cr?' or 'What if CIBIL improves to 750?'
    Returns delta, new decision, and actionable advice.
    """
    result = await run_what_if(
        company_id=request.company_id,
        adjustments=request.adjustments,
        cibil_score=request.cibil_score,
        requested_amount=request.requested_amount,
    )
    return WhatIfResponse(**result)


@router.post("/swot/{company_id}", response_model=SWOTResponse)
async def swot_analysis(company_id: str):
    """
    Generate comprehensive SWOT analysis by triangulating:
    - Financial data extracted from documents
    - Secondary research findings
    - Credit scoring results
    - Entity onboarding data
    """
    result = generate_swot(company_id)
    return SWOTResponse(**result)
