"""
RBU Platform — Question Bank Routes
Publishable question sets that educators can send directly to students.
Separate from quizzes — no timer, no grading, just practice material.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import QuestionResponse, TokenData
from app.routes.auth import get_current_user, require_role
from app.services.firebase_service import (
    create_document, get_document, update_document,
    delete_document, query_documents,
)
from app.services.ollama_service import build_answer_key

router = APIRouter()


@router.post("/", status_code=201)
async def create_question_bank(
    data: dict,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Create a question bank from selected question IDs and publish it to students."""
    title = data.get("title", "").strip()
    question_ids = data.get("questionIds", [])
    course_id = data.get("courseId", "")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not question_ids:
        raise HTTPException(status_code=400, detail="Select at least one question")

    doc_id = create_document("question_banks", {
        "title": title,
        "courseId": course_id,
        "questionIds": question_ids,
        "published": data.get("published", True),
        "createdBy": user.uid,
    })

    return {
        "id": doc_id,
        "title": title,
        "courseId": course_id,
        "questionIds": question_ids,
        "published": True,
        "createdBy": user.uid,
    }


@router.get("/")
async def list_question_banks(
    courseId: str = None,
    user: TokenData = Depends(get_current_user),
):
    """List question banks. Educators see all; students see only published ones."""
    filters = []
    if courseId:
        filters.append(("courseId", "==", courseId))
    if user.role == "student":
        filters.append(("published", "==", True))

    docs = query_documents("question_banks", filters=filters)

    results = []
    for d in docs:
        results.append({
            "id": d["id"],
            "title": d.get("title", ""),
            "courseId": d.get("courseId", ""),
            "questionIds": d.get("questionIds", []),
            "published": d.get("published", False),
            "createdBy": d.get("createdBy", ""),
            "questionCount": len(d.get("questionIds", [])),
        })
    return results


@router.get("/{bank_id}")
async def get_question_bank(
    bank_id: str,
    user: TokenData = Depends(get_current_user),
):
    """Get a question bank with full question objects expanded."""
    d = get_document("question_banks", bank_id)
    if not d:
        raise HTTPException(status_code=404, detail="Question bank not found")

    # Students can only see published banks
    if user.role == "student" and not d.get("published", False):
        raise HTTPException(status_code=403, detail="This question bank is not available")

    # Expand questions — fetch all at once
    full_questions = []
    for qid in d.get("questionIds", []):
        q = get_document("questions", qid)
        if q:
            full_questions.append({
                "id": q["id"],
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", "General"),
                "generated_by": q.get("generated_by", "manual"),
            })

    # Build answer key from FULL data (before any stripping)
    answer_key = build_answer_key(full_questions) if full_questions else []

    # For the questions list returned to students, strip correct answers
    # (the answer key is separate and the frontend controls its visibility)
    response_questions = []
    for q in full_questions:
        rq = {**q}
        if user.role == "student":
            rq["correct_answer"] = ""
            rq["explanation"] = ""
        response_questions.append(rq)

    return {
        "id": d["id"],
        "title": d.get("title", ""),
        "courseId": d.get("courseId", ""),
        "published": d.get("published", False),
        "createdBy": d.get("createdBy", ""),
        "questions": response_questions,
        "answer_key": answer_key,
        "questionCount": len(response_questions),
    }


@router.put("/{bank_id}/publish")
async def toggle_publish(
    bank_id: str,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Toggle a question bank's published status."""
    d = get_document("question_banks", bank_id)
    if not d:
        raise HTTPException(status_code=404, detail="Question bank not found")

    new_status = not d.get("published", False)
    update_document("question_banks", bank_id, {"published": new_status})
    return {"id": bank_id, "published": new_status}


@router.delete("/{bank_id}", status_code=204)
async def delete_question_bank(
    bank_id: str,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Delete a question bank (does NOT delete the questions themselves)."""
    d = get_document("question_banks", bank_id)
    if not d:
        raise HTTPException(status_code=404, detail="Question bank not found")
    delete_document("question_banks", bank_id)
