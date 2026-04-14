"""
RBU Platform — AI Routes (Enhanced)
Fixed MCQ generation, PDF upload endpoints, fresh practice sets.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.models.schemas import (
    GenerateQuestionsRequest, QuestionCreate, QuestionResponse,
    ExplainAnswerRequest, ExplainAnswerResponse,
    ConceptExplainRequest, ConceptExplainResponse,
    StudentAskResponse,
    TokenData,
)
from app.routes.auth import get_current_user, require_role
from app.services.ollama_service import (
    generate_questions, explain_answer, explain_concept, check_health,
    build_answer_key, generate_practice_questions, ask_from_material,
)
from app.services.firebase_service import create_document, get_document, query_documents
from app.utils.pdf_parser import extract_text_from_pdf
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def ai_health():
    healthy = check_health()
    return {"ollama_available": healthy, "message": "AI online" if healthy else "Ollama not running"}


# ──────────────────────────────────────
#  Manual Questions
# ──────────────────────────────────────

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


# ──────────────────────────────────────
#  AI Question Generation (from lesson text)
# ──────────────────────────────────────

@router.post("/generate-questions")
async def generate_questions_endpoint(
    data: GenerateQuestionsRequest,
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Generate questions from lesson content using Ollama — with answer key."""
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

        # Build answer key before storing
        answer_key = build_answer_key(questions)

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
        return {"questions": stored, "answer_key": answer_key}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ──────────────────────────────────────
#  PDF Upload → Question Bank (Educator)
# ──────────────────────────────────────

@router.post("/upload-pdf-questions")
async def upload_pdf_questions(
    file: UploadFile = File(...),
    lessonId: str = Form(""),
    count: int = Form(5),
    difficulty: str = Form("medium"),
    user: TokenData = Depends(require_role("educator", "admin")),
):
    """Upload a PDF and generate a question bank from its content."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)

        if not text or len(text) < 30:
            raise HTTPException(status_code=400, detail="Could not extract enough text from PDF. Make sure it contains selectable text.")

        logger.info(f"Extracted {len(text)} chars from uploaded PDF '{file.filename}'")

        questions = generate_questions(text, count=count, difficulty=difficulty)

        if not questions:
            raise HTTPException(status_code=500, detail="AI returned no valid questions from this PDF. Try again.")

        answer_key = build_answer_key(questions)

        # Store in Firebase
        stored = []
        for q in questions:
            q["lessonId"] = lessonId
            q["source_pdf"] = file.filename
            doc_id = create_document("questions", q)
            stored.append(QuestionResponse(
                id=doc_id, lessonId=lessonId, question=q["question"],
                options=q["options"], correct_answer=q["correct_answer"],
                explanation=q.get("explanation"), difficulty=q.get("difficulty", "medium"),
                bloom_level="understand", topic=q.get("topic"),
                generated_by="ai", approved=False,
            ))

        return {
            "questions": stored,
            "answer_key": answer_key,
            "source_pdf": file.filename,
            "extracted_chars": len(text),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF question generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


# ──────────────────────────────────────
#  PDF Upload → Ask AI (Student)
# ──────────────────────────────────────

@router.post("/upload-pdf-ask", response_model=StudentAskResponse)
async def upload_pdf_ask(
    file: UploadFile = File(...),
    question: str = Form(...),
    user: TokenData = Depends(get_current_user),
):
    """Student uploads study material PDF and asks a question grounded in it."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    if not question.strip():
        raise HTTPException(status_code=400, detail="Please provide a question.")

    try:
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)

        if not text or len(text) < 30:
            raise HTTPException(status_code=400, detail="Could not extract enough text from PDF.")

        logger.info(f"Student asking from PDF ({len(text)} chars): {question[:80]}")

        answer = ask_from_material(text, question.strip())

        return StudentAskResponse(
            question=question.strip(),
            answer=answer,
            source=file.filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF Q&A failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process your question: {str(e)}")


# ──────────────────────────────────────
#  Explanations
# ──────────────────────────────────────

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


# ──────────────────────────────────────
#  Practice Set (FIXED — generates fresh AI questions)
# ──────────────────────────────────────

@router.post("/generate-practice")
async def generate_practice(user: TokenData = Depends(get_current_user)):
    """Generate a FRESH practice set each time — no more static questions."""
    attempts = query_documents("attempts", filters=[("studentId", "==", user.uid)], limit=20)

    # Analyze topic weaknesses
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
    topic_accuracy = []
    for topic, scores in topic_scores.items():
        accuracy = round((scores["correct"] / scores["total"] * 100) if scores["total"] > 0 else 0, 1)
        topic_accuracy.append({"topic": topic, "accuracy": accuracy, "isWeak": accuracy < 70})
        if accuracy < 70:
            weak_topics.append(topic)

    # Gather lesson content for weak topics to give AI context
    lesson_content = ""
    if weak_topics:
        # Find questions from weak topics and get their lesson content
        for topic in weak_topics[:3]:
            qs = query_documents("questions", filters=[("topic", "==", topic)], limit=2)
            for q_doc in qs:
                lid = q_doc.get("lessonId", "")
                if lid:
                    lesson = get_document("lessons", lid)
                    if lesson and lesson.get("content"):
                        lesson_content += lesson["content"][:500] + "\n"

    # Generate FRESH questions using AI
    try:
        topics_to_use = weak_topics if weak_topics else list(topic_scores.keys())[:3]
        if not topics_to_use:
            topics_to_use = ["General Review"]

        practice_qs = generate_practice_questions(
            topics=topics_to_use,
            existing_content=lesson_content,
            count=5,
        )

        # Build answer key for the practice set
        answer_key = build_answer_key(practice_qs)

        # Format as response
        practice_questions = []
        for q in practice_qs:
            practice_questions.append({
                "id": f"practice_{hash(q['question']) % 100000}",
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", "General"),
                "generated_by": "ai",
            })

        msg = f"Practice set focusing on: {', '.join(weak_topics)}" if weak_topics else "Here's a fresh general practice set to sharpen your skills!"

        return {
            "questions": practice_questions,
            "answer_key": answer_key,
            "weak_topics": weak_topics,
            "topic_accuracy": topic_accuracy,
            "message": msg,
        }

    except Exception as e:
        logger.error(f"Fresh practice generation failed: {e}", exc_info=True)
        # Fallback: return existing questions from DB
        fallback_qs = []
        if weak_topics:
            for topic in weak_topics[:3]:
                qs = query_documents("questions", filters=[("topic", "==", topic)], limit=3)
                fallback_qs.extend(qs)
        else:
            fallback_qs = query_documents("questions", limit=5)

        practice_questions = []
        for q in fallback_qs:
            practice_questions.append({
                "id": q["id"],
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", "medium"),
                "topic": q.get("topic", "General"),
                "generated_by": q.get("generated_by", "manual"),
            })

        answer_key = build_answer_key(practice_questions)
        msg = f"Practice set focusing on: {', '.join(weak_topics)}" if weak_topics else "Here's a practice set. (AI generation wasn't available)"

        return {
            "questions": practice_questions,
            "answer_key": answer_key,
            "weak_topics": weak_topics,
            "topic_accuracy": topic_accuracy,
            "message": msg,
        }
