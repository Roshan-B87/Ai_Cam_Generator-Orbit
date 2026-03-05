"""
Explainer Service — "Walk the Judge Through" the Decision
-----------------------------------------------------------
Uses LLM to generate a natural-language narrative that explains:
  1. WHY the decision was made (not just the score)
  2. Which specific data points drove each Five C score
  3. Indian-context regulatory reasoning
  4. Data quality assessment (how much was inferred vs extracted)
  5. What-if scenario analysis

This is the KEY differentiator for explainability scoring.
"""

import json
import os
import asyncio
from groq import Groq
from services.scorer import calculate_five_cs_score, compute_indian_ratios

client = Groq()
MODEL = "openai/gpt-oss-120b"


def _load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


def _groq_stream(messages: list, max_tokens: int = 4096) -> str:
    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
        max_completion_tokens=max_tokens,
        top_p=1,
        reasoning_effort="medium",
        stream=True,
    )
    text = ""
    for chunk in completion:
        text += chunk.choices[0].delta.content or ""
    return text


# ─────────────────────────────────────────────
# DATA QUALITY ASSESSMENT
# ─────────────────────────────────────────────

def assess_data_quality(financial_data: dict, research_data: dict, gst_flags: dict) -> dict:
    """Score how complete the input data is (0-100)."""
    total_checks = 0
    passed = 0

    # Financial data completeness
    key_financials = ["revenue", "ebitda", "net_profit", "total_debt", "net_worth",
                      "current_assets", "current_liabilities", "receivables", "inventory"]
    for k in key_financials:
        total_checks += 1
        if financial_data.get(k, 0) > 0:
            passed += 1

    # Research data completeness
    research_fields = ["promoter_background", "sector_outlook", "litigation_summary",
                       "mca_compliance", "rbi_observations", "research_summary"]
    for f in research_fields:
        total_checks += 1
        val = research_data.get(f, "")
        if val and len(str(val)) > 20 and "not available" not in str(val).lower():
            passed += 1

    # GST data
    total_checks += 1
    if gst_flags and gst_flags.get("fraud_risk"):
        passed += 1

    # Research status
    total_checks += 1
    if research_data.get("status") == "completed":
        passed += 1

    score = round((passed / total_checks) * 100, 1) if total_checks > 0 else 0

    missing = []
    if financial_data.get("revenue", 0) == 0:
        missing.append("Revenue figures not extracted from documents")
    if financial_data.get("net_worth", 0) == 0:
        missing.append("Net worth / equity not available")
    if not gst_flags or not gst_flags.get("fraud_risk"):
        missing.append("GST cross-validation (GSTR-2A/2B vs 3B) not performed")
    if not research_data.get("status") == "completed":
        missing.append("Web research agent not completed")

    return {
        "score": score,
        "checks_passed": passed,
        "total_checks": total_checks,
        "missing_data": missing,
        "confidence": "HIGH" if score >= 70 else ("MEDIUM" if score >= 40 else "LOW"),
    }


# ─────────────────────────────────────────────
# AI NARRATIVE GENERATOR
# ─────────────────────────────────────────────

EXPLAIN_PROMPT = """You are a senior Indian credit analyst presenting to a credit committee.
Generate a clear, structured NARRATIVE WALKTHROUGH of the credit decision.
Write as if you are explaining the decision to judges who want to understand your REASONING.

RULES:
1. Do NOT just repeat numbers — EXPLAIN what they mean and WHY they matter
2. Reference Indian-specific regulations (RBI IRAC norms, GSTR-2A vs 3B, NCLT/IBC, CIBIL, MCA)
3. For each Five C, explain: what data was used, what was found, and its impact on the score
4. Explicitly state what would change the decision (threshold reasoning)
5. Call out any data gaps and how they affected the analysis
6. Use specific Indian banking terminology (MCLR, PSL, NPA, DSCR, D/E ratio)

Return ONLY valid JSON:
{{
  "narrative": "A multi-paragraph walkthrough of the decision (500+ words). Start with 'The credit assessment of [Company]...'",
  "key_drivers": ["Top 5 specific factors that drove the decision — be concrete with numbers"],
  "risk_mitigants": ["Positive factors identified"],
  "indian_context_notes": ["India-specific regulatory observations (RBI, MCA, SEBI, GST)"],
  "confidence_level": "HIGH or MEDIUM or LOW based on data quality"
}}"""


