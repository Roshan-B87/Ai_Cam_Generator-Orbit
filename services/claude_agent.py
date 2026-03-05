"""
Research Agent — Enhanced with MCA, Litigation, RBI
-----------------------------------------------------
1. Run 6 Tavily searches IN PARALLEL (was 4) — added MCA + RBI
2. Run 1 RAG search on company docs
3. Litigation keyword pattern matching for Indian courts
4. RBI regulatory rule matching
5. MCA compliance checks
6. Feed all results to Groq in ONE call to synthesise
"""

import json
import os
import re
import asyncio
from groq import Groq
from tavily import TavilyClient
from services.rag_service import search_documents

client = Groq()
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
MODEL  = "openai/gpt-oss-120b"


# ─────────────────────────────────────────────
# INDIAN LITIGATION KEYWORD PATTERNS
# ─────────────────────────────────────────────

LITIGATION_PATTERNS = {
    "nclt_ibc": {
        "keywords": ["nclt", "nclat", "ibc", "insolvency", "cirp", "resolution professional",
                      "corporate insolvency", "liquidation order", "moratorium"],
        "severity": "CRITICAL",
        "description": "NCLT/IBC insolvency proceedings"
    },
    "fraud_criminal": {
        "keywords": ["fraud", "cheating", "criminal case", "fir", "eow", "economic offence",
                      "money laundering", "pmla", "enforcement directorate", "ed raid",
                      "cbi case", "sfio investigation"],
        "severity": "CRITICAL",
        "description": "Criminal / fraud proceedings"
    },
    "sebi_action": {
        "keywords": ["sebi order", "sebi penalty", "sebi ban", "insider trading",
                      "market manipulation", "debarment", "show cause notice sebi"],
        "severity": "HIGH",
        "description": "SEBI regulatory action"
    },
    "rbi_action": {
        "keywords": ["rbi penalty", "rbi fine", "rbi direction", "rbi ban",
                      "wilful defaulter", "rbi circular", "prompt corrective action"],
        "severity": "HIGH",
        "description": "RBI regulatory action"
    },
    "tax_dispute": {
        "keywords": ["income tax demand", "gst demand", "tax evasion", "tax fraud",
                      "itat order", "customs duty evasion", "transfer pricing"],
        "severity": "MEDIUM",
        "description": "Tax / customs dispute"
    },
    "civil_litigation": {
        "keywords": ["civil suit", "arbitration", "damages claim", "breach of contract",
                      "recovery suit", "debt recovery tribunal", "drt", "securitisation"],
        "severity": "MEDIUM",
        "description": "Civil litigation / recovery"
    },
    "environmental": {
        "keywords": ["ngt order", "pollution control", "environmental clearance",
                      "closure order", "green tribunal"],
        "severity": "MEDIUM",
        "description": "Environmental / NGT issues"
    },
    "labor_dispute": {
        "keywords": ["labour court", "industrial dispute", "strike", "lockout",
                      "epfo default", "esi default", "wage arrears"],
        "severity": "LOW",
        "description": "Labour / employment dispute"
    },
}

# ─────────────────────────────────────────────
# RBI REGULATORY RULES (Indian context)
# ─────────────────────────────────────────────

RBI_REGULATORY_KEYWORDS = {
    "pca_framework": {
        "keywords": ["prompt corrective action", "pca framework", "pca trigger"],
        "risk": "CRITICAL",
        "description": "Bank under RBI Prompt Corrective Action — lending restricted"
    },
    "wilful_defaulter": {
        "keywords": ["wilful defaulter", "willful defaulter", "wilful default"],
        "risk": "CRITICAL",
        "description": "Classified as wilful defaulter by lenders"
    },
    "npa_classification": {
        "keywords": ["npa", "non-performing asset", "sub-standard", "doubtful asset", "loss asset"],
        "risk": "HIGH",
        "description": "NPA / asset quality classification issue"
    },
    "nbfc_regulation": {
        "keywords": ["nbfc regulation", "nbfc guidelines", "asset liability mismatch",
                      "nbfc liquidity", "scale based regulation"],
        "risk": "MEDIUM",
        "description": "NBFC-specific regulatory environment"
    },
    "priority_sector": {
        "keywords": ["priority sector", "psl target", "agriculture lending",
                      "msme classification", "mudra loan"],
        "risk": "LOW",
        "description": "Priority sector lending considerations"
    },
    "digital_lending": {
        "keywords": ["digital lending", "fldg", "first loss default guarantee",
                      "lending service provider", "lsp guidelines"],
        "risk": "MEDIUM",
        "description": "Digital lending regulatory framework"
    },
    "large_exposure": {
        "keywords": ["large exposure framework", "lef", "group exposure limit",
                      "single borrower limit", "concentration risk"],
        "risk": "MEDIUM",
        "description": "RBI large exposure / concentration norms"
    },
}

