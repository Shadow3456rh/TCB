"""
RBU Platform — AI Routes (Simplified)
Question generation, manual questions, explanations, practice sets.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    GenerateQuestionsRequest, QuestionCreate, QuestionResponse,
    ExplainAnswerRequest, ExplainAnswerResponse,
    ConceptExplainRequest, ConceptExplainResponse,
    TokenData,
)
from app.routes.auth import get_current_user, require_role
from app.services.ollama_service import generate_questions, explain_answer, explain_concept, check_health
from app.services.firebase_service import create_document, get_document, query_documents
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def ai_health():
    healthy = check_health()
    return {"ollama_available": healthy, "message": "AI online" if healthy else "Ollama not running"}


# ---- Manual Questions ----

@router.post("/questions", response_model=QuestionResponse, status_code=201)
async def create_manual_question(
    data: QuestionCreate,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Create a question manually (no AI)."""
    doc_id = create_document("questions", {
        "lessonId": data.lessonId,
        "question": data.question,
        "options": data.options[:4],
        "correct_answer": data.correct_answer.strip().upper()[0],
        "explanation": data.explanation or "",
        "difficulty": data.difficulty,
        "topic": data.topic or "General",
        "generated_by": "manual",
        "approved": True,
    })
    return QuestionResponse(
        id=doc_id, lessonId=data.lessonId, question=data.question,
        options=data.options, correct_answer=data.correct_answer.strip().upper()[0],
        explanation=data.explanation, difficulty=data.difficulty,
        topic=data.topic, generated_by="manual", approved=True,
    )


@router.get("/questions", response_model=list[QuestionResponse])
async def list_questions(
    lessonId: str = None, courseId: str = None,
    user: TokenData = Depends(get_current_user),
):
    """List questions — filter by lessonId or get all for a course's lessons."""
    if lessonId:
        docs = query_documents("questions", filters=[("lessonId", "==", lessonId)])
    elif courseId:
        # Get all lessons for this course, then all questions for those lessons
        lessons = query_documents("lessons", filters=[("courseId", "==", courseId)])
        lesson_ids = [l["id"] for l in lessons]
        docs = []
        for lid in lesson_ids:
            qs = query_documents("questions", filters=[("lessonId", "==", lid)])
            docs.extend(qs)
    else:
        docs = query_documents("questions")

    return [QuestionResponse(
        id=d["id"], lessonId=d.get("lessonId", ""), question=d.get("question", ""),
        options=d.get("options", []),
        correct_answer=d.get("correct_answer", "") if user.role != "student" else "",
        explanation=d.get("explanation") if user.role != "student" else None,
        difficulty=d.get("difficulty", "medium"), bloom_level=d.get("bloom_level", "understand"),
        topic=d.get("topic"), generated_by=d.get("generated_by", "manual"),
        approved=d.get("approved", True),
    ) for d in docs]


@router.delete("/questions/{question_id}", status_code=204)
async def delete_question(question_id: str, user: TokenData = Depends(require_role("educator", "admin"))):
    from app.services.firebase_service import delete_document
    delete_document("questions", question_id)


# ---- AI Generation ----

@router.post("/generate-questions", response_model=list[QuestionResponse])
async def generate_questions_endpoint(
    data: GenerateQuestionsRequest,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Generate questions from lesson content using Ollama."""
    content = data.content or ""

    # If no content provided, get it from the lesson
    if not content:
        lesson = get_document("lessons", data.lessonId)
        if lesson:
            content = lesson.get("content", "")

    if not content or len(content) < 20:
        raise HTTPException(status_code=400, detail="Not enough content to generate questions. Add text content to the lesson first.")

    try:
        logger.info(f"Generating {data.count} questions from {len(content)} chars of content")
        questions = generate_questions(content, count=data.count, difficulty=data.difficulty)

        if not questions:
            raise HTTPException(status_code=500, detail="AI returned no valid questions. Try again.")

        # Store in Firebase
        stored = []
        for q in questions:
            q["lessonId"] = data.lessonId
            doc_id = create_document("questions", q)
            stored.append(QuestionResponse(
                id=doc_id, lessonId=data.lessonId, question=q["question"],
                options=q["options"], correct_answer=q["correct_answer"],
                explanation=q.get("explanation"), difficulty=q.get("difficulty", "medium"),
                bloom_level="understand", topic=q.get("topic"),
                generated_by="ai", approved=False,
            ))

        logger.info(f"Stored {len(stored)} questions")
        return stored
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ---- Explanations ----

@router.post("/explain-answer", response_model=ExplainAnswerResponse)
async def explain_answer_endpoint(data: ExplainAnswerRequest, user: TokenData = Depends(get_current_user)):
    try:
        explanation = explain_answer(
            question=data.questionText,
            student_answer=data.studentAnswer,
            correct_answer=data.correctAnswer,
        )
        return ExplainAnswerResponse(explanation=explanation, questionId=data.questionId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain-concept", response_model=ConceptExplainResponse)
async def explain_concept_endpoint(data: ConceptExplainRequest, user: TokenData = Depends(get_current_user)):
    lesson_content = ""
    if data.lessonId:
        lesson = get_document("lessons", data.lessonId)
        if lesson:
            lesson_content = lesson.get("content", "")
    try:
        explanation = explain_concept(data.concept, lesson_content)
        return ConceptExplainResponse(concept=data.concept, explanation=explanation, detailLevel=data.detailLevel)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Practice ----

@router.post("/generate-practice")
async def generate_practice(user: TokenData = Depends(get_current_user)):
    attempts = query_documents("attempts", filters=[("studentId", "==", user.uid)], limit=10)

    topic_scores = {}
    for attempt in attempts:
        for qid, answer in (attempt.get("answers") or {}).items():
            q = get_document("questions", qid)
            if not q:
                continue
            topic = q.get("topic", "General")
            if topic not in topic_scores:
                topic_scores[topic] = {"correct": 0, "total": 0}
            topic_scores[topic]["total"] += 1
            if answer.upper() == q.get("correct_answer", "").upper():
                topic_scores[topic]["correct"] += 1

    weak_topics = []
    for topic, scores in topic_scores.items():
        accuracy = (scores["correct"] / scores["total"] * 100) if scores["total"] > 0 else 0
        if accuracy < 70:
            weak_topics.append(topic)

    practice_questions = []
    if weak_topics:
        for topic in weak_topics[:3]:
            qs = query_documents("questions", filters=[("topic", "==", topic)], limit=3)
            for q in qs:
                practice_questions.append(QuestionResponse(
                    id=q["id"], lessonId=q.get("lessonId", ""), question=q.get("question", ""),
                    options=q.get("options", []), correct_answer="",
                    difficulty=q.get("difficulty", "medium"), bloom_level="understand",
                    topic=q.get("topic"), generated_by=q.get("generated_by", "manual"), approved=True,
                ))
    else:
        qs = query_documents("questions", limit=5)
        for q in qs:
            practice_questions.append(QuestionResponse(
                id=q["id"], lessonId=q.get("lessonId", ""), question=q.get("question", ""),
                options=q.get("options", []), correct_answer="",
                difficulty=q.get("difficulty", "medium"), bloom_level="understand",
                topic=q.get("topic"), generated_by=q.get("generated_by", "manual"), approved=True,
            ))

    msg = f"Practice set focusing on: {', '.join(weak_topics)}" if weak_topics else "Great job! Here's a general practice set."
    return {"questions": practice_questions, "weak_topics": weak_topics, "message": msg}
