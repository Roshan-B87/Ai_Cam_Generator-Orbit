"""Authentication router — signup, login, current-user."""

import uuid
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import jwt, JWTError

from core.config import settings
from models.request_models import SignupRequest, LoginRequest
from models.response_models import AuthResponse, UserResponse

router = APIRouter()
security = HTTPBearer()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Persistence helpers ──────────────────────────────────────
USERS_FILE = os.path.join(settings.UPLOAD_DIR, "_users.json")

def _load_users() -> dict:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}

def _save_users(users: dict):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


# ── JWT helpers ──────────────────────────────────────────────
def _create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency — decode JWT and return user dict."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
        users = _load_users()
        user = users.get(user_id)
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


# ── Endpoints ────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    users = _load_users()

    # Check duplicate email
    for u in users.values():
        if u["email"] == req.email:
            raise HTTPException(409, "Email already registered")

    user_id = uuid.uuid4().hex[:8]
    hashed = pwd.hash(req.password)

    user = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": hashed,
        "role": req.role,
        "organization": req.organization,
    }
    users[user_id] = user
    _save_users(users)

    token = _create_token(user_id, req.email)
    return AuthResponse(
        token=token,
        user={"id": user_id, "name": req.name, "email": req.email, "role": req.role, "organization": req.organization},
        message="Account created successfully",
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    users = _load_users()

    target = None
    for u in users.values():
        if u["email"] == req.email:
            target = u
            break

    if not target or not pwd.verify(req.password, target["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = _create_token(target["id"], target["email"])
    return AuthResponse(
        token=token,
        user={
            "id": target["id"],
            "name": target["name"],
            "email": target["email"],
            "role": target["role"],
            "organization": target.get("organization"),
        },
        message="Login successful",
    )


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        organization=user.get("organization"),
    )
