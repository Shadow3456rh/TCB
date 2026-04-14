"""
RBU Platform — Ollama Service (Enhanced)
Strict MCQ generation with answer-key validation, practice generation,
and grounded Q&A from uploaded material.
"""

import ollama
import json
import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────
#  MCQ Generation (Fixed prompt + validation)
# ────────────────────────────────────────────

def generate_questions(lesson_content: str, count: int = 5, difficulty: str = "medium") -> list:
    """Generate MCQs from text content with strict validation."""
    content = lesson_content[:4000]

    prompt = f"""You are an expert educator creating a multiple-choice exam.

STRICT RULES — violating ANY rule makes the output invalid:
1. Generate EXACTLY {count} questions based ONLY on the content below.
2. Each question MUST have EXACTLY 4 options labeled A), B), C), D).
3. EXACTLY ONE option must be correct. The "correct_answer" field must be a SINGLE letter: A, B, C, or D.
4. The correct answer MUST be the letter of one of the four options you wrote.
5. NEVER use options like "None of the above", "All of the above", "Both A and B", or any meta-option.
6. Every option must be a plausible, distinct answer — no joke or obviously wrong fillers.
7. Include a short explanation of WHY the correct answer is right.
8. Difficulty level: {difficulty}

CONTENT:
{content}

Return ONLY a valid JSON array with NO markdown formatting, NO commentary, NO extra text.
Example of ONE element:
{{
  "question": "What is the capital of France?",
  "options": ["A) London", "B) Paris", "C) Berlin", "D) Madrid"],
  "correct_answer": "B",
  "explanation": "Paris is the capital and largest city of France.",
  "difficulty": "{difficulty}",
  "topic": "Geography"
}}

Return the JSON array now:"""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response["message"]["content"]
        parsed = _extract_json(raw)

        if not isinstance(parsed, list):
            parsed = [parsed]

        validated = _validate_questions(parsed, difficulty)

        logger.info(f"Generated {len(validated)} valid questions out of {len(parsed)} parsed")
        return validated

    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        raise RuntimeError(f"AI generation failed: {str(e)}")


def _validate_questions(questions: list, default_difficulty: str = "medium") -> list:
    """Strict validation: discard any question that fails rules."""
    LETTER_MAP = {"A": 0, "B": 1, "C": 2, "D": 3}
    BANNED_PHRASES = [
        "none of the above", "all of the above", "both a and b",
        "both b and c", "both a and c", "both c and d",
        "none of these", "all of these",
    ]

    validated = []
    for q in questions:
        # Must have required fields
        if not q.get("question") or not q.get("options") or not q.get("correct_answer"):
            continue

        options = q["options"]

        # Must have exactly 4 options
        if len(options) != 4:
            options = options[:4]
            if len(options) != 4:
                continue

        # Correct answer must be a single letter A-D
        answer_letter = q["correct_answer"].strip().upper()
        if len(answer_letter) == 0:
            continue
        answer_letter = answer_letter[0]
        if answer_letter not in LETTER_MAP:
            continue

        # Check for banned phrases in any option
        has_banned = False
        for opt in options:
            opt_lower = opt.lower()
            for phrase in BANNED_PHRASES:
                if phrase in opt_lower:
                    has_banned = True
                    break
            if has_banned:
                break
        if has_banned:
            continue

        # Verify the correct answer letter points to a real option
        idx = LETTER_MAP[answer_letter]
        if idx >= len(options):
            continue

        # Normalize options to have A)/B)/C)/D) prefix
        clean_options = []
        for i, opt in enumerate(options):
            letter = chr(65 + i)
            # Strip existing prefix like "A) " or "A. "
            stripped = re.sub(r'^[A-Da-d][).\s]+\s*', '', opt).strip()
            clean_options.append(f"{letter}) {stripped}")

        validated.append({
            "question": q["question"].strip(),
            "options": clean_options,
            "correct_answer": answer_letter,
            "explanation": q.get("explanation", "").strip(),
            "difficulty": q.get("difficulty", default_difficulty),
            "topic": q.get("topic", "General"),
            "generated_by": "ai",
            "approved": False,
        })

    return validated


def build_answer_key(questions: list) -> list:
    """Build a clean answer key from a list of validated question dicts."""
    key = []
    for i, q in enumerate(questions):
        letter = q.get("correct_answer", "?")
        idx = {"A": 0, "B": 1, "C": 2, "D": 3}.get(letter, -1)
        answer_text = ""
        if 0 <= idx < len(q.get("options", [])):
            answer_text = re.sub(r'^[A-D]\)\s*', '', q["options"][idx])
        key.append({
            "number": i + 1,
            "correct_letter": letter,
            "correct_text": answer_text,
            "explanation": q.get("explanation", ""),
        })
    return key


# ────────────────────────────────────────────
#  Practice Question Generation (NEW — fresh AI questions)
# ────────────────────────────────────────────

def generate_practice_questions(topics: list, existing_content: str = "", count: int = 5) -> list:
    """Generate FRESH practice questions targeting specific weak topics."""
    topics_str = ", ".join(topics) if topics else "general review"
    context = existing_content[:3000] if existing_content else ""

    prompt = f"""You are a tutor generating a PRACTICE SET for a student who is weak in these topics: {topics_str}

{"Here is relevant lesson content for context:" + chr(10) + context if context else "Generate questions about these topics using your knowledge."}

STRICT RULES:
1. Generate EXACTLY {count} multiple-choice questions targeting the weak topics above.
2. Each question MUST have EXACTLY 4 options: A), B), C), D).
3. EXACTLY ONE option must be correct. "correct_answer" must be A, B, C, or D.
4. NEVER use "None of the above", "All of the above", or any meta-option.
5. Include a clear explanation for each answer so the student can learn.
6. Make questions educational — the student should learn from the explanation.
7. Vary the difficulty: include some easy and some medium questions.

Return ONLY a valid JSON array. No markdown, no extra text.
Example element:
{{
  "question": "Which data structure uses FIFO order?",
  "options": ["A) Stack", "B) Queue", "C) Tree", "D) Graph"],
  "correct_answer": "B",
  "explanation": "A Queue follows First-In-First-Out (FIFO) principle where the first element added is the first to be removed.",
  "difficulty": "easy",
  "topic": "Data Structures"
}}

Return the JSON array now:"""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response["message"]["content"]
        parsed = _extract_json(raw)

        if not isinstance(parsed, list):
            parsed = [parsed]

        return _validate_questions(parsed, "medium")

    except Exception as e:
        logger.error(f"Practice generation failed: {e}")
        raise RuntimeError(f"Practice generation failed: {str(e)}")


# ────────────────────────────────────────────
#  Grounded Q&A from uploaded material
# ────────────────────────────────────────────

def ask_from_material(material_text: str, question: str) -> str:
    """Answer a student's question using ONLY the provided material."""
    context = material_text[:5000]

    prompt = f"""You are a helpful study assistant. A student has uploaded their study material and has a question.

IMPORTANT RULES:
1. Answer the question ONLY based on the material provided below.
2. If the material does not contain enough information to answer, say "I couldn't find this in your uploaded material."
3. Do NOT make up facts or use external knowledge — stick to the material.
4. Give a clear, concise explanation with examples from the material when possible.
5. Keep your response to 4-8 sentences.

STUDENT'S STUDY MATERIAL:
{context}

STUDENT'S QUESTION:
{question}

Answer:"""

    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Material Q&A failed: {e}")
        return "I'm sorry, I couldn't process your question right now. Please try again later."


# ────────────────────────────────────────────
#  Existing helpers (unchanged)
# ────────────────────────────────────────────

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
