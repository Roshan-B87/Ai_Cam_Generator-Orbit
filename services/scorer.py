"""
Credit Scorer Service — Enhanced with Indian Financial Ratios
---------------------------------------------------------------
Transparent Five Cs weighted scorecard with Indian-context ratios.
Every deduction is logged so the CAM can explain it.

Weights:
  Character  25%  — promoter integrity, litigation, MCA, RBI
  Capacity   30%  — DSCR, revenue trend, EBITDA margin, GST
  Capital    20%  — net worth, leverage, debt-equity, ROE
  Collateral 15%  — security coverage
  Conditions 10%  — sector outlook, RBI regs, macro

Indian Financial Ratios computed:
  Profitability: EBITDA Margin, Net Margin
  Returns:       ROE, ROA, ROCE
  Leverage:      Debt/Equity, Debt-to-Assets
  Liquidity:     Current Ratio, Quick Ratio
  Coverage:      DSCR, Interest Coverage
  Efficiency:    DSO, Asset Turnover, Inventory Days
"""

import json
import os


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _clamp(val: float) -> float:
    return max(0.0, min(100.0, val))


def _load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


# ─────────────────────────────────────────────
# INDIAN FINANCIAL RATIO CALCULATOR
# ─────────────────────────────────────────────

def compute_indian_ratios(financial_data: dict) -> dict:
    """
    Compute Indian-context financial ratios.
    Returns dict with ratio values and benchmarking.
    """
    revenue     = financial_data.get("revenue", 0)
    ebitda      = financial_data.get("ebitda", 0)
    net_profit  = financial_data.get("net_profit", 0)
    total_debt  = financial_data.get("total_debt", 0)
    net_worth   = financial_data.get("net_worth", 0)
    total_assets = financial_data.get("total_assets", net_worth + total_debt) or 1
    current_assets = financial_data.get("current_assets", 0)
    current_liabilities = financial_data.get("current_liabilities", 0)
    receivables = financial_data.get("receivables", 0)
    inventory   = financial_data.get("inventory", 0)
    cogs        = financial_data.get("cogs", revenue * 0.65 if revenue else 0)
    interest    = financial_data.get("interest_expense", total_debt * 0.10 if total_debt else 0)

    ratios = {}

    # Profitability
    ratios["ebitda_margin"]     = round((ebitda / revenue) * 100, 2)      if revenue > 0 and ebitda else None
    ratios["net_profit_margin"] = round((net_profit / revenue) * 100, 2)  if revenue > 0 and net_profit else None

    # Return Ratios
    ratios["roe"]  = round((net_profit / net_worth) * 100, 2)            if net_worth > 0 and net_profit else None
    ratios["roa"]  = round((net_profit / total_assets) * 100, 2)         if total_assets > 1 and net_profit else None
    ratios["roce"] = round((ebitda / (net_worth + total_debt)) * 100, 2) if (net_worth + total_debt) > 0 and ebitda else None

    # Leverage
    ratios["debt_equity"]    = round(total_debt / net_worth, 2)     if net_worth > 0 else None
    ratios["debt_to_assets"] = round(total_debt / total_assets, 2)  if total_assets > 1 else None

    # Liquidity
    ratios["current_ratio"] = round(current_assets / current_liabilities, 2) if current_liabilities > 0 else None
    ratios["quick_ratio"]   = round((current_assets - inventory) / current_liabilities, 2) if current_liabilities > 0 and current_assets > inventory else None

    # Coverage
    ratios["dscr"]              = calculate_dscr(ebitda, total_debt)
    ratios["interest_coverage"] = round(ebitda / interest, 2) if interest > 0 and ebitda else None

    # Efficiency
    ratios["dso"]            = round((receivables / revenue) * 365, 0) if revenue > 0 and receivables else None
    ratios["asset_turnover"] = round(revenue / total_assets, 2)        if total_assets > 1 and revenue else None
    ratios["inventory_days"] = round((inventory / cogs) * 365, 0)      if cogs > 0 and inventory else None

    # Benchmarking
    benchmarked = {}
    for key, val in ratios.items():
        bm = _benchmark_ratio(key, val)
        benchmarked[key] = {
            "value": val,
            "benchmark": bm["benchmark"],
            "status": bm["status"],
            "color": bm["color"],
        }

    return benchmarked


