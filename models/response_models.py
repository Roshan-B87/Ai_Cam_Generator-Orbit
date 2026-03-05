from pydantic import BaseModel
from typing import Optional, List, Dict

class IngestResponse(BaseModel):
    company_id: str
    files_received: int
    status: str                        # "processing" | "done" | "error"

class ResearchResponse(BaseModel):
    company_id: str
    news_findings: List[str]
    litigation_flags: List[str]
    mca_data: dict
    status: str

class ScoreResponse(BaseModel):
    company_id: str
    overall_score: float               # 0 to 100
    character_score: float
    capacity_score: float
    capital_score: float
    collateral_score: float
    conditions_score: float
    decision: str                      # "APPROVE" | "REJECT" | "REFER"
    decision_reason: Optional[str] = None
    recommended_amount: Optional[float] = None
    interest_rate: Optional[str] = None
    explanation: str                   # Human-readable reasoning
    dscr: Optional[float] = None
    financial_ratios: Optional[dict] = None  # Indian financial ratios with benchmarks
    deductions: Optional[dict] = None         # Detailed deduction audit trail

class CAMResponse(BaseModel):
    company_id: str
    docx_url: str
    pdf_url: str
    status: str

class ExplainResponse(BaseModel):
    """AI-generated narrative walkthrough of the credit decision."""
    company_id: str
    narrative: str               # Full prose explanation for judges
    decision: str
    key_drivers: List[str]       # Top 5 factors driving the decision
    risk_mitigants: List[str]    # Positive factors
    indian_context_notes: List[str]  # India-specific observations
    confidence_level: str        # HIGH / MEDIUM / LOW
    data_quality_score: float    # 0-100 — how complete was the input data

class WhatIfResponse(BaseModel):
    """Scenario analysis result."""
    company_id: str
    original_score: float
    scenario_score: float
    original_decision: str
    scenario_decision: str
    score_delta: float
    changes_summary: List[str]   # What changed and why
    recommendation: str          # Narrative on what borrower can improve


class MCALookupResponse(BaseModel):
    """Comprehensive MCA data for a company."""
    status: str
    company_name: str
    cin: Optional[str] = None
    csr_data: Optional[Dict] = None
    company_info: Optional[Dict] = None
    charge_details: Optional[Dict] = None
    director_details: Optional[Dict] = None
    mca_risk_flags: Optional[List[Dict]] = None


class TableExtractionResponse(BaseModel):
    """Table extraction results from PDF parsing."""
    company_id: str
    total_tables: int
    tables_by_page: Dict[str, int]
    classified_tables: List[Dict]
    structured_financials: Optional[Dict] = None
