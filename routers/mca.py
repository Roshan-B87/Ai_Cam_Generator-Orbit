"""
MCA (Ministry of Corporate Affairs) API Router
-------------------------------------------------
Endpoints for fetching company data from MCA21 registry via data.gov.in API.
Covers: CSR spending, company master data, charge details, director info.
"""

from fastapi import APIRouter, Query
from typing import Optional
from services.mca_service import (
    fetch_csr_data,
    fetch_company_master,
    fetch_charge_details,
    fetch_director_details,
    comprehensive_mca_lookup,
)
import json, os

router = APIRouter()


@router.get("/csr")
async def get_csr_data(
    company_name: Optional[str] = Query(None, description="Company name to search"),
    financial_year: Optional[str] = Query(None, description="Financial year e.g. 2019-20"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(10, ge=1, le=100, description="Max records to return"),
):
    """
    Fetch CSR (Corporate Social Responsibility) spending data from MCA21 registry.
    Data covers 2018-19 to 2020-21.
    """
    return await fetch_csr_data(
        company_name=company_name,
        financial_year=financial_year,
        offset=offset,
        limit=limit,
    )


@router.get("/company")
async def get_company_info(
    company_name: Optional[str] = Query(None, description="Company name to search"),
    cin: Optional[str] = Query(None, description="Corporate Identity Number"),
    state: Optional[str] = Query(None, description="State of registration"),
    company_status: Optional[str] = Query(None, description="e.g. Active, Dissolved"),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Fetch company registration details from MCA Company Master dataset.
    """
    return await fetch_company_master(
        company_name=company_name,
        cin=cin,
        state=state,
        company_status=company_status,
        offset=offset,
        limit=limit,
    )


@router.get("/charges")
async def get_charge_details(
    company_name: Optional[str] = Query(None, description="Company name"),
    cin: Optional[str] = Query(None, description="Corporate Identity Number"),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Fetch charge (mortgage/loan) details registered with MCA.
    Useful for understanding existing borrowings and encumbered assets.
    """
    return await fetch_charge_details(
        company_name=company_name,
        cin=cin,
        offset=offset,
        limit=limit,
    )


@router.get("/directors")
async def get_director_details(
    company_name: Optional[str] = Query(None, description="Company name"),
    cin: Optional[str] = Query(None, description="Corporate Identity Number"),
    din: Optional[str] = Query(None, description="Director Identification Number"),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Fetch director/promoter details from MCA Director Master dataset.
    """
    return await fetch_director_details(
        company_name=company_name,
        cin=cin,
        din=din,
        offset=offset,
        limit=limit,
    )


@router.get("/lookup/{company_id}")
async def comprehensive_lookup(
    company_id: str,
    company_name: Optional[str] = Query(None, description="Company name (required if first lookup)"),
    cin: Optional[str] = Query(None, description="Corporate Identity Number"),
):
    """
    Run comprehensive MCA lookup for a company — fetches CSR, company master,
    charges, and director data in parallel. Caches result to disk.
    """
    # Try loading cached result first
    cache_path = f"uploads/{company_id}/mca_data.json"
    if os.path.exists(cache_path) and not company_name:
        with open(cache_path) as f:
            return json.load(f)

    if not company_name:
        return {"status": "error", "error": "company_name is required for first lookup"}

    result = await comprehensive_mca_lookup(
        company_name=company_name,
        cin=cin,
    )

    # Cache to disk
    os.makedirs(f"uploads/{company_id}", exist_ok=True)
    with open(cache_path, "w") as f:
        json.dump(result, f, indent=2, default=str)

    return result