# ─────────────────────────────────────────────
# SECTOR BENCHMARKS (Indian context)
# ─────────────────────────────────────────────

SECTOR_BENCHMARKS = {
    "manufacturing": {"current_ratio": 1.5, "debt_equity": 1.5, "ebitda_margin": 12, "dscr": 1.5},
    "it_services":   {"current_ratio": 2.0, "debt_equity": 0.5, "ebitda_margin": 20, "dscr": 2.0},
    "infrastructure":{"current_ratio": 1.2, "debt_equity": 2.5, "ebitda_margin": 15, "dscr": 1.3},
    "nbfc":          {"current_ratio": 1.1, "debt_equity": 4.0, "ebitda_margin": 30, "dscr": 1.2},
    "pharma":        {"current_ratio": 1.8, "debt_equity": 0.8, "ebitda_margin": 18, "dscr": 1.8},
    "fmcg":          {"current_ratio": 1.5, "debt_equity": 0.6, "ebitda_margin": 15, "dscr": 2.0},
    "real_estate":   {"current_ratio": 1.2, "debt_equity": 2.0, "ebitda_margin": 20, "dscr": 1.2},
    "agriculture":   {"current_ratio": 1.3, "debt_equity": 1.5, "ebitda_margin": 10, "dscr": 1.3},
    "default":       {"current_ratio": 1.33, "debt_equity": 1.5, "ebitda_margin": 15, "dscr": 1.5},
}


def _benchmark_ratio(name: str, value) -> dict:
    if value is None:
        return {"benchmark": "N/A", "status": "No Data", "color": "grey"}

    benchmarks = {
        "current_ratio":     {"good": 1.33, "fair": 1.0,  "label": "> 1.33x"},
        "quick_ratio":       {"good": 1.0,  "fair": 0.7,  "label": "> 1.0x"},
        "debt_equity":       {"good": 1.5,  "fair": 2.5,  "label": "< 1.5x",     "inverted": True},
        "debt_to_assets":    {"good": 0.4,  "fair": 0.6,  "label": "< 0.4x",     "inverted": True},
        "dscr":              {"good": 1.5,  "fair": 1.25, "label": "> 1.5x"},
        "interest_coverage": {"good": 3.0,  "fair": 2.0,  "label": "> 3.0x"},
        "roe":               {"good": 15,   "fair": 10,   "label": "> 15%"},
        "roa":               {"good": 5,    "fair": 3,    "label": "> 5%"},
        "roce":              {"good": 15,   "fair": 10,   "label": "> 15%"},
        "ebitda_margin":     {"good": 15,   "fair": 10,   "label": "> 15%"},
        "net_profit_margin": {"good": 10,   "fair": 5,    "label": "> 10%"},
        "dso":               {"good": 60,   "fair": 90,   "label": "< 60 days",   "inverted": True},
        "asset_turnover":    {"good": 1.5,  "fair": 1.0,  "label": "> 1.5x"},
        "inventory_days":    {"good": 60,   "fair": 90,   "label": "< 60 days",   "inverted": True},
    }

    b = benchmarks.get(name, {"good": 50, "fair": 25, "label": "N/A"})
    inverted = b.get("inverted", False)

    if inverted:
        if value <= b["good"]:   return {"benchmark": b["label"], "status": "Strong",   "color": "green"}
        elif value <= b["fair"]: return {"benchmark": b["label"], "status": "Adequate",  "color": "amber"}
        else:                    return {"benchmark": b["label"], "status": "Weak",      "color": "red"}
    else:
        if value >= b["good"]:   return {"benchmark": b["label"], "status": "Strong",   "color": "green"}
        elif value >= b["fair"]: return {"benchmark": b["label"], "status": "Adequate",  "color": "amber"}
        else:                    return {"benchmark": b["label"], "status": "Weak",      "color": "red"}


