"""
RBU Platform — Quiz Routes (Simplified)
Create quizzes, take them, get results.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import QuizCreate, QuizResponse, QuizSubmission, QuizResult, QuestionResponse, TokenData
from app.routes.auth import get_current_user, require_role
from app.services.firebase_service import create_document, get_document, query_documents
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=QuizResponse, status_code=201)
async def create_quiz(data: QuizCreate, user: TokenData = Depends(require_role("educator", "admin"))):
    doc_id = create_document("quizzes", {
        "courseId": data.courseId, "title": data.title,
        "questionIds": data.questionIds, "duration": data.duration,
        "totalMarks": data.totalMarks or len(data.questionIds), "createdBy": user.uid,
    })
    return QuizResponse(
        id=doc_id, courseId=data.courseId, title=data.title,
        questionIds=data.questionIds, duration=data.duration,
        totalMarks=data.totalMarks or len(data.questionIds), createdBy=user.uid,
    )


@router.get("/", response_model=list[QuizResponse])
async def list_quizzes(courseId: str = None, user: TokenData = Depends(get_current_user)):
    filters = [("courseId", "==", courseId)] if courseId else []
    docs = query_documents("quizzes", filters=filters)
    return [QuizResponse(
        id=d["id"], courseId=d.get("courseId", ""), title=d.get("title", ""),
        questionIds=d.get("questionIds", []), duration=d.get("duration", 30),
        totalMarks=d.get("totalMarks", 0), createdBy=d.get("createdBy", ""),
    ) for d in docs]


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(quiz_id: str, user: TokenData = Depends(get_current_user)):
    d = get_document("quizzes", quiz_id)
    if not d:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Fetch questions
    questions = []
    for qid in d.get("questionIds", []):
        q = get_document("questions", qid)
        if q:
            questions.append(QuestionResponse(
                id=q["id"], lessonId=q.get("lessonId", ""), question=q.get("question", ""),
                options=q.get("options", []),
                correct_answer=q.get("correct_answer", "") if user.role != "student" else "",
                explanation=q.get("explanation") if user.role != "student" else None,
                difficulty=q.get("difficulty", "medium"), bloom_level=q.get("bloom_level", "understand"),
                topic=q.get("topic"), generated_by=q.get("generated_by", "manual"), approved=q.get("approved", True),
            ))

    return QuizResponse(
        id=d["id"], courseId=d.get("courseId", ""), title=d.get("title", ""),
        questionIds=d.get("questionIds", []), questions=questions,
        duration=d.get("duration", 30), totalMarks=d.get("totalMarks", 0), createdBy=d.get("createdBy", ""),
    )


@router.post("/{quiz_id}/submit", response_model=QuizResult)
async def submit_quiz(quiz_id: str, sub: QuizSubmission, user: TokenData = Depends(get_current_user)):
    quiz = get_document("quizzes", quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Score it
    questions = []
    for qid in quiz.get("questionIds", []):
        q = get_document("questions", qid)
        if q:
            questions.append({"id": q["id"], "correct_answer": q.get("correct_answer", ""), "topic": q.get("topic", "General")})

    correct = 0
    results = []
    for q in questions:
        student_ans = sub.answers.get(q["id"], "")
        is_correct = student_ans.upper() == q["correct_answer"].upper()
        if is_correct:
            correct += 1
        results.append({"question_id": q["id"], "student_answer": student_ans,
                         "correct_answer": q["correct_answer"], "is_correct": is_correct})

    total = len(questions)
    pct = round((correct / total * 100) if total > 0 else 0, 1)

    attempt_id = create_document("attempts", {
        "quizId": quiz_id, "studentId": user.uid, "answers": sub.answers,
        "score": correct, "totalQuestions": total, "percentage": pct,
        "timeSpent": sub.timeSpent, "completedAt": datetime.utcnow().isoformat(),
    })

    return QuizResult(attemptId=attempt_id, quizId=quiz_id, studentId=user.uid,
                      score=correct, total=total, percentage=pct,
                      timeSpent=sub.timeSpent, results=results)


@router.get("/{quiz_id}/results", response_model=list[QuizResult])
async def get_results(quiz_id: str, user: TokenData = Depends(get_current_user)):
    filters = [("quizId", "==", quiz_id)]
    if user.role == "student":
        filters.append(("studentId", "==", user.uid))
    docs = query_documents("attempts", filters=filters)
    return [QuizResult(
        attemptId=d["id"], quizId=d.get("quizId", ""), studentId=d.get("studentId", ""),
        score=d.get("score", 0), total=d.get("totalQuestions", 0), percentage=d.get("percentage", 0),
        timeSpent=d.get("timeSpent", 0), results=d.get("results", []), completedAt=d.get("completedAt"),
    ) for d in docs]
