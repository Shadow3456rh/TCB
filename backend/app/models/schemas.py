"""
RBU Platform — Pydantic Schemas (Simplified)
Only the models we actually need.
"""

from pydantic import BaseModel
from typing import Optional


# ---- Auth ----

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    institution: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    institution: Optional[str] = None


class TokenData(BaseModel):
    uid: str
    email: Optional[str] = None
    role: str = "student"


# ---- Courses ----

class CourseCreate(BaseModel):
    title: str
    code: str
    description: Optional[str] = None


class CourseResponse(BaseModel):
    id: str
    title: str
    code: str
    description: Optional[str] = None
    educatorId: str = ""
    studentIds: list[str] = []


# ---- Lessons ----

class LessonCreate(BaseModel):
    courseId: str
    title: str
    content: Optional[str] = None
    materialLink: Optional[str] = None  # Google Drive / external link


class LessonResponse(BaseModel):
    id: str
    courseId: str
    title: str
    content: Optional[str] = None
    materialLink: Optional[str] = None


# ---- Questions ----

class QuestionCreate(BaseModel):
    """For manual question creation."""
    lessonId: str
    question: str
    options: list[str]
    correct_answer: str  # "A", "B", "C", or "D"
    explanation: Optional[str] = None
    difficulty: str = "medium"
    topic: Optional[str] = None


class QuestionResponse(BaseModel):
    id: str
    lessonId: str = ""
    question: str
    options: list[str] = []
    correct_answer: str = ""
    explanation: Optional[str] = None
    difficulty: str = "medium"
    bloom_level: str = "understand"
    topic: Optional[str] = None
    generated_by: str = "manual"
    approved: bool = True


# ---- Quizzes ----

class QuizCreate(BaseModel):
    courseId: str
    title: str
    questionIds: list[str]
    duration: int = 30
    totalMarks: Optional[int] = None


class QuizResponse(BaseModel):
    id: str
    courseId: str
    title: str
    questionIds: list[str] = []
    questions: list[QuestionResponse] = []
    duration: int = 30
    totalMarks: int = 0
    createdBy: str = ""


class QuizSubmission(BaseModel):
    answers: dict[str, str]  # {questionId: "A"}
    timeSpent: Optional[int] = None


class QuizResult(BaseModel):
    attemptId: str = ""
    quizId: str
    studentId: str = ""
    score: int
    total: int
    percentage: float
    timeSpent: Optional[int] = None
    results: list[dict] = []
    completedAt: Optional[str] = None


# ---- AI ----

class GenerateQuestionsRequest(BaseModel):
    lessonId: str
    content: Optional[str] = None
    count: int = 5
    difficulty: str = "medium"


class ExplainAnswerRequest(BaseModel):
    questionId: str
    questionText: str
    studentAnswer: str
    correctAnswer: str
    explanation: Optional[str] = None
    lessonId: Optional[str] = None


class ExplainAnswerResponse(BaseModel):
    explanation: str
    questionId: str


class ConceptExplainRequest(BaseModel):
    concept: str
    detailLevel: str = "medium"
    lessonId: Optional[str] = None


class ConceptExplainResponse(BaseModel):
    concept: str
    explanation: str
    detailLevel: str = "medium"