# ─────────────────────────────────────────────
# CHARACTER SCORE  (25%)
# ─────────────────────────────────────────────

def _score_character(research_data: dict) -> tuple[float, list]:
    score = 100.0
    deductions = []

    signals = research_data.get("early_warning_signals", [])
    litigation_flags = research_data.get("litigation_flags", [])
    overall_risk = research_data.get("overall_research_risk", "LOW")
    lit_patterns = research_data.get("litigation_patterns", [])
    rbi_findings = research_data.get("rbi_findings", [])
    mca_findings = research_data.get("mca_findings", [])

    # ── CIBIL Commercial Score (Indian credit bureau) ──
    cibil_score = research_data.get("cibil_score")
    if cibil_score is not None:
        if cibil_score < 500:
            score -= 30
            deductions.append(f"Critical: CIBIL Commercial Score {cibil_score} < 500 — severe credit risk (-30)")
        elif cibil_score < 600:
            score -= 20
            deductions.append(f"Warning: CIBIL Score {cibil_score} < 600 — elevated default risk (-20)")
        elif cibil_score < 700:
            score -= 10
            deductions.append(f"CIBIL Score {cibil_score} — below prime threshold of 700 (-10)")
        elif cibil_score >= 750:
            score += 5
            score = min(score, 100)
            deductions.append(f"CIBIL Score {cibil_score} ≥ 750 — strong credit history (+5 bonus)")
    else:
        score -= 5
        deductions.append("CIBIL Commercial Bureau score not available — recommend obtaining (-5)")

    # Litigation
    if len(litigation_flags) >= 3:
        score -= 35
        deductions.append(f"Severe: {len(litigation_flags)} litigation flags detected (-35)")
    elif len(litigation_flags) >= 1:
        score -= 20
        deductions.append(f"Moderate: {len(litigation_flags)} litigation flag(s) detected (-20)")

    # NCLT / IBC
    lit_text = " ".join(litigation_flags).lower()
    if "nclt" in lit_text or "ibc" in lit_text:
        score -= 25
        deductions.append("Critical: NCLT/IBC proceedings detected (-25)")

    # Pattern scan — Critical litigation
    critical_lit = [p for p in lit_patterns if p.get("severity") == "CRITICAL"]
    if critical_lit:
        score -= 20
        deductions.append(f"Critical litigation patterns: {', '.join([p['description'] for p in critical_lit])} (-20)")

    # RBI findings — wilful defaulter, PCA
    critical_rbi = [r for r in rbi_findings if r.get("risk") == "CRITICAL"]
    if critical_rbi:
        score -= 30
        deductions.append(f"Critical RBI flags: {', '.join([r['description'] for r in critical_rbi])} (-30)")

    high_rbi = [r for r in rbi_findings if r.get("risk") == "HIGH"]
    if high_rbi:
        score -= 15
        deductions.append(f"High RBI risk: {', '.join([r['description'] for r in high_rbi])} (-15)")

    # MCA compliance
    critical_mca = [m for m in mca_findings if m.get("severity") == "CRITICAL"]
    if critical_mca:
        score -= 20
        deductions.append(f"MCA compliance critical issues found (-20)")

    high_mca = [m for m in mca_findings if m.get("severity") == "HIGH"]
    if high_mca:
        score -= 10
        deductions.append(f"MCA compliance issues: {len(high_mca)} high-severity (-10)")

    # Early warning signals
    if len(signals) >= 4:
        score -= 20
        deductions.append(f"{len(signals)} early warning signals from research (-20)")
    elif len(signals) >= 2:
        score -= 10
        deductions.append(f"{len(signals)} early warning signals from research (-10)")

    # Overall research risk
    if overall_risk == "HIGH":
        score -= 15
        deductions.append("Research agent flagged HIGH overall risk (-15)")
    elif overall_risk == "MEDIUM":
        score -= 5
        deductions.append("Research agent flagged MEDIUM overall risk (-5)")

    return _clamp(score), deductions


