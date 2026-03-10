from fastapi import APIRouter
from models.request_models import EntityOnboardingRequest
from models.response_models import EntityOnboardingResponse
import uuid, os, json

router = APIRouter()

_onboarding_store = {}


@router.post("/create", response_model=EntityOnboardingResponse)
async def create_entity(request: EntityOnboardingRequest):
    """Create a new entity with onboarding details (entity + loan info)."""
    company_id = str(uuid.uuid4())[:8]
    save_dir = f"uploads/{company_id}"
    os.makedirs(save_dir, exist_ok=True)

    entity_data = request.model_dump()
    entity_data["company_id"] = company_id

    with open(f"{save_dir}/entity_onboarding.json", "w") as f:
        json.dump(entity_data, f, indent=2)

    _onboarding_store[company_id] = entity_data

    return EntityOnboardingResponse(
        company_id=company_id,
        company_name=request.company_name,
        status="created",
        message="Entity onboarded successfully. Proceed to document upload."
    )


@router.get("/entity/{company_id}")
async def get_entity(company_id: str):
    """Retrieve onboarding details for a company."""
    if company_id in _onboarding_store:
        return _onboarding_store[company_id]

    path = f"uploads/{company_id}/entity_onboarding.json"
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)

    return {"company_id": company_id, "status": "not_found"}


@router.put("/entity/{company_id}")
async def update_entity(company_id: str, request: EntityOnboardingRequest):
    """Update onboarding details for an existing entity."""
    save_dir = f"uploads/{company_id}"
    if not os.path.exists(save_dir):
        os.makedirs(save_dir, exist_ok=True)

    entity_data = request.model_dump()
    entity_data["company_id"] = company_id

    with open(f"{save_dir}/entity_onboarding.json", "w") as f:
        json.dump(entity_data, f, indent=2)

    _onboarding_store[company_id] = entity_data

    return EntityOnboardingResponse(
        company_id=company_id,
        company_name=request.company_name,
        status="updated",
        message="Entity details updated successfully."
    )
