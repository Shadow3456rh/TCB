"""
RBU Platform — Analytics Routes
Teacher dashboard: student performance, weak topics, score distributions.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import TokenData
from app.routes.auth import get_current_user, require_role
from app.services.firebase_service import get_document, query_documents
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/course/{course_id}")
async def course_analytics(course_id: str, user: TokenData = Depends(require_role("educator", "admin"))):
    """Get comprehensive analytics for a course."""
    course = get_document("courses", course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get quizzes for this course
    quizzes = query_documents("quizzes", filters=[("courseId", "==", course_id)])
    quiz_ids = [q["id"] for q in quizzes]

    # Get all attempts for these quizzes
    all_attempts = []
    for qid in quiz_ids:
        attempts = query_documents("attempts", filters=[("quizId", "==", qid)])
        all_attempts.extend(attempts)

    # Get student info
    student_ids = course.get("studentIds", [])
    students = []
    for sid in student_ids:
        sdoc = get_document("users", sid)
        students.append({
            "id": sid,
            "name": sdoc.get("name", "Unknown") if sdoc else "Unknown",
            "email": sdoc.get("email", "") if sdoc else "",
        })

    # Per-student performance
    student_stats = {}
    for attempt in all_attempts:
        sid = attempt.get("studentId", "")
        if sid not in student_stats:
            student_stats[sid] = {"attempts": 0, "totalScore": 0, "totalQuestions": 0}
        student_stats[sid]["attempts"] += 1
        student_stats[sid]["totalScore"] += attempt.get("score", 0)
        student_stats[sid]["totalQuestions"] += attempt.get("totalQuestions", 0)

    student_performance = []
    for s in students:
        stats = student_stats.get(s["id"], {"attempts": 0, "totalScore": 0, "totalQuestions": 0})
        avg = round((stats["totalScore"] / stats["totalQuestions"] * 100) if stats["totalQuestions"] > 0 else 0, 1)
        student_performance.append({
            "id": s["id"], "name": s["name"], "email": s["email"],
            "quizzesTaken": stats["attempts"],
            "avgScore": avg,
            "totalCorrect": stats["totalScore"],
            "totalQuestions": stats["totalQuestions"],
        })

    # Sort by avg score ascending (weakest first)
    student_performance.sort(key=lambda x: x["avgScore"])

    # Per-topic analysis across all students
    topic_stats = {}
    for attempt in all_attempts:
        answers = attempt.get("answers") or {}
        for qid, answer in answers.items():
            q = get_document("questions", qid)
            if not q:
                continue
            topic = q.get("topic", "General")
            if topic not in topic_stats:
                topic_stats[topic] = {"correct": 0, "total": 0, "students": set()}
            topic_stats[topic]["total"] += 1
            topic_stats[topic]["students"].add(attempt.get("studentId", ""))
            if answer.upper() == q.get("correct_answer", "").upper():
                topic_stats[topic]["correct"] += 1

    topic_analysis = []
    for topic, stats in topic_stats.items():
        accuracy = round((stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0, 1)
        topic_analysis.append({
            "topic": topic,
            "accuracy": accuracy,
            "totalAttempts": stats["total"],
            "correctCount": stats["correct"],
            "studentCount": len(stats["students"]),
            "isWeak": accuracy < 70,
        })

    topic_analysis.sort(key=lambda x: x["accuracy"])

    # Quiz-level stats
    quiz_stats = []
    for quiz in quizzes:
        q_attempts = [a for a in all_attempts if a.get("quizId") == quiz["id"]]
        if q_attempts:
            scores = [a.get("percentage", 0) for a in q_attempts]
            avg_score = round(sum(scores) / len(scores), 1)
            highest = round(max(scores), 1)
            lowest = round(min(scores), 1)
        else:
            avg_score = highest = lowest = 0

        quiz_stats.append({
            "id": quiz["id"], "title": quiz.get("title", ""),
            "attemptCount": len(q_attempts),
            "avgScore": avg_score, "highest": highest, "lowest": lowest,
            "questionCount": len(quiz.get("questionIds", [])),
        })

    # Overall course stats
    total_attempts = len(all_attempts)
    overall_avg = 0
    if all_attempts:
        overall_avg = round(sum(a.get("percentage", 0) for a in all_attempts) / total_attempts, 1)

    return {
        "courseId": course_id,
        "courseTitle": course.get("title", ""),
        "courseCode": course.get("code", ""),
        "totalStudents": len(student_ids),
        "totalQuizzes": len(quizzes),
        "totalAttempts": total_attempts,
        "overallAvgScore": overall_avg,
        "studentPerformance": student_performance,
        "topicAnalysis": topic_analysis,
        "quizStats": quiz_stats,
    }
