"""
Databricks Connector — Mock/Simulation
-----------------------------------------
The problem statement requires ingestion from Databricks.
This module simulates a Databricks data source connector for:
  - Structured financial data (Balance Sheet, P&L, Cash Flow)
  - GST return data (GSTR-1, 2A, 2B, 3B)
  - Bank statement transaction data
  - CIBIL Commercial Bureau data

In production, this would use:
  - databricks-sql-connector for Databricks SQL warehouse
  - Databricks REST API for Unity Catalog
  - Delta Lake tables for financial data pipelines
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, List
import json, os, uuid

router = APIRouter()


class DatabricksIngestRequest(BaseModel):
    company_name: str
    company_id: Optional[str] = None
    data_source: str = "databricks"           # "databricks" | "manual"
    catalog: Optional[str] = "credit_data"     # Databricks Unity Catalog
    schema: Optional[str] = "raw_financials"   # Databricks schema/database
    table_prefix: Optional[str] = None         # e.g. "tata_motors"


class DatabricksIngestResponse(BaseModel):
    company_id: str
    source: str
    tables_loaded: List[str]
    records_ingested: int
    status: str


# ─────────────────────────────────────────────
# SIMULATED DATABRICKS DATA
# ─────────────────────────────────────────────

def _simulate_databricks_financials(company_name: str) -> dict:
    """
    Simulate fetching structured financial data from Databricks Delta tables.
    In production: SELECT * FROM credit_data.raw_financials.balance_sheet WHERE company = ?
    """
    return {
        "source": "databricks_delta_table",
        "catalog": "credit_data",
        "schema": "raw_financials",
        "balance_sheet": {
            "total_assets": 85000000,
            "current_assets": 32000000,
            "non_current_assets": 53000000,
            "current_liabilities": 24000000,
            "non_current_liabilities": 28000000,
            "total_equity": 33000000,
            "net_worth": 33000000,
            "total_debt": 42000000,
            "inventory": 8500000,
            "receivables": 12000000,
            "cash_and_equivalents": 4500000,
            "collateral_value": 55000000,
        },
        "profit_loss": {
            "revenue": 120000000,
            "cogs": 78000000,
            "ebitda": 18000000,
            "depreciation": 4500000,
            "interest_expense": 5200000,
            "net_profit": 7800000,
        },
        "cash_flow": {
            "operating_cash_flow": 15000000,
            "investing_cash_flow": -8000000,
            "financing_cash_flow": -5000000,
            "net_cash_flow": 2000000,
        },
    }


def _simulate_databricks_gst(company_name: str) -> dict:
    """
    Simulate fetching GST filing data from Databricks.
    In production: Delta table partitioned by gstin and return_period.
    """
    return {
        "source": "databricks_delta_table",
        "gstr_2a_2b": {
            "2024-04": {"itc_available": 185000},
            "2024-05": {"itc_available": 210000},
            "2024-06": {"itc_available": 195000},
            "2024-07": {"itc_available": 220000},
            "2024-08": {"itc_available": 205000},
            "2024-09": {"itc_available": 230000},
        },
        "gstr_3b": {
            "2024-04": {"itc_claimed": 183000, "turnover": 10200000},
            "2024-05": {"itc_claimed": 208000, "turnover": 10800000},
            "2024-06": {"itc_claimed": 192000, "turnover": 9800000},
            "2024-07": {"itc_claimed": 218000, "turnover": 11000000},
            "2024-08": {"itc_claimed": 203000, "turnover": 10500000},
            "2024-09": {"itc_claimed": 228000, "turnover": 11200000},
        },
        "gst_turnover_monthly": {
            "2024-04": 10200000, "2024-05": 10800000, "2024-06": 9800000,
            "2024-07": 11000000, "2024-08": 10500000, "2024-09": 11200000,
        },
    }


def _simulate_databricks_bank(company_name: str) -> dict:
    """
    Simulate bank statement data from Databricks aggregation pipeline.
    In production: Processed from raw bank statement PDFs via OCR pipeline.
    """
    return {
        "source": "databricks_pipeline",
        "bank_credits_monthly": {
            "2024-04": 9900000, "2024-05": 10600000, "2024-06": 9500000,
            "2024-07": 10800000, "2024-08": 10200000, "2024-09": 11000000,
        },
        "summary": {
            "total_credits": 62000000,
            "total_debits": 59500000,
            "average_monthly_balance": 4200000,
            "cheque_bounces": 1,
            "emi_regularity": "Regular",
        }
    }


def _simulate_cibil_data(company_name: str) -> dict:
    """
    Simulate CIBIL Commercial Bureau report data from Databricks.
    In production: Fetched via TransUnion CIBIL API and stored in Delta tables.
    """
    return {
        "source": "cibil_commercial_api",
        "cibil_score": 725,                          # CMR Score (300-900)
        "cmr_rank": 4,                                # Credit Manager Rating (1-10, 1 = best)
        "payment_history": "Mostly on time",
        "suit_filed_count": 0,
        "wilful_defaulter": False,
        "overdue_accounts": 0,
        "credit_utilization_pct": 68,
        "total_credit_facilities": 5,
        "dpd_30_count": 1,                            # Days Past Due > 30
        "dpd_90_count": 0,
    }


# ─────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────

@router.post("/ingest", response_model=DatabricksIngestResponse)
async def ingest_from_databricks(request: DatabricksIngestRequest):
    """
    Ingest structured data from Databricks Delta Lake tables.
    Simulates connection to:
      - Unity Catalog: credit_data.raw_financials
      - Delta tables: balance_sheet, profit_loss, cash_flow, gst_returns, bank_statements
      - External API: CIBIL Commercial Bureau

    In production, this would use databricks-sql-connector.
    """
    company_id = request.company_id or str(uuid.uuid4())[:8]
    save_dir = f"uploads/{company_id}"
    os.makedirs(save_dir, exist_ok=True)

    # Simulate Databricks data fetch
    financials = _simulate_databricks_financials(request.company_name)
    gst_data = _simulate_databricks_gst(request.company_name)
    bank_data = _simulate_databricks_bank(request.company_name)
    cibil_data = _simulate_cibil_data(request.company_name)

    # Flatten financials for the scorer
    flat_financials = {}
    for section in ["balance_sheet", "profit_loss", "cash_flow"]:
        flat_financials.update(financials.get(section, {}))

    # Save to parse_results.json (same format as PDF pipeline)
    parse_results = {
        "company_name": request.company_name,
        "status": "ready",
        "source": "databricks",
        "files": [f"databricks://{request.catalog}.{request.schema}"],
        "parsed_docs": [{
            "file": f"databricks://{request.catalog}.{request.schema}",
            "doc_type": "databricks_structured",
            "pages": 0,
            "ocr_pages": [],
            "sections": ["balance_sheet", "profit_loss", "cash_flow"],
            "financials": flat_financials,
        }],
        "rag_ready": False,
        "databricks_metadata": {
            "catalog": request.catalog,
            "schema": request.schema,
            "tables_queried": ["balance_sheet", "profit_loss", "cash_flow", "gst_returns", "bank_statements", "cibil_report"],
        },
    }

    with open(f"{save_dir}/parse_results.json", "w") as f:
        json.dump(parse_results, f, indent=2)

    # Save GST data
    from services.gst_validator import compare_gstr_2b_vs_3b, cross_check_revenue
    gst_validation = compare_gstr_2b_vs_3b(gst_data["gstr_2a_2b"], gst_data["gstr_3b"])
    revenue_check = cross_check_revenue(gst_data["gst_turnover_monthly"], bank_data["bank_credits_monthly"])

    gst_flags = {
        **gst_validation,
        "revenue_inflation_risk": revenue_check.get("revenue_inflation_risk", "LOW"),
        "revenue_check": revenue_check,
    }
    with open(f"{save_dir}/gst_flags.json", "w") as f:
        json.dump(gst_flags, f, indent=2)

    # Save CIBIL data
    with open(f"{save_dir}/cibil_data.json", "w") as f:
        json.dump(cibil_data, f, indent=2)

    tables = ["balance_sheet", "profit_loss", "cash_flow", "gst_returns", "bank_statements", "cibil_report"]

    return DatabricksIngestResponse(
        company_id=company_id,
        source=f"databricks://{request.catalog}.{request.schema}",
        tables_loaded=tables,
        records_ingested=len(tables) * 12,  # Simulated record count
        status="ready",
    )


@router.get("/tables/{company_id}")
async def get_databricks_data(company_id: str):
    """Return all Databricks-ingested structured data for a company."""
    base_dir = f"uploads/{company_id}"
    parse_results = {}
    gst_flags = {}
    cibil_data = {}

    for fname, target in [("parse_results.json", parse_results), ("gst_flags.json", gst_flags), ("cibil_data.json", cibil_data)]:
        path = f"{base_dir}/{fname}"
        if os.path.exists(path):
            with open(path) as f:
                target.update(json.load(f))

    return {
        "company_id": company_id,
        "parse_results": parse_results,
        "gst_flags": gst_flags,
        "cibil_data": cibil_data,
    }