# ─────────────────────────────────────────────
# CAPACITY SCORE  (30%)
# ─────────────────────────────────────────────

def _score_capacity(financial_data: dict, gst_flags: dict, ratios: dict = None) -> tuple[float, list]:
    score = 100.0
    deductions = []

    # DSCR check
    ebitda      = financial_data.get("ebitda", 0)
    total_debt  = financial_data.get("total_debt", 0)
    dscr = calculate_dscr(ebitda, total_debt)

    if dscr == 0:
        score -= 20
        deductions.append("DSCR could not be calculated — missing financials (-20)")
    elif dscr < 1.0:
        score -= 35
        deductions.append(f"Critical: DSCR {dscr} < 1.0 — cannot service debt (-35)")
    elif dscr < 1.25:
        score -= 20
        deductions.append(f"Warning: DSCR {dscr} below healthy threshold of 1.25 (-20)")
    elif dscr < 1.5:
        score -= 8
        deductions.append(f"DSCR {dscr} acceptable but below ideal 1.5 (-8)")

    # Revenue check
    revenue = financial_data.get("revenue", 0)
    if revenue == 0:
        score -= 15
        deductions.append("Revenue data not available (-15)")

    # Interest coverage (from ratios)
    if ratios:
        ic_data = ratios.get("interest_coverage", {})
        ic_val = ic_data.get("value") if isinstance(ic_data, dict) else ic_data
        if ic_val is not None and ic_val < 2.0:
            score -= 12
            deductions.append(f"Interest Coverage Ratio {ic_val}x below 2.0x threshold (-12)")

    # EBITDA margin check (from ratios)
    if ratios:
        em_data = ratios.get("ebitda_margin", {})
        em_val = em_data.get("value") if isinstance(em_data, dict) else em_data
        if em_val is not None and em_val < 10:
            score -= 8
            deductions.append(f"EBITDA Margin {em_val}% below 10% — thin margins (-8)")

    # GST fraud flags
    gst_fraud = gst_flags.get("fraud_risk", "LOW")
    gst_revenue_risk = gst_flags.get("revenue_inflation_risk", "LOW")

    if gst_fraud == "HIGH":
        score -= 25
        deductions.append("HIGH GST fraud risk — ITC overclaim detected (-25)")
    elif gst_fraud == "MEDIUM":
        score -= 12
        deductions.append("MEDIUM GST fraud risk — ITC discrepancies (GSTR-2B vs 3B) (-12)")

    if gst_revenue_risk == "HIGH":
        score -= 20
        deductions.append("HIGH revenue inflation risk — GST turnover vs bank credits mismatch (-20)")
    elif gst_revenue_risk == "MEDIUM":
        score -= 10
        deductions.append("MEDIUM revenue inflation risk (-10)")

    # Circular trading
    if gst_flags.get("circular_trading_detected"):
        score -= 30
        deductions.append("CRITICAL: Circular trading detected in GST data (-30)")

    return _clamp(score), deductions


# ─────────────────────────────────────────────
# CAPITAL SCORE  (20%)
# ─────────────────────────────────────────────

