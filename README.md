# Intelli-Credit — Enterprise Credit Underwriting Automation Engine 🏦

**Version 2.0** — End-to-end intelligent corporate credit appraisal platform built for Indian banking context, featuring a 4-stage wizard workflow, transparent Five Cs scoring, AI explainability, SWOT analysis, MCA registry integration, human-in-the-loop document classification, and comprehensive regulatory compliance checks.

---

## 🎯 Overview

Intelli-Credit automates the entire credit underwriting lifecycle through four intelligent stages:

| Stage | Name | Description |
|-------|------|-------------|
| **1** | Entity Onboarding | Multi-step form capturing company details, promoter info, loan requirements |
| **2** | Intelligent Data Ingestion | Upload 5 document types with auto-classification & human-in-the-loop approval |
| **3** | Extraction & Schema Mapping | Review extracted data, configure schemas, inline editing |
| **4** | Analysis & Report | Secondary research, SWOT, Five Cs scoring, explainable AI, downloadable report |

---

## 🚀 Key Features

### Stage 1: Entity Onboarding
- **4-step guided form** — Entity Details → Promoter & Rating → Loan Details → Review & Submit
- **20+ industry sectors** — Banking, NBFC, Manufacturing, IT, Pharma, Infrastructure, Real Estate, etc.
- **11 loan types** — Term Loan, Working Capital, Cash Credit, LC, BG, Project Finance, etc.
- **10 collateral types** — Real Estate, Fixed Deposits, Inventory, Equipment, etc.
- **Auto-validation** — Field-level validation before proceeding to next step
- **Persistent storage** — Entity data saved and retrievable via API

### Stage 2: Intelligent Data Ingestion
- **5 document types** — ALM, Shareholding Pattern, Borrowing Profile, Annual Reports, Portfolio
- **Auto-classification** — AI classifies uploaded documents by filename + content patterns
- **Confidence scoring** — Each classification includes confidence percentage
- **Human-in-the-loop** — Approve, deny, or override AI classifications before processing
- **Color-coded upload slots** — Visual distinction for each document type
- **Parallel processing** — Documents indexed into FAISS vector store for RAG

### Stage 3: Extraction & Schema Mapping
- **Dynamic schema editor** — Add/remove extraction fields per document type
- **Default schemas** — Pre-configured fields for ALM, Shareholding, Borrowing, Annual Report, Portfolio
- **Inline editing** — Click any extracted value to edit directly in the UI
- **Table extraction preview** — View all tables extracted from each document
- **Schema persistence** — Custom schemas saved per company per document type

### Stage 4: Analysis & Report
- **Secondary Research Agent** — 6 parallel web searches (Tavily): promoter intel, sector outlook, litigation, MCA compliance, RBI regulatory, financial news
- **SWOT Analysis** — AI-generated strengths, weaknesses, opportunities, threats with triangulation across financial data, research findings, and scoring
- **Five Cs Credit Scoring** — Character (25%), Capacity (30%), Capital (20%), Collateral (15%), Conditions (10%)
- **14 Indian financial ratios** — Current Ratio, Quick Ratio, D/E, DSCR, Interest Coverage, ROE, ROA, ROCE, EBITDA Margin, DSO, Asset Turnover
- **Explainable AI** — LLM narrative walkthrough with key decision drivers and Indian regulatory context
- **What-If Simulator** — Adjust revenue, EBITDA, net worth, collateral to see score impact
- **Final Report Generation** — Downloadable CAM in PDF or DOCX format

---

## 📋 Detailed Feature Breakdown

### Data Ingestion (Extraction Accuracy)
- **Multi-format PDF parsing** — PyMuPDF for text-based PDFs, Tesseract OCR fallback for scanned documents
- **Advanced Table Extraction** — Three-pass strategy using pdfplumber:
  - **Strict mode** — Line-based detection for well-formatted bordered tables
  - **Relaxed mode** — Text-alignment detection for borderless / partial-border tables
  - **Word reconstruction** — Rebuilds tables from word positions for complex layouts
- **Multi-page table merging** — Detects continuation tables across page breaks via header matching
- **Table classification** — Auto-classifies as Balance Sheet, P&L, Cash Flow, Notes, Ratios, Shareholding, GST Summary
- **15+ Indian financial regex patterns** — Revenue, EBITDA, Net Worth, Current Assets/Liabilities, Trade Receivables, CIBIL Score, Collateral Value
- **Databricks Delta Lake connector** — Simulated structured data ingestion from Unity Catalog

### Research Agent (Research Depth)
- **6 parallel Tavily web searches** — Promoter news, sector outlook, litigation, financial health, MCA compliance, RBI regulatory
- **Pattern matching engines** — Litigation (NCLT/IBC, fraud, SEBI, tax), RBI (PCA, wilful defaulter, NPA), MCA (strike-off, director disqualification)
- **RAG-powered document QA** — FAISS vector store with HuggingFace embeddings
- **Officer notes integration** — Qualitative observations influence scoring

