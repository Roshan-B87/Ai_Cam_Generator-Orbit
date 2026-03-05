"""
MCA (Ministry of Corporate Affairs) API Service
-------------------------------------------------
Integrates with data.gov.in Open API to fetch:
1. CSR (Corporate Social Responsibility) spending data
2. Company master data from MCA21 registry

Uses the data.gov.in OAS 2.0 API with api-key authentication.
"""

import httpx
import logging
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# API CONFIGURATION
# ─────────────────────────────────────────────

MCA_API_KEY = "579b464db66ec23bdd000001e6afd690d4d045814812807a4e1f5d4e"
BASE_URL = "https://api.data.gov.in"

# Resource IDs for different MCA datasets on data.gov.in
RESOURCE_IDS = {
    # Company-wise CSR Funds Spent (2018-19 to 2020-21)
    "csr_funds_spent": "5e1f55de-4f41-4a13-92ff-876260fc29e2",

    # MCA — Company Master Data (active companies)
    "company_master": "38705987-0839-4239-92c5-1e85f2525c18",

    # MCA — Charge details
    "charge_details": "2d6ab09e-3e24-45cb-bca1-1b3a7f9b58ed",

    # MCA — Director master data
    "director_master": "d955c4d6-07c3-484f-afbf-44105e1e663e",
}

# Timeout for API calls
TIMEOUT = 30


# ─────────────────────────────────────────────
# CORE API CALLER
# ─────────────────────────────────────────────

async def _fetch_resource(
    resource_id: str,
    filters: Optional[Dict[str, str]] = None,
    offset: int = 0,
    limit: int = 10,
    fmt: str = "json",
) -> Dict[str, Any]:
    """
    Generic caller for data.gov.in resource API.

    Parameters:
        resource_id: The dataset resource ID
        filters: Optional dict of field filters e.g. {"company_name": "Tata"}
        offset: Pagination offset
        limit: Max records (API caps at 10 per page with sample key)
        fmt: Output format — json, xml, csv

    Returns:
        Parsed JSON response or error dict
    """
    url = f"{BASE_URL}/resource/{resource_id}"
    params = {
        "api-key": MCA_API_KEY,
        "format": fmt,
        "offset": offset,
        "limit": limit,
    }

    # Add filters
    if filters:
        for key, value in filters.items():
            params[f"filters[{key}]"] = value

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            return {
                "status": "success",
                "total": data.get("total", 0),
                "count": data.get("count", 0),
                "records": data.get("records", []),
                "resource_id": resource_id,
            }
    except httpx.TimeoutException:
        logger.error(f"MCA API timeout for resource {resource_id}")
        return {"status": "error", "error": "API request timed out", "records": []}
    except httpx.HTTPStatusError as e:
        logger.error(f"MCA API HTTP error: {e.response.status_code}")
        return {"status": "error", "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}", "records": []}
    except Exception as e:
        logger.error(f"MCA API error: {str(e)}")
        return {"status": "error", "error": str(e), "records": []}


# ─────────────────────────────────────────────
# CSR DATA LOOKUP
# ─────────────────────────────────────────────

