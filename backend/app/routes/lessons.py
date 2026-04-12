"""
RBU Platform — Lesson Routes (Simplified)
Create lessons with text content + optional Google Drive link.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import LessonCreate, LessonResponse, TokenData
from app.routes.auth import get_current_user, require_role
from app.services.firebase_service import (
    create_document, get_document, update_document,
    delete_document, query_documents,
)

router = APIRouter()


@router.post("/", response_model=LessonResponse, status_code=201)
async def create_lesson(data: LessonCreate, user: TokenData = Depends(require_role("educator", "admin"))):
    doc_id = create_document("lessons", {
        "courseId": data.courseId, "title": data.title,
        "content": data.content or "", "materialLink": data.materialLink or "",
        "educatorId": user.uid,
    })
    return LessonResponse(id=doc_id, courseId=data.courseId, title=data.title,
                          content=data.content, materialLink=data.materialLink)


@router.get("/", response_model=list[LessonResponse])
async def list_lessons(courseId: str = None, user: TokenData = Depends(get_current_user)):
    filters = [("courseId", "==", courseId)] if courseId else []
    docs = query_documents("lessons", filters=filters)
    return [LessonResponse(
        id=d["id"], courseId=d.get("courseId", ""),
        title=d.get("title", ""), content=d.get("content"),
        materialLink=d.get("materialLink"),
    ) for d in docs]


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str, user: TokenData = Depends(get_current_user)):
    d = get_document("lessons", lesson_id)
    if not d:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return LessonResponse(id=d["id"], courseId=d.get("courseId", ""),
                          title=d.get("title", ""), content=d.get("content"),
                          materialLink=d.get("materialLink"))


@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(lesson_id: str, data: LessonCreate, user: TokenData = Depends(require_role("educator", "admin"))):
    d = get_document("lessons", lesson_id)
    if not d:
        raise HTTPException(status_code=404, detail="Lesson not found")
    update_document("lessons", lesson_id, {
        "title": data.title, "content": data.content or "",
        "materialLink": data.materialLink or "",
    })
    return LessonResponse(id=lesson_id, courseId=data.courseId, title=data.title,
                          content=data.content, materialLink=data.materialLink)


@router.delete("/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: str, user: TokenData = Depends(require_role("educator", "admin"))):
    d = get_document("lessons", lesson_id)
    if not d:
        raise HTTPException(status_code=404, detail="Lesson not found")
    delete_document("lessons", lesson_id)
