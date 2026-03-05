# Intelli-Credit — AI-Powered Credit Decisioning Engine 🏦

An intelligent corporate credit appraisal platform built for Indian banking context, featuring transparent Five Cs scoring, AI explainability, MCA registry integration, advanced table extraction, and comprehensive regulatory compliance checks.

## 🎯 Key Features

### 1. Data Ingestion (Extraction Accuracy)
- **Multi-format PDF parsing** — PyMuPDF for text-based PDFs, Tesseract OCR fallback for scanned documents
- **Advanced Table Extraction** — Three-pass strategy using pdfplumber:
  - **Strict mode** — Line-based detection for well-formatted bordered tables
  - **Relaxed mode** — Text-alignment detection for borderless / partial-border tables
  - **Word reconstruction** — Rebuilds tables from individual word positions for truly complex layouts
- **Multi-page table merging** — Detects continuation tables across page breaks via header matching
- **Table classification** — Auto-classifies as Balance Sheet, P&L, Cash Flow, Notes, Ratios, Shareholding, GST Summary
- **Structured financial conversion** — Parses Indian number formats (₹ crores, lakhs, negative parentheses) into structured dicts
- **15+ Indian financial regex patterns** — Revenue, EBITDA, Net Worth, Current Assets/Liabilities, Trade Receivables, CIBIL Score, Collateral Value, etc.
- **Table → Regex fallback enrichment** — If regex misses a figure, table-extracted data fills the gap automatically
- **Section detection** — Automatic identification of Balance Sheet, P&L, Cash Flow, Auditor Report, Related Party sections
- **Databricks Delta Lake connector** — Simulated structured data ingestion from Unity Catalog

### 2. Research Agent (Research Depth)
- **6 parallel Tavily web searches** — Promoter news, sector outlook, litigation, financial health, MCA compliance, RBI regulatory
- **Pattern matching engines** — Litigation (NCLT/IBC, fraud, SEBI, tax), RBI (PCA, wilful defaulter, NPA), MCA (strike-off, director disqualification)
- **RAG-powered document QA** — FAISS vector store with HuggingFace embeddings for uploaded documents
- **Officer notes integration** — Qualitative observations influence scoring

### 3. MCA Registry Integration (Live API)
- **data.gov.in Open API** — Real-time access to Ministry of Corporate Affairs datasets
- **CSR Spending Data** — Company-wise Corporate Social Responsibility funds spent (2018-19 to 2020-21)
- **Company Master Data** — Registration status, authorized/paid-up capital, incorporation date, activity description
- **Charge Details** — Registered mortgages and loan encumbrances from MCA registry
- **Director Details** — Promoter/director information for Character assessment
- **Comprehensive Lookup** — Parallel fetch of all 4 datasets with automated risk flag generation
- **MCA Risk Flags** — Inactive company status, low paid-up vs authorized capital, CSR non-compliance, excessive charges

### 4. Credit Scoring (Indian Context Sensitivity)
- **Five Cs weighted scorecard** — Character (25%), Capacity (30%), Capital (20%), Collateral (15%), Conditions (10%)
- **14 Indian financial ratios** — Current Ratio, Quick Ratio, D/E, DSCR, Interest Coverage, ROE, ROA, ROCE, EBITDA Margin, DSO, Asset Turnover
- **GST cross-validation** — GSTR-2A/2B vs GSTR-3B mismatch detection for ITC fraud
- **CIBIL Commercial Score integration** — Tiered scoring based on 300-900 range
- **Sector benchmarks** — Manufacturing, IT Services, Infrastructure, NBFC, Pharma, FMCG, Real Estate

### 5. Explainability (AI Walkthrough)
- **AI narrative generation** — LLM produces prose explanation referencing specific data points
- **Deduction audit trail** — Every score adjustment is logged with reason
- **What-If scenario analysis** — Adjust financials and see score impact
- **Data quality scoring** — 0-100% completeness assessment with confidence level
- **Indian regulatory context notes** — RBI, MCA, SEBI, GST references

### 6. CAM Generation
- **Automated Credit Appraisal Memorandum** — Word and PDF export
- **Structured sections** — Executive Summary, Company Profile, Financial Analysis, Risk Assessment, Recommendation

## 🚀 Quick Start