async def generate_explanation(company_id: str) -> dict:
    """Generate AI narrative walkthrough of credit decision."""
    base_dir = f"uploads/{company_id}"
    score_data = _load_json(f"{base_dir}/score_results.json")
    research_data = _load_json(f"{base_dir}/research_results.json")
    parse_results = _load_json(f"{base_dir}/parse_results.json")
    gst_flags = _load_json(f"{base_dir}/gst_flags.json")
    officer_notes = _load_json(f"{base_dir}/officer_notes.json")

    if not score_data:
        return {
            "company_id": company_id,
            "narrative": "No score data available. Run /appraise/score first.",
            "decision": "NOT_SCORED",
            "key_drivers": [],
            "risk_mitigants": [],
            "indian_context_notes": [],
            "confidence_level": "LOW",
            "data_quality_score": 0,
        }

    # Gather financial data
    financial_data = {}
    for doc in parse_results.get("parsed_docs", []):
        financial_data.update(doc.get("financials", {}))

    # Data quality assessment
    dq = assess_data_quality(financial_data, research_data, gst_flags)

    # Build rich context for LLM
    user_content = f"""Company ID: {company_id}

=== SCORE RESULTS ===
Overall Score: {score_data.get('overall_score', 0)}/100
Decision: {score_data.get('decision', 'N/A')}
Decision Reason: {score_data.get('decision_reason', 'N/A')}
Character: {score_data.get('character_score', 0)}/100, Capacity: {score_data.get('capacity_score', 0)}/100
Capital: {score_data.get('capital_score', 0)}/100, Collateral: {score_data.get('collateral_score', 0)}/100
Conditions: {score_data.get('conditions_score', 0)}/100
Recommended Amount: {score_data.get('recommended_amount', 'N/A')}
Interest Rate: {score_data.get('interest_rate', 'N/A')}
DSCR: {score_data.get('dscr', 'N/A')}

=== DEDUCTION AUDIT TRAIL ===
{json.dumps(score_data.get('deductions', {}), indent=2)}

=== FINANCIAL RATIOS ===
{json.dumps(score_data.get('financial_ratios', {}), indent=2)}

=== RESEARCH FINDINGS ===
Promoter: {research_data.get('promoter_background', 'N/A')[:300]}
Litigation: {research_data.get('litigation_summary', 'N/A')[:300]}
Sector: {research_data.get('sector_outlook', 'N/A')[:300]}
MCA: {research_data.get('mca_compliance', 'N/A')[:200]}
RBI: {research_data.get('rbi_observations', 'N/A')[:200]}
GST Notes: {research_data.get('gst_compliance_notes', 'N/A')[:200]}
Early Warnings: {json.dumps(research_data.get('early_warning_signals', []))}
Positive Factors: {json.dumps(research_data.get('positive_factors', []))}
Overall Research Risk: {research_data.get('overall_research_risk', 'N/A')}

=== GST VALIDATION ===
{json.dumps(gst_flags, indent=2) if gst_flags else 'GST cross-validation not performed'}

=== OFFICER NOTES ===
{officer_notes.get('notes', 'No officer notes submitted') if officer_notes else 'None'}

=== DATA QUALITY ===
Score: {dq['score']}/100 | Missing: {', '.join(dq['missing_data']) if dq['missing_data'] else 'None'}

Generate the narrative walkthrough explaining this credit decision. Be specific and reference actual data points."""

    messages = [
        {"role": "system", "content": EXPLAIN_PROMPT},
        {"role": "user", "content": user_content},
    ]

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, _groq_stream, messages)

    # Parse response
    try:
        result = json.loads(raw.strip())
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except:
                result = {"narrative": raw, "key_drivers": [], "risk_mitigants": [], "indian_context_notes": [], "confidence_level": dq["confidence"]}
        else:
            result = {"narrative": raw, "key_drivers": [], "risk_mitigants": [], "indian_context_notes": [], "confidence_level": dq["confidence"]}

    return {
        "company_id": company_id,
        "narrative": result.get("narrative", "Explanation generation failed."),
        "decision": score_data.get("decision", "NOT_SCORED"),
        "key_drivers": result.get("key_drivers", []),
        "risk_mitigants": result.get("risk_mitigants", []),
        "indian_context_notes": result.get("indian_context_notes", []),
        "confidence_level": result.get("confidence_level", dq["confidence"]),
        "data_quality_score": dq["score"],
    }