# ─────────────────────────────────────────────
# MCA COMPLIANCE KEYWORDS
# ─────────────────────────────────────────────

MCA_COMPLIANCE_KEYWORDS = {
    "strike_off": {
        "keywords": ["struck off", "strike off", "dormant company", "removed from register"],
        "severity": "CRITICAL"
    },
    "filing_default": {
        "keywords": ["non-filing", "annual return pending", "aoc-4 pending",
                      "mgt-7 pending", "overdue filing"],
        "severity": "HIGH"
    },
    "director_disqualification": {
        "keywords": ["director disqualified", "din deactivated", "section 164",
                      "dsc invalid", "director removed"],
        "severity": "HIGH"
    },
    "charge_issues": {
        "keywords": ["charge not registered", "charge satisfaction pending",
                      "pari passu violation", "second charge"],
        "severity": "MEDIUM"
    },
}


# ─────────────────────────────────────────────
# PATTERN MATCHING ENGINE
# ─────────────────────────────────────────────

def scan_litigation_patterns(text: str) -> list:
    """Scan text for Indian litigation patterns. Return list of findings."""
    text_lower = text.lower()
    findings = []
    for key, pattern in LITIGATION_PATTERNS.items():
        for kw in pattern["keywords"]:
            if kw in text_lower:
                findings.append({
                    "type": key,
                    "keyword": kw,
                    "severity": pattern["severity"],
                    "description": pattern["description"],
                })
                break
    return findings


def scan_rbi_patterns(text: str) -> list:
    """Scan text for RBI regulatory risk patterns."""
    text_lower = text.lower()
    findings = []
    for key, pattern in RBI_REGULATORY_KEYWORDS.items():
        for kw in pattern["keywords"]:
            if kw in text_lower:
                findings.append({
                    "type": key,
                    "keyword": kw,
                    "risk": pattern["risk"],
                    "description": pattern["description"],
                })
                break
    return findings


def scan_mca_patterns(text: str) -> list:
    """Scan text for MCA compliance issues."""
    text_lower = text.lower()
    findings = []
    for key, pattern in MCA_COMPLIANCE_KEYWORDS.items():
        for kw in pattern["keywords"]:
            if kw in text_lower:
                findings.append({
                    "type": key,
                    "keyword": kw,
                    "severity": pattern["severity"],
                })
                break
    return findings


# ─────────────────────────────────────────────
# GROQ HELPER
# ─────────────────────────────────────────────

def _groq_stream(messages: list) -> str:
    """Streaming call — collect full text."""
    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=1,
        max_completion_tokens=4096,
        top_p=1,
        reasoning_effort="medium",
        stream=True,
        stop=None,
    )
    text = ""
    for chunk in completion:
        text += chunk.choices[0].delta.content or ""
    return text


# ─────────────────────────────────────────────
# PARALLEL SEARCH FUNCTIONS (expanded)
# ─────────────────────────────────────────────

def _tavily_search(query: str, max_results: int = 3) -> str:
    """Single Tavily search — returns formatted string."""
    try:
        results = tavily.search(query=query, max_results=max_results)
        out = []
        for r in results.get("results", []):
            out.append(f"• {r.get('title','')}: {r.get('content','')[:300]}")
        return "\n".join(out) or "No results found."
    except Exception as e:
        return f"Search error: {e}"


