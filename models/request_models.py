from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "credit_analyst"   # credit_analyst, senior_manager, admin
    organization: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class CompanyRequest(BaseModel):
    company_name: str
    cin: Optional[str] = None          # Corporate Identity Number (MCA)
    gstin: Optional[str] = None        # GST Identification Number


class EntityOnboardingRequest(BaseModel):
    """Entity details + loan details captured during onboarding."""
    # Entity Details
    company_name: str
    cin: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    sector: Optional[str] = None
    sub_sector: Optional[str] = None
    incorporation_date: Optional[str] = None
    registered_address: Optional[str] = None
    turnover: Optional[float] = None          # Annual turnover in INR
    employee_count: Optional[int] = None
    promoter_name: Optional[str] = None
    promoter_din: Optional[str] = None
    credit_rating: Optional[str] = None       # e.g. "CRISIL BBB+"
    cibil_score: Optional[int] = None

    # Loan Details
    loan_type: Optional[str] = None           # Term Loan, Working Capital, CC, LC, etc.
    loan_amount: Optional[float] = None       # Requested amount in INR
    loan_tenure_months: Optional[int] = None  # Tenure in months
    proposed_interest_rate: Optional[float] = None  # Percentage
    purpose_of_loan: Optional[str] = None
    collateral_type: Optional[str] = None
    collateral_value: Optional[float] = None
    existing_exposure: Optional[float] = None  # Existing bank exposure in INR
    repayment_source: Optional[str] = None


class DocumentClassification(BaseModel):
    """User-approved document classification."""
    filename: str
    classified_type: str     # alm, shareholding, borrowing, annual_report, portfolio
    user_approved: bool = False
    user_override_type: Optional[str] = None


class SchemaFieldMapping(BaseModel):
    """User-defined schema field mapping for extraction."""
    source_field: str
    target_field: str
    data_type: str = "string"   # string, number, date, currency
    transformation: Optional[str] = None


class ExtractionSchemaRequest(BaseModel):
    """User-defined extraction schema configuration."""
    company_id: str
    document_type: str
    field_mappings: List[SchemaFieldMapping] = []
    custom_fields: List[str] = []


class ClassificationApprovalRequest(BaseModel):
    """Approve, deny, or edit auto-classification results."""
    company_id: str
    classifications: List[DocumentClassification]


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
