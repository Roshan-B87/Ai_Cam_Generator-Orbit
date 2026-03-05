from pydantic import BaseModel
from typing import Optional, List

class CompanyRequest(BaseModel):
    company_name: str
    cin: Optional[str] = None          # Corporate Identity Number (MCA)
    gstin: Optional[str] = None        # GST Identification Number

class OfficerNotes(BaseModel):
    company_id: str
    notes: str                         # e.g. "Factory at 40% capacity"
    site_visit_date: Optional[str] = None

class ScoringRequest(BaseModel):
    company_id: str
    include_qualitative: bool = True
    requested_amount: Optional[float] = 0   # Loan amount requested by borrower
    cibil_score: Optional[int] = None       # CIBIL Commercial score (300-900)

class WhatIfRequest(BaseModel):
    """Scenario analysis — adjust inputs and see how score changes."""
    company_id: str
    adjustments: dict = {}   # e.g. {"revenue": 50000000, "ebitda": 8000000, "collateral_value": 30000000}
    cibil_score: Optional[int] = None
    requested_amount: Optional[float] = 0