async def _parallel_research(company_name: str, company_id: str, cin: str = None) -> dict:
    """
    Run all searches in parallel — now includes MCA and RBI-specific queries.
    """
    loop = asyncio.get_event_loop()

    searches = {
        "promoter_news":     f"{company_name} promoter director fraud news India 2024 2025",
        "sector_outlook":    f"{company_name} industry sector outlook India RBI regulation 2024 2025",
        "litigation":        f"{company_name} NCLT IBC court case litigation India 2024",
        "financial_health":  f"{company_name} credit rating financial performance revenue EBITDA",
        "mca_compliance":    f"{company_name} MCA ROC filing compliance director disqualification India",
        "rbi_regulatory":    f"{company_name} RBI regulatory risk NPA wilful defaulter penalty India 2024",
    }

    async def run_search(key, query):
        result = await loop.run_in_executor(None, _tavily_search, query, 3)
        return key, result

    async def run_rag(query):
        try:
            result = await loop.run_in_executor(
                None, search_documents, company_id,
                f"contingent liabilities related party transactions revenue EBITDA debt promoter"
            )
            return "doc_insights", result.get("answer", "No document data found.")
        except:
            return "doc_insights", "No documents indexed."

    tasks = [run_search(k, q) for k, q in searches.items()]
    tasks.append(run_rag(company_name))

    results = await asyncio.gather(*tasks)
    return dict(results)


# ─────────────────────────────────────────────
# ENHANCED SYNTHESIS PROMPT
# ─────────────────────────────────────────────

SYNTHESIS_PROMPT = """You are a senior Indian credit analyst at a leading bank. Based on the research data below, produce a detailed credit appraisal research report.

You MUST consider:
1. NCLT/IBC proceedings — automatic red flag
2. Wilful defaulter status — automatic red flag
3. GSTR-2A/2B vs GSTR-3B discrepancies — ITC fraud
4. MCA compliance — filing status, director disqualifications
5. RBI regulatory actions — penalties, PCA framework
6. CIBIL/credit bureau data — payment defaults
7. Sector-specific RBI regulations (NBFC, priority sector)
8. Related party transactions — arm's length compliance

Return ONLY valid JSON — no markdown, no explanation:
{{
  "promoter_background": "detailed promoter integrity assessment — track record, group companies, past defaults",
  "sector_outlook": "industry trends, headwinds, tailwinds, RBI/SEBI regulatory environment, macro factors",
  "regulatory_risks": "specific RBI, SEBI, MCA regulatory risks with citations",
  "litigation_summary": "summary of legal cases — NCLT, IBC, criminal, civil, tax disputes",
  "mca_compliance": "MCA filing status, director DIN status, charge registration, ROC compliance",
  "document_insights": "key findings from uploaded company documents",
  "rbi_observations": "RBI-specific risks — NPA concerns, wilful defaulter, PCA, large exposure",
  "gst_compliance_notes": "GST filing regularity, GSTR-2B vs 3B observations if available",
  "early_warning_signals": ["list of specific red flags — be concrete"],
  "positive_factors": ["list of positive indicators — be specific"],
  "litigation_flags": ["specific litigation items found"],
  "overall_research_risk": "LOW or MEDIUM or HIGH",
  "research_summary": "3-4 sentence executive summary for credit committee"
}}"""


# ─────────────────────────────────────────────
# MAIN RESEARCH AGENT
# ─────────────────────────────────────────────

async def run_research_agent(
    company_id: str,
    company_name: str,
    cin: str = None,
    gstin: str = None
) -> dict:
    """Full research: parallel searches → pattern matching → synthesis."""
    try:
        return await asyncio.wait_for(
            _fast_research(company_id, company_name, cin, gstin),
            timeout=90.0
        )
    except asyncio.TimeoutError:
        print(f"[Agent] Timeout for {company_id}")
        return _timeout_fallback(company_id, company_name)
    except Exception as e:
        print(f"[Agent] Error: {e}")
        return _timeout_fallback(company_id, company_name)