def _score_capital(financial_data: dict, ratios: dict = None) -> tuple[float, list]:
    score = 100.0
    deductions = []

    net_worth  = financial_data.get("net_worth", 0)
    total_debt = financial_data.get("total_debt", 0)

    # Debt-Equity ratio
    if net_worth > 0:
        de_ratio = total_debt / net_worth
        if de_ratio > 3.0:
            score -= 35
            deductions.append(f"Critical: D/E ratio {de_ratio:.1f}x — highly leveraged (-35)")
        elif de_ratio > 2.0:
            score -= 20
            deductions.append(f"High D/E ratio {de_ratio:.1f}x — elevated leverage (-20)")
        elif de_ratio > 1.5:
            score -= 10
            deductions.append(f"Moderate D/E ratio {de_ratio:.1f}x (-10)")
    else:
        score -= 25
        deductions.append("Net worth data not available or zero (-25)")

    # Net worth absolute check
    if net_worth > 0 and net_worth < 10_000_000:  # Less than 1 Cr
        score -= 15
        deductions.append(f"Low net worth ₹{net_worth:,.0f} (-15)")

    # ROE check (from ratios)
    if ratios:
        roe_data = ratios.get("roe", {})
        roe_val = roe_data.get("value") if isinstance(roe_data, dict) else roe_data
        if roe_val is not None:
            if roe_val < 5:
                score -= 10
                deductions.append(f"ROE {roe_val}% — poor return on equity (-10)")
            elif roe_val < 10:
                score -= 5
                deductions.append(f"ROE {roe_val}% — below-average returns (-5)")

    # Debt-to-Assets check (from ratios)
    if ratios:
        dta_data = ratios.get("debt_to_assets", {})
        dta_val = dta_data.get("value") if isinstance(dta_data, dict) else dta_data
        if dta_val is not None and dta_val > 0.7:
            score -= 10
            deductions.append(f"Debt-to-Assets {dta_val}x — excessive leverage (-10)")

    return _clamp(score), deductions


# ─────────────────────────────────────────────
# COLLATERAL SCORE  (15%)
# ─────────────────────────────────────────────

def _score_collateral(financial_data: dict, requested_amount: float) -> tuple[float, list]:
    score = 100.0
    deductions = []

    collateral_value = financial_data.get("collateral_value", 0)

    if collateral_value == 0:
        score -= 40
        deductions.append("Collateral value not provided (-40)")
        return _clamp(score), deductions

    if requested_amount > 0:
        coverage_ratio = collateral_value / requested_amount
        if coverage_ratio < 1.0:
            score -= 40
            deductions.append(f"Collateral coverage {coverage_ratio:.1f}x — below 1x (-40)")
        elif coverage_ratio < 1.25:
            score -= 20
            deductions.append(f"Low collateral coverage {coverage_ratio:.1f}x (-20)")
        elif coverage_ratio < 1.5:
            score -= 10
            deductions.append(f"Adequate but low coverage {coverage_ratio:.1f}x (-10)")

    return _clamp(score), deductions


# ─────────────────────────────────────────────
# CONDITIONS SCORE  (10%)
# ─────────────────────────────────────────────

def _score_conditions(research_data: dict) -> tuple[float, list]:
    score = 100.0
    deductions = []

    sector_outlook    = research_data.get("sector_outlook", "").lower()
    regulatory_risks  = research_data.get("regulatory_risks", "").lower()
    rbi_observations  = research_data.get("rbi_observations", "").lower()

    # Negative sector keywords
    negative_sector = ["headwind", "downturn", "decline", "stress", "slowdown", "crisis", "recession", "contraction"]
    for kw in negative_sector:
        if kw in sector_outlook:
            score -= 15
            deductions.append(f"Negative sector outlook: '{kw}' detected (-15)")
            break

    # Regulatory risk keywords (expanded for Indian context)
    negative_regs = [
        "rbi action", "sebi notice", "ban", "penalty", "non-compliant", "violation",
        "pca framework", "prompt corrective", "wilful defaulter", "npa classification",
        "regulatory restriction", "lending ban"
    ]
    for kw in negative_regs:
        if kw in regulatory_risks or kw in rbi_observations:
            score -= 20
            deductions.append(f"Regulatory risk: '{kw}' detected (-20)")
            break

    # RBI-specific observations
    if "nbfc" in rbi_observations and any(kw in rbi_observations for kw in ["liquidity", "alm mismatch", "asset liability"]):
        score -= 10
        deductions.append("NBFC-specific liquidity / ALM risk flagged (-10)")

    return _clamp(score), deductions