### MCA Registry Integration (Live API)
- **data.gov.in Open API** — Real-time Ministry of Corporate Affairs datasets
- **CSR Spending Data** — Company-wise Corporate Social Responsibility funds (2018-21)
- **Company Master Data** — Registration status, authorized/paid-up capital, incorporation date
- **Charge Details** — Registered mortgages and loan encumbrances
- **Director Details** — Promoter/director information for Character assessment
- **MCA Risk Flags** — Inactive status, low capital, CSR non-compliance, excessive charges

### Credit Scoring (Indian Context Sensitivity)
- **CIBIL Commercial Score integration** — Tiered scoring based on 300-900 range
- **GST cross-validation** — GSTR-2A/2B vs GSTR-3B mismatch detection for ITC fraud
- **Sector benchmarks** — Manufacturing, IT Services, Infrastructure, NBFC, Pharma, FMCG, Real Estate

### Explainability (AI Walkthrough)
- **AI narrative generation** — LLM produces prose explanation referencing specific data points
- **Deduction audit trail** — Every score adjustment logged with reason
- **What-If scenario analysis** — Adjust financials and see score impact
- **Data quality scoring** — 0-100% completeness assessment with confidence level
- **Indian regulatory context notes** — RBI, MCA, SEBI, GST references

### SWOT Analysis (New in v2.0)
- **Multi-source triangulation** — Combines financial data, research findings, and scoring results
- **Automated insights** — AI identifies strengths from high scores, weaknesses from deductions
- **Market opportunities** — Derived from sector outlook and positive research signals
- **Threat detection** — Early warning signals, litigation flags, regulatory risks
- **Executive summary** — AI-generated narrative summarizing the SWOT quadrants

### CAM Generation
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
├── main.py                    # FastAPI app v2.0 + CORS
├── requirements.txt
├── .env                       # API keys (GROQ, TAVILY)
│
├── routers/
│   ├── onboarding.py          # POST /onboarding/create, GET/PUT /onboarding/entity/{id}
│   ├── ingest.py              # Upload, classification, schema, extraction endpoints
│   ├── research.py            # POST /research/run/{id}
│   ├── appraise.py            # Score, explain, whatif, SWOT endpoints
│   ├── cam.py                 # POST /cam/generate/{id}
│   ├── mca.py                 # GET /mca/csr, /company, /charges, /directors, /lookup
│   └── databricks.py          # POST /databricks/ingest
│
├── services/
│   ├── pdf_parser.py          # OCR + regex + pdfplumber table extraction
│   ├── swot_service.py        # SWOT analysis generation (NEW)
│   ├── mca_service.py         # MCA data.gov.in API integration
│   ├── gst_validator.py       # GSTR-2A/2B vs 3B cross-validation
│   ├── rag_service.py         # FAISS + HuggingFace embeddings
│   ├── claude_agent.py        # Parallel research + pattern matching
│   ├── scorer.py              # Five Cs + Indian ratios
│   ├── explainer.py           # AI narrative + what-if
│   └── cam_generator.py       # Word/PDF report builder
│
├── models/
│   ├── request_models.py      # Pydantic input schemas (EntityOnboarding, Classification, Schema)
│   └── response_models.py     # Pydantic output schemas (SWOT, Extraction, etc.)
│
├── frontend/                  # React 19 + Vite 7 + Tailwind CSS 4
│   └── src/
│       ├── App.jsx            # Root router
│       ├── api/client.js      # Axios API client (all endpoints)
│       └── components/
│           ├── ApplicationFlow.jsx   # 4-stage wizard orchestrator
│           ├── EntityOnboarding.jsx  # Stage 1: Multi-step entity form
│           ├── DataIngestion.jsx     # Stage 2: Upload + classification
│           ├── ExtractionReview.jsx  # Stage 3: Schema + inline editing
│           ├── AnalysisReport.jsx    # Stage 4: Research + SWOT + Score + Report
│           ├── MCAPanel.jsx          # MCA Registry data panel
│           ├── Dashboard.jsx         # Application list
│           ├── LandingPage.jsx       # Marketing landing page
│           └── Sidebar.jsx           # Navigation
│
└── uploads/{company_id}/      # Per-company data store
    ├── entity_onboarding.json # Stage 1 entity data
    ├── classifications.json   # Stage 2 classification results
    ├── parse_results.json     # Extracted text + financials
    ├── research_results.json  # Research agent findings
    ├── score_results.json     # Five Cs score + ratios
    ├── swot_analysis.json     # SWOT quadrants
    ├── mca_data.json          # MCA registry data
    └── faiss_index/           # Vector embeddings