async def fetch_csr_data(
    company_name: Optional[str] = None,
    financial_year: Optional[str] = None,
    offset: int = 0,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Fetch CSR (Corporate Social Responsibility) spending data from MCA21 registry.

    Args:
        company_name: Filter by company name (partial match supported)
        financial_year: Filter by financial year e.g. "2019-20"
        offset: Pagination offset
        limit: Max records to return

    Returns:
        {
            "status": "success",
            "total": int,
            "csr_records": [...],
            "summary": { ... }
        }
    """
    filters = {}
    if company_name:
        filters["company_name"] = company_name
    if financial_year:
        filters["finincial_year"] = financial_year  # API uses this spelling

    result = await _fetch_resource(
        resource_id=RESOURCE_IDS["csr_funds_spent"],
        filters=filters,
        offset=offset,
        limit=limit,
    )

    if result["status"] != "success":
        return result

    records = result.get("records", [])

    # Parse and enrich CSR records
    enriched = []
    for rec in records:
        enriched.append({
            "company_name": rec.get("company_name", ""),
            "cin": rec.get("cin", ""),
            "financial_year": rec.get("finincial_year", ""),
            "csr_spent_2018_19": _safe_float(rec.get("_2018_19", 0)),
            "csr_spent_2019_20": _safe_float(rec.get("_2019_20", 0)),
            "csr_spent_2020_21": _safe_float(rec.get("_2020_21", 0)),
            "raw_record": rec,
        })

    # Build summary
    total_2018 = sum(r["csr_spent_2018_19"] for r in enriched)
    total_2019 = sum(r["csr_spent_2019_20"] for r in enriched)
    total_2020 = sum(r["csr_spent_2020_21"] for r in enriched)

    return {
        "status": "success",
        "total": result.get("total", 0),
        "count": len(enriched),
        "csr_records": enriched,
        "summary": {
            "total_csr_2018_19": total_2018,
            "total_csr_2019_20": total_2019,
            "total_csr_2020_21": total_2020,
            "trend": "increasing" if total_2020 > total_2018 else "decreasing" if total_2020 < total_2018 else "stable",
        },
    }


# ─────────────────────────────────────────────
# COMPANY MASTER DATA LOOKUP
# ─────────────────────────────────────────────

async def fetch_company_master(
    company_name: Optional[str] = None,
    cin: Optional[str] = None,
    state: Optional[str] = None,
    company_status: Optional[str] = None,
    offset: int = 0,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Fetch company registration details from MCA Company Master dataset.

    Args:
        company_name: Company name filter
        cin: Corporate Identity Number
        state: State of registration
        company_status: e.g. "Active", "Dissolved"
        offset: Pagination offset
        limit: Max records

    Returns:
        Structured company registration data
    """
    filters = {}
    if company_name:
        filters["company_name"] = company_name
    if cin:
        filters["cin"] = cin
    if state:
        filters["state"] = state
    if company_status:
        filters["company_status"] = company_status

    result = await _fetch_resource(
        resource_id=RESOURCE_IDS["company_master"],
        filters=filters,
        offset=offset,
        limit=limit,
    )

    if result["status"] != "success":
        return result

    records = result.get("records", [])
    enriched = []

    for rec in records:
        enriched.append({
            "company_name": rec.get("company_name", ""),
            "cin": rec.get("cin", ""),
            "company_status": rec.get("company_status", ""),
            "company_class": rec.get("company_class", ""),
            "company_category": rec.get("company_category", ""),
            "authorized_capital": _safe_float(rec.get("authorized_capital", 0)),
            "paid_up_capital": _safe_float(rec.get("paid_up_capital", 0)),
            "date_of_incorporation": rec.get("date_of_incorporation", ""),
            "registered_state": rec.get("registered_state", rec.get("state", "")),
            "registered_office_address": rec.get("registered_office_address", ""),
            "email": rec.get("email", ""),
            "activity_description": rec.get("activity_description", rec.get("principal_business_activity", "")),
            "raw_record": rec,
        })

    return {
        "status": "success",
        "total": result.get("total", 0),
        "count": len(enriched),
        "companies": enriched,
    }


# ─────────────────────────────────────────────
# CHARGE (LOAN/MORTGAGE) DATA
# ─────────────────────────────────────────────

async def fetch_charge_details(
    company_name: Optional[str] = None,
    cin: Optional[str] = None,
    offset: int = 0,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Fetch charge (mortgage/loan collateral) details from MCA registry.
    Useful for understanding existing borrowing and encumbrance.
    """
    filters = {}
    if company_name:
        filters["company_name"] = company_name
    if cin:
        filters["cin"] = cin

    result = await _fetch_resource(
        resource_id=RESOURCE_IDS["charge_details"],
        filters=filters,
        offset=offset,
        limit=limit,
    )

    if result["status"] != "success":
        return result

    return {
        "status": "success",
        "total": result.get("total", 0),
        "count": result.get("count", 0),
        "charges": result.get("records", []),
    }


# ─────────────────────────────────────────────
# DIRECTOR DETAILS
# ─────────────────────────────────────────────

async def fetch_director_details(
    company_name: Optional[str] = None,
    cin: Optional[str] = None,
    din: Optional[str] = None,
    offset: int = 0,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Fetch director/promoter details from MCA Director Master dataset.
    Useful for 'Character' assessment in 5Cs.
    """
    filters = {}
    if company_name:
        filters["company_name"] = company_name
    if cin:
        filters["cin"] = cin
    if din:
        filters["din"] = din

    result = await _fetch_resource(
        resource_id=RESOURCE_IDS["director_master"],
        filters=filters,
        offset=offset,
        limit=limit,
    )

    if result["status"] != "success":
        return result

    return {
        "status": "success",
        "total": result.get("total", 0),
        "count": result.get("count", 0),
        "directors": result.get("records", []),
    }


# ─────────────────────────────────────────────
# COMPREHENSIVE COMPANY LOOKUP
# ─────────────────────────────────────────────

async def comprehensive_mca_lookup(
    company_name: str,
    cin: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run all MCA lookups in parallel for a single company.
    Returns a consolidated view used during credit appraisal.
    """
    import asyncio

    tasks = {
        "csr": fetch_csr_data(company_name=company_name, limit=10),
        "company_info": fetch_company_master(company_name=company_name, cin=cin, limit=5),
        "charges": fetch_charge_details(company_name=company_name, cin=cin, limit=10),
        "directors": fetch_director_details(company_name=company_name, cin=cin, limit=10),
    }

    results = {}
    gathered = await asyncio.gather(
        *tasks.values(),
        return_exceptions=True
    )

    for key, result in zip(tasks.keys(), gathered):
        if isinstance(result, Exception):
            results[key] = {"status": "error", "error": str(result)}
        else:
            results[key] = result

    # Build risk assessment from MCA data
    risk_flags = _assess_mca_risks(results)

    return {
        "status": "success",
        "company_name": company_name,
        "cin": cin,
        "csr_data": results.get("csr", {}),
        "company_info": results.get("company_info", {}),
        "charge_details": results.get("charges", {}),
        "director_details": results.get("directors", {}),
        "mca_risk_flags": risk_flags,
    }


def _assess_mca_risks(mca_data: dict) -> List[Dict[str, str]]:
    """
    Analyze MCA data for risk signals relevant to credit appraisal.
    """
    flags = []

    # Check company status
    company_info = mca_data.get("company_info", {})
    companies = company_info.get("companies", [])
    for comp in companies:
        status = comp.get("company_status", "").lower()
        if status and status not in ["active", "active-compliant"]:
            flags.append({
                "flag": f"Company status: {comp.get('company_status', 'Unknown')}",
                "severity": "HIGH",
                "source": "MCA Company Master",
                "detail": "Company is not in Active status on MCA records",
            })

        # Check if authorized vs paid-up capital diverges significantly
        auth_cap = comp.get("authorized_capital", 0)
        paid_cap = comp.get("paid_up_capital", 0)
        if auth_cap > 0 and paid_cap > 0 and paid_cap < auth_cap * 0.25:
            flags.append({
                "flag": "Low paid-up vs authorized capital ratio",
                "severity": "MEDIUM",
                "source": "MCA Company Master",
                "detail": f"Paid-up: ₹{paid_cap:,.0f} vs Authorized: ₹{auth_cap:,.0f} ({paid_cap/auth_cap*100:.0f}%)",
            })

    # Check CSR compliance (mandatory if net worth > ₹500 Cr or revenue > ₹1000 Cr)
    csr_data = mca_data.get("csr", {})
    csr_records = csr_data.get("csr_records", [])
    if csr_records:
        for rec in csr_records:
            csr_2020 = rec.get("csr_spent_2020_21", 0)
            csr_2019 = rec.get("csr_spent_2019_20", 0)
            if csr_2020 == 0 and csr_2019 > 0:
                flags.append({
                    "flag": "CSR spending dropped to zero in 2020-21",
                    "severity": "MEDIUM",
                    "source": "MCA CSR Registry",
                    "detail": f"CSR 2019-20: ₹{csr_2019:,.0f} → 2020-21: ₹{csr_2020:,.0f}",
                })
    elif company_info.get("total", 0) > 0:
        flags.append({
            "flag": "No CSR data found on MCA registry",
            "severity": "LOW",
            "source": "MCA CSR Registry",
            "detail": "Company may not meet CSR threshold or data not yet filed",
        })

    # Check charge details (existing loans/mortgages)
    charges = mca_data.get("charges", {})
    charge_count = charges.get("total", 0)
    if charge_count > 5:
        flags.append({
            "flag": f"Multiple existing charges ({charge_count}) registered with MCA",
            "severity": "MEDIUM",
            "source": "MCA Charge Registry",
            "detail": "High number of existing mortgage/loan registrations",
        })

    return flags


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _safe_float(value) -> float:
    """Safely convert a value to float."""
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0.0