### Backend
```bash
cd intelli-credit
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Add API keys to .env:
# GROQ_API_KEY=your_groq_key
# TAVILY_API_KEY=your_tavily_key

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Backend API docs at http://localhost:8000/docs

## 📁 Project Structure

```
intelli-credit/
├── main.py                    # FastAPI app + CORS
├── requirements.txt
├── .env                       # API keys (GROQ, TAVILY)
│
├── routers/
│   ├── ingest.py              # POST /ingest/upload, GET /ingest/tables/{id}
│   ├── research.py            # POST /research/run/{id}
│   ├── appraise.py            # POST /appraise/score, /explain, /whatif
│   ├── cam.py                 # POST /cam/generate/{id}
│   ├── mca.py                 # GET /mca/csr, /company, /charges, /directors, /lookup
│   └── databricks.py          # POST /databricks/ingest
│
├── services/
│   ├── pdf_parser.py          # OCR + regex + pdfplumber table extraction
│   ├── mca_service.py         # MCA data.gov.in API integration
│   ├── gst_validator.py       # GSTR-2A/2B vs 3B cross-validation
│   ├── rag_service.py         # FAISS + HuggingFace embeddings
│   ├── claude_agent.py        # Parallel research + pattern matching
│   ├── scorer.py              # Five Cs + Indian ratios
│   ├── explainer.py           # AI narrative + what-if
│   └── cam_generator.py       # Word/PDF report builder
│
├── models/
│   ├── request_models.py      # Pydantic input schemas
│   └── response_models.py     # Pydantic output schemas
│
├── frontend/                  # React + Vite + Tailwind
│   └── src/
│       ├── components/
│       │   ├── ApplicationFlow.jsx   # Main 4-step wizard
│       │   └── MCAPanel.jsx          # MCA Registry data panel
│       └── api/client.js             # Axios API client
│
└── uploads/{company_id}/      # Per-company data store
    ├── parse_results.json
    ├── research_results.json
    ├── score_results.json
    ├── mca_data.json
    └── faiss_index/
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest/upload` | Upload company PDFs (annual reports, financials) |
| GET | `/ingest/status/{id}` | Check parsing status |
| GET | `/ingest/tables/{id}` | Get extracted tables & structured financials |
| GET | `/ingest/financials/{id}` | Get regex-extracted financial figures |
| POST | `/research/run/{id}` | Trigger AI research agent |
| POST | `/research/officer-notes` | Add qualitative observations |
| GET | `/research/results/{id}` | Get research findings |
| POST | `/appraise/score` | Run Five Cs scoring engine |
| GET | `/appraise/score/{id}` | Retrieve computed score |
| POST | `/appraise/explain/{id}` | **AI narrative walkthrough** |
| POST | `/appraise/whatif` | **Scenario analysis** |
| POST | `/cam/generate/{id}` | Generate CAM report |
| GET | `/cam/download/{id}/{fmt}` | Download CAM (docx/pdf) |
| GET | `/mca/csr` | **MCA CSR spending data (2018-21)** |
| GET | `/mca/company` | **MCA company master data** |
| GET | `/mca/charges` | **MCA charge/mortgage details** |
| GET | `/mca/directors` | **MCA director/promoter data** |
| GET | `/mca/lookup/{id}` | **Comprehensive MCA lookup (all 4 parallel)** |
| POST | `/databricks/ingest` | Ingest from Databricks Delta Lake |

## 🇮🇳 Indian Context Features

- **MCA Registry**: Live data.gov.in API integration — company status, CSR compliance, charges, directors
- **GST Compliance**: GSTR-2A (real-time auto-populated) vs GSTR-2B (monthly static) vs GSTR-3B (self-declared) mismatch detection
- **CIBIL Commercial Score**: CMR rank integration with tiered scoring
- **Regulatory Patterns**: NCLT/IBC, RBI PCA framework, wilful defaulter, SEBI actions, MCA compliance
- **Financial Terminology**: Trade receivables/sundry debtors, shareholder's fund, material consumed, finance cost
- **Sector Benchmarks**: Industry-specific acceptable D/E ratios, current ratios, DSCR thresholds
- **Table Extraction**: Handles Indian annual report formats — merged cells, borderless tables, multi-page continuations

## 📊 Evaluation Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| **Extraction Accuracy** | 15+ regex patterns, Tesseract OCR, **3-pass table extraction (pdfplumber)**, section detection, table → financial enrichment |
| **Research Depth** | 6 parallel web searches, MCA/RBI/SEBI pattern matching, RAG, **live MCA API** |
| **Explainability** | AI narrative, deduction audit trail, what-if analysis |
| **Indian Context** | GSTR-2A/2B/3B, CIBIL, sector benchmarks, RBI norms, **MCA registry (CSR, charges, directors)** |

## 🛠 Tech Stack

- **Backend**: FastAPI, Python 3.11+
- **LLM**: Groq (openai/gpt-oss-120b)
- **Search**: Tavily API
- **Embeddings**: HuggingFace all-MiniLM-L6-v2
- **Vector Store**: FAISS
- **PDF**: PyMuPDF + Tesseract OCR + **pdfplumber (table extraction)**
- **MCA API**: data.gov.in Open API (httpx async client)
- **Frontend**: React + Vite + Tailwind CSS + Recharts

## 📝 License

MIT
