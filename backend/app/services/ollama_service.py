"""
RBU Platform — Ollama Service (Simplified)
Direct prompts to Ollama — no RAG, no vector DB.
"""

import ollama
import json
import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def generate_questions(lesson_content: str, count: int = 5, difficulty: str = "medium") -> list:
    """Generate MCQs directly from text content — no RAG needed."""
    # Truncate to first 3000 chars to keep prompt manageable
    content = lesson_content[:3000]

    prompt = f"""You are an expert educator. Based on this lesson content, generate exactly {count} multiple choice questions.
Difficulty: {difficulty}

Content:
{content}

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {{
    "question": "Question text?",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correct_answer": "B",
    "explanation": "Why B is correct",
    "difficulty": "{difficulty}",
    "topic": "Main topic"
  }}
]"""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response["message"]["content"]
        parsed = _extract_json(raw)

        if not isinstance(parsed, list):
            parsed = [parsed]

        # Validate each question
        validated = []
        for q in parsed:
            if q.get("question") and q.get("options") and q.get("correct_answer"):
                validated.append({
                    "question": q["question"],
                    "options": q["options"][:4],
                    "correct_answer": q["correct_answer"].strip().upper()[0],
                    "explanation": q.get("explanation", ""),
                    "difficulty": q.get("difficulty", difficulty),
                    "topic": q.get("topic", "General"),
                    "generated_by": "ai",
                    "approved": False,
                })

        logger.info(f"Generated {len(validated)} questions")
        return validated

    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        raise RuntimeError(f"AI generation failed: {str(e)}")


def explain_answer(question: str, student_answer: str, correct_answer: str) -> str:
    """Simple explanation — no context retrieval needed."""
    prompt = f"""Question: {question}
Student answered: {student_answer}
Correct answer: {correct_answer}

Explain in 3-4 sentences why the correct answer is right and what the student may have misunderstood. Be encouraging."""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Explanation failed: {e}")
        return f"The correct answer is {correct_answer}. Please review the lesson material."


def explain_concept(concept: str, lesson_content: str = "") -> str:
    """Simple concept explanation."""
    context = f"\nContext: {lesson_content[:1000]}" if lesson_content else ""

    prompt = f"""Explain this concept in simple terms: {concept}
{context}

Give a clear explanation with an example. Keep it to 4-6 sentences."""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Concept explanation failed: {e}")
        return f"Unable to explain '{concept}' right now. Please try again later."


def check_health() -> bool:
    """Check if Ollama is reachable."""
    try:
        ollama.list()
        return True
    except Exception:
        return False


def _extract_json(text: str):
    """Extract JSON from LLM response."""
    # Try code block
    match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)\n?```", text)
    if match:
        return json.loads(match.group(1).strip())

    # Try finding array
    match = re.search(r"(\[[\s\S]*\])", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding object
    match = re.search(r"(\{[\s\S]*\})", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return json.loads(text.strip())
