"""
RBU Platform — Auth Routes (Simplified)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.schemas import UserRegister, UserResponse, TokenData
from app.services.firebase_service import (
    verify_firebase_token, create_firebase_user,
    create_document, get_document,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer(auto_error=False)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Verify Firebase token."""
    if not creds:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        decoded = verify_firebase_token(creds.credentials)
        uid = decoded.get("uid", "")
        user_doc = get_document("users", uid)
        role = user_doc.get("role", "student") if user_doc else "student"
        return TokenData(uid=uid, email=decoded.get("email"), role=role)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def check(user: TokenData = Depends(get_current_user)) -> TokenData:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check


@router.post("/register", response_model=UserResponse)
async def register(data: UserRegister, creds: HTTPAuthorizationCredentials = Depends(security)):
    """Store user profile in Firestore. Firebase Auth user is already created client-side."""
    try:
        # If we have a token, use the UID from it (frontend already created the user)
        if creds:
            decoded = verify_firebase_token(creds.credentials)
            uid = decoded.get("uid", "")
        else:
            # Fallback: create from backend (for API-only usage)
            uid = create_firebase_user(data.email, data.password, data.name)

        create_document("users", {
            "email": data.email, "name": data.name,
            "role": data.role, "institution": data.institution or "",
        }, doc_id=uid)
        return UserResponse(id=uid, email=data.email, name=data.name, role=data.role, institution=data.institution)
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=UserResponse)
async def get_profile(user: TokenData = Depends(get_current_user)):
    doc = get_document("users", user.uid)
    if not doc:
        return UserResponse(id=user.uid, email=user.email or "", name="User", role=user.role or "student")
    return UserResponse(
        id=user.uid, email=doc.get("email", ""), name=doc.get("name", ""),
        role=doc.get("role", "student"), institution=doc.get("institution"),
    )