```

## 🔌 API Endpoints

### Entity Onboarding (Stage 1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/onboarding/create` | Create new entity with company, promoter, loan details |
| GET | `/onboarding/entity/{id}` | Retrieve entity onboarding data |
| PUT | `/onboarding/entity/{id}` | Update entity data |

### Data Ingestion (Stage 2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingest/upload` | Upload PDFs (accepts company_id for association) |
| GET | `/ingest/status/{id}` | Check parsing status |
| GET | `/ingest/classifications/{id}` | Get auto-classification results |
| POST | `/ingest/classifications/approve` | Approve/override classifications |

### Extraction & Schema (Stage 3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ingest/schema/{id}/{doctype}` | Get schema for document type |
| POST | `/ingest/schema/configure` | Configure custom schema fields |
| GET | `/ingest/extraction/{id}` | Get all extraction results |
| PUT | `/ingest/extraction/{id}/edit` | Edit extracted values |
| GET | `/ingest/tables/{id}` | Get extracted tables |

### Analysis & Report (Stage 4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/research/run/{id}` | Trigger AI research agent |
| GET | `/research/results/{id}` | Get research findings |
| POST | `/research/officer-notes` | Add qualitative observations |
| POST | `/appraise/score` | Run Five Cs scoring engine |
| GET | `/appraise/score/{id}` | Retrieve computed score |
| POST | `/appraise/swot/{id}` | **Generate SWOT analysis** |
| POST | `/appraise/explain/{id}` | AI narrative walkthrough |
| POST | `/appraise/whatif` | Scenario analysis |
| POST | `/cam/generate/{id}` | Generate CAM report |
| GET | `/cam/download/{id}/{fmt}` | Download CAM (docx/pdf) |

### MCA Registry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mca/csr` | MCA CSR spending data (2018-21) |
| GET | `/mca/company` | MCA company master data |
| GET | `/mca/charges` | MCA charge/mortgage details |
| GET | `/mca/directors` | MCA director/promoter data |
| GET | `/mca/lookup/{id}` | Comprehensive MCA lookup (all 4 parallel) |

### Databricks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/databricks/ingest` | Ingest from Databricks Delta Lake |

## 🇮🇳 Indian Context Features

- **MCA Registry**: Live data.gov.in API — company status, CSR compliance, charges, directors
- **GST Compliance**: GSTR-2A/2B vs GSTR-3B mismatch detection for ITC fraud
- **CIBIL Commercial Score**: CMR rank integration with tiered scoring (300-900)
- **Regulatory Patterns**: NCLT/IBC, RBI PCA framework, wilful defaulter, SEBI actions, MCA compliance
- **Financial Terminology**: Trade receivables/sundry debtors, shareholder's fund, material consumed, finance cost
- **Sector Benchmarks**: Industry-specific acceptable D/E ratios, current ratios, DSCR thresholds
- **Table Extraction**: Handles Indian annual report formats — merged cells, borderless tables, multi-page continuations
- **Document Types**: ALM, Shareholding Pattern, Borrowing Profile, Annual Reports, Portfolio Cuts

## 📊 Evaluation Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| **Extraction Accuracy** | 15+ regex patterns, Tesseract OCR, 3-pass table extraction (pdfplumber), auto-classification with confidence scoring, human-in-the-loop approval |
| **Research Depth** | 6 parallel web searches, MCA/RBI/SEBI pattern matching, RAG, live MCA API, SWOT triangulation |
| **Explainability** | AI narrative, deduction audit trail, what-if analysis, SWOT analysis, key decision drivers |
| **Indian Context** | GSTR-2A/2B/3B, CIBIL, sector benchmarks, RBI norms, MCA registry (CSR, charges, directors), 20+ Indian sectors |

## 🛠 Tech Stack

- **Backend**: FastAPI, Python 3.11+
- **LLM**: Groq (llama3-70b-8192)
- **Search**: Tavily API
- **Embeddings**: HuggingFace all-MiniLM-L6-v2
- **Vector Store**: FAISS
- **PDF**: PyMuPDF + Tesseract OCR + pdfplumber (table extraction)
- **MCA API**: data.gov.in Open API (httpx async client)
- **Frontend**: React 19.2 + Vite 7.3 + Tailwind CSS 4.2 + Recharts 3.7 + Lucide Icons
- **State**: React hooks with per-stage data flow

## 🖥️ Screenshots

### Stage 1: Entity Onboarding
Multi-step form with validation, sector selection, loan details, and collateral configuration.

### Stage 2: Data Ingestion
Color-coded upload slots for 5 document types, auto-classification with confidence scores, human-in-the-loop approval.

### Stage 3: Extraction & Schema
Expandable document cards, inline value editing, dynamic schema editor for custom fields.

### Stage 4: Analysis & Report
Tabbed interface with Secondary Research, Credit Scoring (Five Cs radar chart), SWOT Analysis (4-quadrant display), and Final Report generation with PDF/DOCX download.

## 📝 License

MIT
