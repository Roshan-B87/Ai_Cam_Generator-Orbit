from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ingest, research, appraise, cam, mca
from routers.databricks import router as databricks_router
from routers.onboarding import router as onboarding_router
from routers.auth import router as auth_router

app = FastAPI(
    title="Intelli-Credit API",
    description="AI-powered Corporate Credit Appraisal Engine",
    version="2.0.0"
)

# Allow all origins — safe for hackathon demo
# In production, restrict to specific frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(auth_router,         prefix="/auth",        tags=["Authentication"])
app.include_router(onboarding_router,   prefix="/onboarding",  tags=["Entity Onboarding"])
app.include_router(ingest.router,       prefix="/ingest",      tags=["Data Ingestor"])
app.include_router(databricks_router,   prefix="/databricks",  tags=["Databricks Connector"])
app.include_router(research.router,     prefix="/research",    tags=["Research Agent"])
app.include_router(appraise.router,     prefix="/appraise",    tags=["Credit Scoring"])
app.include_router(cam.router,          prefix="/cam",         tags=["CAM Generator"])
app.include_router(mca.router,          prefix="/mca",         tags=["MCA Registry"])

@app.get("/")
def health_check():
    return {"status": "Intelli-Credit API is live 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}