# ─────────────────────────────────────────────
# MAIN SCORING FUNCTION
# ─────────────────────────────────────────────

def calculate_five_cs_score(
    company_id: str,
    financial_data: dict,
    research_data: dict,
    gst_flags: dict,
    officer_notes: str = "",
    requested_amount: float = 0
) -> dict:
    """
    Full Five Cs scoring engine with Indian financial ratios.
    Returns scores, decision, ratios, loan recommendation, and full explanation.
    """
    # Compute Indian ratios
    ratios = compute_indian_ratios(financial_data)

    all_deductions = {}

    # Score each C (pass ratios for enhanced checks)
    char_score,  char_deductions  = _score_character(research_data)
    cap_score,   cap_deductions   = _score_capacity(financial_data, gst_flags, ratios)
    capl_score,  capl_deductions  = _score_capital(financial_data, ratios)
    coll_score,  coll_deductions  = _score_collateral(financial_data, requested_amount)
    cond_score,  cond_deductions  = _score_conditions(research_data)

    all_deductions = {
        "character":  char_deductions,
        "capacity":   cap_deductions,
        "capital":    capl_deductions,
        "collateral": coll_deductions,
        "conditions": cond_deductions
    }

    # Apply officer note adjustments
    officer_adj = _load_json(f"uploads/{company_id}/officer_notes_adjustments.json")
    if officer_adj:
        char_score  = _clamp(char_score  + officer_adj.get("character_adjustment", 0))
        cap_score   = _clamp(cap_score   + officer_adj.get("capacity_adjustment", 0))
        capl_score  = _clamp(capl_score  + officer_adj.get("capital_adjustment", 0))
        coll_score  = _clamp(coll_score  + officer_adj.get("collateral_adjustment", 0))
        cond_score  = _clamp(cond_score  + officer_adj.get("conditions_adjustment", 0))

        adj_reason = officer_adj.get("reasoning", "")
        if adj_reason:
            all_deductions["officer_notes"] = [f"Officer observations applied: {adj_reason}"]

    # Weighted overall score
    overall = (
        char_score  * 0.25 +
        cap_score   * 0.30 +
        capl_score  * 0.20 +
        coll_score  * 0.15 +
        cond_score  * 0.10
    )
    overall = round(overall, 1)

    # Decision logic
    decision, decision_reason = _make_decision(
        overall, char_score, cap_score, capl_score, coll_score, gst_flags, research_data
    )

    # Loan recommendation
    recommended_amount = _recommend_loan_amount(financial_data, overall, requested_amount)
    interest_rate      = get_risk_premium(overall)

    # Build human-readable explanation
    explanation = _build_explanation(
        overall, decision, decision_reason,
        all_deductions, char_score, cap_score, capl_score, coll_score, cond_score
    )

    # Prepare ratios for API response (flatten)
    flat_ratios = {}
    for key, data in ratios.items():
        if isinstance(data, dict):
            flat_ratios[key] = data
        else:
            flat_ratios[key] = {"value": data, "benchmark": "N/A", "status": "N/A", "color": "grey"}

    result = {
        "company_id": company_id,
        "overall_score": overall,
        "character_score":  round(char_score, 1),
        "capacity_score":   round(cap_score, 1),
        "capital_score":    round(capl_score, 1),
        "collateral_score": round(coll_score, 1),
        "conditions_score": round(cond_score, 1),
        "decision": decision,
        "decision_reason": decision_reason,
        "recommended_amount": recommended_amount,
        "interest_rate": interest_rate,
        "explanation": explanation,
        "deductions": all_deductions,
        "dscr": calculate_dscr(
            financial_data.get("ebitda", 0),
            financial_data.get("total_debt", 0)
        ),
        "financial_ratios": flat_ratios,
    }

    # Persist to disk
    os.makedirs(f"uploads/{company_id}", exist_ok=True)
    with open(f"uploads/{company_id}/score_results.json", "w") as f:
        json.dump(result, f, indent=2)

    return result


