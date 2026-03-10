"""
SWOT Analysis Generator
Generates comprehensive SWOT analysis based on financial data,
research findings, and scoring results.
"""

import json
import os
from typing import Dict, List


def _load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


def generate_swot(company_id: str) -> dict:
    """
    Generate SWOT analysis by triangulating:
    - Parsed financial data
    - Research findings (news, litigation, sector)
    - Credit scoring results
    - Entity onboarding data
    """
    base_dir = f"uploads/{company_id}"

    score_data = _load_json(f"{base_dir}/score_results.json")
    research_data = _load_json(f"{base_dir}/research_results.json")
    parse_data = _load_json(f"{base_dir}/parse_results.json")
    entity_data = _load_json(f"{base_dir}/entity_onboarding.json")

    strengths = []
    weaknesses = []
    opportunities = []
    threats = []

    # ── Analyze Score Data ──
    if score_data:
        overall = score_data.get("overall_score", 0)
        if overall >= 70:
            strengths.append(f"Strong overall credit score of {round(overall)}/100 indicating low default risk")
        elif overall < 50:
            weaknesses.append(f"Below-threshold credit score of {round(overall)}/100 indicating elevated risk")

        if score_data.get("character_score", 0) >= 70:
            strengths.append("Strong promoter character and compliance track record")
        elif score_data.get("character_score", 0) < 50:
            weaknesses.append("Concerns around promoter character or compliance history")

        if score_data.get("capacity_score", 0) >= 70:
            strengths.append("Strong repayment capacity supported by healthy cash flows")
        elif score_data.get("capacity_score", 0) < 50:
            weaknesses.append("Weak repayment capacity — cash flows may be insufficient for debt servicing")

        dscr = score_data.get("dscr")
        if dscr and dscr >= 1.5:
            strengths.append(f"Healthy DSCR of {dscr:.2f}x providing comfortable debt servicing margin")
        elif dscr and dscr < 1.0:
            weaknesses.append(f"Critical DSCR of {dscr:.2f}x — insufficient cash flow for debt servicing")

        ratios = score_data.get("financial_ratios", {})
        de = ratios.get("debt_equity", {})
        if de and de.get("value") is not None:
            if de["value"] < 1.0:
                strengths.append(f"Conservative leverage with D/E ratio of {de['value']:.2f}x")
            elif de["value"] > 2.5:
                weaknesses.append(f"High leverage with D/E ratio of {de['value']:.2f}x")

        cr = ratios.get("current_ratio", {})
        if cr and cr.get("value") is not None:
            if cr["value"] >= 1.5:
                strengths.append(f"Strong liquidity position with current ratio of {cr['value']:.2f}x")
            elif cr["value"] < 1.0:
                weaknesses.append(f"Liquidity concerns with current ratio of {cr['value']:.2f}x below 1.0")

    # ── Analyze Research Data ──
    if research_data:
        positive = research_data.get("positive_factors", [])
        for p in positive[:3]:
            strengths.append(str(p))

        sector = research_data.get("sector_outlook", "")
        if sector:
            if any(w in sector.lower() for w in ["growth", "positive", "strong", "boom"]):
                opportunities.append(f"Favorable sector outlook: {str(sector)[:150]}")
            elif any(w in sector.lower() for w in ["decline", "negative", "weak", "slowdown"]):
                threats.append(f"Challenging sector outlook: {str(sector)[:150]}")

        ews = research_data.get("early_warning_signals", [])
        for s in ews[:3]:
            threats.append(str(s))

        lit_flags = research_data.get("litigation_flags", [])
        if lit_flags:
            weaknesses.append(f"{len(lit_flags)} litigation/legal flag(s) identified")

        risk_level = research_data.get("overall_research_risk", "")
        if risk_level == "LOW":
            strengths.append("Low overall research risk profile from comprehensive web intelligence scan")
        elif risk_level == "HIGH":
            threats.append("High research risk — multiple adverse signals from web intelligence")

    # ── Analyze Entity Data ──
    if entity_data:
        turnover = entity_data.get("turnover")
        if turnover and turnover > 100_00_00_000:  # >100 Cr
            strengths.append(f"Significant scale with annual turnover of ₹{turnover/10000000:.0f} Cr")

        rating = entity_data.get("credit_rating")
        if rating:
            if any(g in rating.upper() for g in ["AAA", "AA+", "AA"]):
                strengths.append(f"Strong external credit rating: {rating}")
            elif any(g in rating.upper() for g in ["BB", "B", "C", "D"]):
                weaknesses.append(f"Sub-investment grade rating: {rating}")

        collateral = entity_data.get("collateral_value", 0)
        loan_amount = entity_data.get("loan_amount", 0)
        if collateral and loan_amount and collateral >= loan_amount * 1.25:
            strengths.append("Adequate collateral coverage (≥125% of loan amount)")
        elif collateral and loan_amount and collateral < loan_amount * 0.75:
            weaknesses.append("Insufficient collateral coverage (<75% of loan amount)")

    # ── Market & Macro Opportunities/Threats ──
    opportunities.extend([
        o for o in [
            "Digital transformation initiatives driving operational efficiency gains" if entity_data.get("sector") in ["IT Services", "Technology", "Fintech"] else None,
            "Government PLI/incentive schemes supporting manufacturing sector growth" if entity_data.get("sector") in ["Manufacturing", "Auto", "Pharma", "Electronics"] else None,
            "Growing domestic consumption supporting revenue expansion potential",
        ] if o
    ])

    threats.extend([
        t for t in [
            "RBI monetary tightening cycle increasing borrowing costs",
            "Global macro uncertainty and potential demand slowdown",
            "Regulatory compliance changes in the sector",
        ]
    ])

    # Ensure minimum entries
    if not strengths:
        strengths.append("Further analysis required — complete all pipeline stages")
    if not weaknesses:
        weaknesses.append("No significant weaknesses identified based on available data")
    if not opportunities:
        opportunities.append("Growth potential exists in current market conditions")
    if not threats:
        threats.append("Standard market and regulatory risks applicable")

    # Build summary
    decision = score_data.get("decision", "PENDING")
    company_name = entity_data.get("company_name", research_data.get("company_name", "the entity"))
    summary = (
        f"Based on comprehensive analysis of {company_name}, "
        f"the entity demonstrates {len(strengths)} key strengths and {len(weaknesses)} areas of concern. "
        f"The overall credit recommendation is {decision} with a score of "
        f"{round(score_data.get('overall_score', 0))}/100. "
        f"Key strengths include strong financial fundamentals, while risks center around "
        f"market conditions and regulatory factors. "
        f"{len(opportunities)} growth opportunities have been identified against {len(threats)} potential threats."
    )

    result = {
        "company_id": company_id,
        "strengths": strengths[:8],
        "weaknesses": weaknesses[:8],
        "opportunities": opportunities[:6],
        "threats": threats[:6],
        "summary": summary,
    }

    # Save to disk
    os.makedirs(f"uploads/{company_id}", exist_ok=True)
    with open(f"uploads/{company_id}/swot_analysis.json", "w") as f:
        json.dump(result, f, indent=2)

    return result