async def _fast_research(
    company_id: str,
    company_name: str,
    cin: str = None,
    gstin: str = None
) -> dict:

    print(f"[Agent] Starting enhanced parallel research for {company_name}...")

    # Step 1: Run all searches in parallel
    search_results = await _parallel_research(company_name, company_id, cin)
    print(f"[Agent] All {len(search_results)} searches complete.")

    # Step 2: Run litigation, RBI, and MCA pattern matching
    all_text = " ".join(search_results.values())
    litigation_findings = scan_litigation_patterns(all_text)
    rbi_findings        = scan_rbi_patterns(all_text)
    mca_findings        = scan_mca_patterns(all_text)

    print(f"[Agent] Pattern scan: {len(litigation_findings)} litigation, {len(rbi_findings)} RBI, {len(mca_findings)} MCA findings")

    # Step 3: Single Groq call to synthesise everything
    user_content = f"""Company: {company_name}
CIN: {cin or 'N/A'} | GSTIN: {gstin or 'N/A'}

=== PROMOTER & NEWS RESEARCH ===
{search_results.get('promoter_news', 'No data')}

=== SECTOR & REGULATORY OUTLOOK ===
{search_results.get('sector_outlook', 'No data')}

=== LITIGATION & LEGAL ===
{search_results.get('litigation', 'No data')}

=== FINANCIAL HEALTH (Web) ===
{search_results.get('financial_health', 'No data')}

=== MCA COMPLIANCE RESEARCH ===
{search_results.get('mca_compliance', 'No data')}

=== RBI REGULATORY CHECKS ===
{search_results.get('rbi_regulatory', 'No data')}

=== DOCUMENT INSIGHTS (Uploaded Docs) ===
{search_results.get('doc_insights', 'No data')}

=== AUTOMATED PATTERN SCAN RESULTS ===
Litigation Patterns Found: {json.dumps(litigation_findings, indent=2) if litigation_findings else 'None'}
RBI Risk Patterns Found: {json.dumps(rbi_findings, indent=2) if rbi_findings else 'None'}
MCA Compliance Issues: {json.dumps(mca_findings, indent=2) if mca_findings else 'None'}

Based on ALL the above research, produce the JSON credit research report. Pay special attention to the automated pattern scan results."""

    messages = [
        {"role": "system", "content": SYNTHESIS_PROMPT},
        {"role": "user",   "content": user_content},
    ]

    loop = asyncio.get_event_loop()
    final_text = await loop.run_in_executor(None, _groq_stream, messages)

    print(f"[Agent] Synthesis complete for {company_name}")
    return _parse_and_format(company_id, final_text, litigation_findings, rbi_findings, mca_findings)


# ─────────────────────────────────────────────
# PARSING & FORMATTING
# ─────────────────────────────────────────────

def _parse_and_format(company_id: str, text: str, lit_findings: list, rbi_findings: list, mca_findings: list) -> dict:
    """Parse JSON from Groq response and enrich with pattern scan data."""
    try:
        report = json.loads(text.strip())
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                report = json.loads(match.group())
            except:
                report = _empty_report()
        else:
            report = _empty_report()

    return _format_result(company_id, report, lit_findings, rbi_findings, mca_findings)


def _empty_report() -> dict:
    return {
        "promoter_background": "Could not retrieve sufficient data",
        "sector_outlook": "Could not retrieve sufficient data",
        "regulatory_risks": "Manual review recommended",
        "litigation_summary": "No data retrieved",
        "mca_compliance": "No data retrieved",
        "document_insights": "Check uploaded documents manually",
        "rbi_observations": "Manual review recommended",
        "gst_compliance_notes": "Check GST filings manually",
        "early_warning_signals": [],
        "positive_factors": [],
        "litigation_flags": [],
        "overall_research_risk": "MEDIUM",
        "research_summary": "Research incomplete. Please retry or review manually."
    }


def _timeout_fallback(company_id: str, company_name: str) -> dict:
    return {
        "company_id": company_id,
        "promoter_background": "Research timed out",
        "sector_outlook": "Research timed out — retry for full analysis",
        "regulatory_risks": "Manual review recommended",
        "litigation_summary": "No data",
        "mca_compliance": "No data",
        "document_insights": "No data",
        "rbi_observations": "Manual review recommended",
        "gst_compliance_notes": "No data",
        "news_findings": [],
        "litigation_flags": [],
        "early_warning_signals": ["Research timed out — results incomplete"],
        "positive_factors": [],
        "mca_data": {},
        "rbi_findings": [],
        "mca_findings": [],
        "litigation_patterns": [],
        "overall_research_risk": "MEDIUM",
        "research_summary": f"Research for {company_name} timed out. Please retry.",
        "status": "timeout"
    }