# ─────────────────────────────────────────────
# DECISION LOGIC
# ─────────────────────────────────────────────

def _make_decision(
    overall: float,
    char: float, cap: float, capl: float, coll: float,
    gst_flags: dict, research_data: dict
) -> tuple[str, str]:
    """Hard-reject rules first, then score-based decision."""

    # Hard reject conditions
    if gst_flags.get("circular_trading_detected"):
        return "REJECT", "Circular trading detected in GST analysis — automatic rejection"

    lit_flags = research_data.get("litigation_flags", [])
    lit_text = " ".join(lit_flags).lower()
    if "nclt" in lit_text or "ibc" in lit_text:
        return "REJECT", "Active NCLT/IBC proceedings — automatic rejection per RBI norms"

    # Wilful defaulter check
    rbi_findings = research_data.get("rbi_findings", [])
    for rf in rbi_findings:
        if rf.get("type") == "wilful_defaulter":
            return "REJECT", "Classified as wilful defaulter — automatic rejection per RBI Master Circular"

    if char < 30:
        return "REJECT", f"Character score {char}/100 critically low — promoter integrity concerns"

    if cap < 25:
        return "REJECT", f"Capacity score {cap}/100 critically low — cannot service debt"

    # Score-based decisions
    if overall >= 70:
        return "APPROVE", f"Overall score {overall}/100 meets lending criteria. All Five Cs within acceptable range."
    elif overall >= 50:
        return "REFER", f"Overall score {overall}/100 — refer to credit committee for review"
    else:
        return "REJECT", f"Overall score {overall}/100 below minimum threshold of 50"


def _recommend_loan_amount(
    financial_data: dict,
    score: float,
    requested_amount: float
) -> float:
    """
    Recommend loan amount based on financials and score.
    Conservative: max 3x EBITDA for strong, 2x for medium.
    """
    ebitda = financial_data.get("ebitda", 0)
    if ebitda <= 0:
        return 0.0

    if score >= 70:
        max_loan = ebitda * 3.0
    elif score >= 50:
        max_loan = ebitda * 2.0
    else:
        return 0.0

    if requested_amount > 0:
        return round(min(requested_amount, max_loan), 2)
    return round(max_loan, 2)


def _build_explanation(
    overall: float,
    decision: str,
    decision_reason: str,
    deductions: dict,
    char: float, cap: float, capl: float, coll: float, cond: float
) -> str:
    lines = [
        f"DECISION: {decision}",
        f"Reason: {decision_reason}",
        f"",
        f"OVERALL SCORE: {overall}/100",
        f"",
        f"FIVE Cs BREAKDOWN:",
        f"  Character  (25%): {char}/100",
        f"  Capacity   (30%): {cap}/100",
        f"  Capital    (20%): {capl}/100",
        f"  Collateral (15%): {coll}/100",
        f"  Conditions (10%): {cond}/100",
        f"",
        f"SCORE DEDUCTIONS (Audit Trail):",
    ]

    for category, items in deductions.items():
        if items:
            lines.append(f"  [{category.upper()}]")
            for item in items:
                lines.append(f"    • {item}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────────

def calculate_dscr(ebitda: float, total_debt_obligations: float) -> float:
    if total_debt_obligations == 0:
        return 0.0
    return round(ebitda / total_debt_obligations, 2)


def get_risk_premium(score: float) -> str:
    if score >= 80:
        return "MCLR + 1.00%"
    elif score >= 65:
        return "MCLR + 2.00%"
    elif score >= 50:
        return "MCLR + 3.50%"
    else:
        return "Not applicable — loan not recommended"
