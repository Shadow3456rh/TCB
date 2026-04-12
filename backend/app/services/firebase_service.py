"""
RBU Platform — Firebase Service (Simplified)
Core Firestore CRUD + Auth token verification. No Storage.
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from app.config import settings
import logging
import os

logger = logging.getLogger(__name__)

_db = None
_initialized = False


def initialize_firebase():
    """Initialize Firebase Admin SDK once on startup."""
    global _db, _initialized

    if _initialized:
        return

    cred_path = settings.firebase_credentials_path
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _db = firestore.client()
        _initialized = True
        logger.info("Firebase initialized")
    else:
        logger.warning(f"Firebase credentials not found at '{cred_path}' — running in mock mode")


def get_db():
    return _db


# --- Auth ---

def verify_firebase_token(id_token: str) -> dict:
    if not _initialized:
        return {"uid": "mock-user-id", "email": "dev@example.com"}
    return auth.verify_id_token(id_token)


def create_firebase_user(email: str, password: str, display_name: str = None) -> str:
    if not _initialized:
        import uuid
        return str(uuid.uuid4())
    user = auth.create_user(email=email, password=password, display_name=display_name)
    return user.uid


# --- Firestore CRUD ---

def create_document(collection: str, data: dict, doc_id: str = None) -> str:
    if not _initialized:
        import uuid
        return doc_id or str(uuid.uuid4())

    data["createdAt"] = firestore.SERVER_TIMESTAMP
    if doc_id:
        _db.collection(collection).document(doc_id).set(data)
        return doc_id
    else:
        _, ref = _db.collection(collection).add(data)
        return ref.id


def get_document(collection: str, doc_id: str) -> dict | None:
    if not _initialized:
        return None
    doc = _db.collection(collection).document(doc_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def update_document(collection: str, doc_id: str, data: dict) -> bool:
    if not _initialized:
        return True
    _db.collection(collection).document(doc_id).update(data)
    return True


def delete_document(collection: str, doc_id: str) -> bool:
    if not _initialized:
        return True
    _db.collection(collection).document(doc_id).delete()
    return True


def query_documents(collection: str, filters: list = None, limit: int = None) -> list:
    if not _initialized:
        return []

    ref = _db.collection(collection)
    if filters:
        for field, op, value in filters:
            ref = ref.where(field, op, value)
    if limit:
        ref = ref.limit(limit)

    return [{"id": doc.id, **doc.to_dict()} for doc in ref.stream()]