def _format_result(company_id: str, report: dict, lit_findings: list, rbi_findings: list, mca_findings: list) -> dict:
    signals   = report.get("early_warning_signals", [])
    lit_text  = report.get("litigation_summary", "")
    lit_flags = list(report.get("litigation_flags", signals))

    # Augment with pattern scan results
    if "nclt" in lit_text.lower() or "ibc" in lit_text.lower():
        lit_flags.append("NCLT/IBC proceedings detected")

    # Add critical litigation findings from pattern scan
    for lf in lit_findings:
        flag = f"[{lf['severity']}] {lf['description']} (keyword: '{lf['keyword']}')"
        if flag not in lit_flags:
            lit_flags.append(flag)

    # Add pattern-scanned items to early warnings if critical/high
    for lf in lit_findings:
        if lf["severity"] in ("CRITICAL", "HIGH"):
            sig = f"Litigation: {lf['description']}"
            if sig not in signals:
                signals.append(sig)

    for rf in rbi_findings:
        if rf["risk"] in ("CRITICAL", "HIGH"):
            sig = f"RBI: {rf['description']}"
            if sig not in signals:
                signals.append(sig)

    for mf in mca_findings:
        if mf["severity"] in ("CRITICAL", "HIGH"):
            sig = f"MCA: Compliance issue — {mf['type']}"
            if sig not in signals:
                signals.append(sig)

    # Determine overall risk with enhanced logic
    overall_risk = report.get("overall_research_risk", "MEDIUM")
    critical_count = sum(1 for lf in lit_findings if lf["severity"] == "CRITICAL")
    critical_count += sum(1 for rf in rbi_findings if rf["risk"] == "CRITICAL")
    if critical_count >= 1:
        overall_risk = "HIGH"
    elif len(signals) >= 4:
        overall_risk = "HIGH"
    elif len(signals) >= 2 and overall_risk == "LOW":
        overall_risk = "MEDIUM"

    return {
        "company_id":             company_id,
        "promoter_background":    report.get("promoter_background", ""),
        "sector_outlook":         report.get("sector_outlook", ""),
        "regulatory_risks":       report.get("regulatory_risks", ""),
        "litigation_summary":     lit_text,
        "mca_compliance":         report.get("mca_compliance", ""),
        "document_insights":      report.get("document_insights", ""),
        "rbi_observations":       report.get("rbi_observations", ""),
        "gst_compliance_notes":   report.get("gst_compliance_notes", ""),
        "news_findings":          [report.get("promoter_background", ""), report.get("sector_outlook", "")],
        "litigation_flags":       lit_flags,
        "early_warning_signals":  signals,
        "positive_factors":       report.get("positive_factors", []),
        "mca_data":               {"summary": report.get("mca_compliance", "")},
        "litigation_patterns":    lit_findings,
        "rbi_findings":           rbi_findings,
        "mca_findings":           mca_findings,
        "overall_research_risk":  overall_risk,
        "research_summary":       report.get("research_summary", ""),
        "status": "completed"
    }


# ─────────────────────────────────────────────
# OFFICER NOTES ADJUSTER
# ─────────────────────────────────────────────

async def adjust_score_with_notes(
    company_id: str,
    officer_notes: str,
    base_scores: dict
) -> dict:
    prompt = f"""Senior credit analyst. Adjust scores based on field observations.

Scores: Character={base_scores.get('character_score',50)}, Capacity={base_scores.get('capacity_score',50)}, Capital={base_scores.get('capital_score',50)}, Collateral={base_scores.get('collateral_score',50)}, Conditions={base_scores.get('conditions_score',50)}

Notes: {officer_notes}

Return ONLY JSON:
{{"character_adjustment":0,"capacity_adjustment":0,"capital_adjustment":0,"collateral_adjustment":0,"conditions_adjustment":0,"reasoning":"..."}}

Rules: -25 to +10 range. "40% capacity"→-15. "Evasive"→-12. "Strong orders"→+8."""

    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(None, _groq_stream, [{"role": "user", "content": prompt}])

    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        adj = json.loads(match.group() if match else text)
    except:
        adj = {k: 0 for k in ["character_adjustment", "capacity_adjustment", "capital_adjustment", "collateral_adjustment", "conditions_adjustment"]}
        adj["reasoning"] = "Could not parse"

    return {
        "character_adjustment":  adj.get("character_adjustment", 0),
        "capacity_adjustment":   adj.get("capacity_adjustment", 0),
        "capital_adjustment":    adj.get("capital_adjustment", 0),
        "collateral_adjustment": adj.get("collateral_adjustment", 0),
        "conditions_adjustment": adj.get("conditions_adjustment", 0),
        "reasoning":             adj.get("reasoning", ""),
    }
