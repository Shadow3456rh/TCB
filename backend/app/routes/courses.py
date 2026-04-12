"""
RBU Platform — Course Routes (Simplified)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import CourseCreate, CourseResponse, TokenData
from app.routes.auth import get_current_user, require_role
from app.services.firebase_service import (
    create_document, get_document, update_document,
    delete_document, query_documents,
)

router = APIRouter()


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(data: CourseCreate, user: TokenData = Depends(require_role("educator", "admin"))):
    doc_id = create_document("courses", {
        "title": data.title, "code": data.code,
        "description": data.description or "", "educatorId": user.uid, "studentIds": [],
    })
    return CourseResponse(id=doc_id, title=data.title, code=data.code,
                          description=data.description, educatorId=user.uid, studentIds=[])


@router.get("/", response_model=list[CourseResponse])
async def list_courses(user: TokenData = Depends(get_current_user)):
    if user.role == "educator":
        docs = query_documents("courses", filters=[("educatorId", "==", user.uid)])
    else:
        docs = query_documents("courses")

    return [CourseResponse(
        id=d["id"], title=d.get("title", ""), code=d.get("code", ""),
        description=d.get("description"), educatorId=d.get("educatorId", ""),
        studentIds=d.get("studentIds", []),
    ) for d in docs]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, user: TokenData = Depends(get_current_user)):
    d = get_document("courses", course_id)
    if not d:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(
        id=d["id"], title=d.get("title", ""), code=d.get("code", ""),
        description=d.get("description"), educatorId=d.get("educatorId", ""),
        studentIds=d.get("studentIds", []),
    )


@router.post("/{course_id}/enroll", response_model=CourseResponse)
async def enroll(course_id: str, user: TokenData = Depends(get_current_user)):
    d = get_document("courses", course_id)
    if not d:
        raise HTTPException(status_code=404, detail="Course not found")
    sids = d.get("studentIds", [])
    if user.uid in sids:
        raise HTTPException(status_code=400, detail="Already enrolled")
    sids.append(user.uid)
    update_document("courses", course_id, {"studentIds": sids})
    return CourseResponse(id=course_id, title=d.get("title", ""), code=d.get("code", ""),
                          description=d.get("description"), educatorId=d.get("educatorId", ""),
                          studentIds=sids)


@router.delete("/{course_id}", status_code=204)
async def delete_course(course_id: str, user: TokenData = Depends(require_role("educator", "admin"))):
    d = get_document("courses", course_id)
    if not d:
        raise HTTPException(status_code=404, detail="Course not found")
    delete_document("courses", course_id)