# ─────────────────────────────────────────────
# WHAT-IF SCENARIO ANALYSIS
# ─────────────────────────────────────────────

WHATIF_PROMPT = """You are a credit advisor helping a borrower understand what they can improve.
Given the ORIGINAL score and the SCENARIO score, explain:
1. What changed and why
2. What specific actions the borrower could take to improve their creditworthiness
3. Indian banking context (CIBIL improvement, D/E reduction, DSCR targets)

Return ONLY valid JSON:
{{
  "changes_summary": ["List of specific changes and their impact on the score"],
  "recommendation": "2-3 paragraph narrative advising the borrower on improvement path"
}}"""


async def run_what_if(
    company_id: str,
    adjustments: dict,
    cibil_score: int = None,
    requested_amount: float = 0,
) -> dict:
    """Run scenario analysis — adjust inputs and see effect on score."""
    base_dir = f"uploads/{company_id}"
    parse_results = _load_json(f"{base_dir}/parse_results.json")
    research_data = _load_json(f"{base_dir}/research_results.json")
    gst_flags = _load_json(f"{base_dir}/gst_flags.json")
    original_score = _load_json(f"{base_dir}/score_results.json")

    if not original_score:
        return {
            "company_id": company_id,
            "original_score": 0,
            "scenario_score": 0,
            "original_decision": "NOT_SCORED",
            "scenario_decision": "NOT_SCORED",
            "score_delta": 0,
            "changes_summary": ["Run /appraise/score first"],
            "recommendation": "Score the company before running what-if analysis.",
        }

    # Build adjusted financial data
    financial_data = {}
    for doc in parse_results.get("parsed_docs", []):
        financial_data.update(doc.get("financials", {}))

    # Apply what-if adjustments
    adjusted_financials = {**financial_data, **adjustments}

    # If CIBIL score provided, add to research data for character scoring
    adjusted_research = {**research_data}
    if cibil_score is not None:
        adjusted_research["cibil_score"] = cibil_score

    # Run scorer with adjusted data
    scenario = calculate_five_cs_score(
        company_id=f"{company_id}_whatif",
        financial_data=adjusted_financials,
        research_data=adjusted_research,
        gst_flags=gst_flags,
        requested_amount=requested_amount,
    )

    orig_overall = original_score.get("overall_score", 0)
    scen_overall = scenario.get("overall_score", 0)
    delta = round(scen_overall - orig_overall, 1)

    # Use LLM to generate advice
    user_content = f"""Original Score: {orig_overall}/100 ({original_score.get('decision')})
Scenario Score: {scen_overall}/100 ({scenario.get('decision')})
Delta: {delta:+.1f}

Adjustments made: {json.dumps(adjustments)}
CIBIL Score: {cibil_score or 'Not provided'}

Original deductions: {json.dumps(original_score.get('deductions', {}))}
Scenario deductions: {json.dumps(scenario.get('deductions', {}))}

Original Ratios: {json.dumps({k: v.get('value') if isinstance(v, dict) else v for k, v in original_score.get('financial_ratios', {}).items()})}
Scenario Ratios: {json.dumps({k: v.get('value') if isinstance(v, dict) else v for k, v in scenario.get('financial_ratios', {}).items()})}"""

    messages = [
        {"role": "system", "content": WHATIF_PROMPT},
        {"role": "user", "content": user_content},
    ]

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, _groq_stream, messages)

    try:
        result = json.loads(raw.strip())
    except:
        import re
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        try:
            result = json.loads(match.group()) if match else {}
        except:
            result = {}

    # Clean up temp file
    whatif_path = f"uploads/{company_id}_whatif/score_results.json"
    if os.path.exists(whatif_path):
        os.remove(whatif_path)
    whatif_dir = f"uploads/{company_id}_whatif"
    if os.path.exists(whatif_dir):
        import shutil
        shutil.rmtree(whatif_dir, ignore_errors=True)

    return {
        "company_id": company_id,
        "original_score": orig_overall,
        "scenario_score": scen_overall,
        "original_decision": original_score.get("decision", "N/A"),
        "scenario_decision": scenario.get("decision", "N/A"),
        "score_delta": delta,
        "changes_summary": result.get("changes_summary", [f"Score changed by {delta:+.1f} points"]),
        "recommendation": result.get("recommendation", "Adjust financial parameters to see impact on score."),
    }
