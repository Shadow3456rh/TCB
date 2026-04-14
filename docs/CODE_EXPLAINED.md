# RBU Platform — Code Explained Line by Line

> Every function in the backend explained in plain English. Use this to answer "show me the code for X" questions.

---

## Table of Contents

1. [main.py — Server Entry Point](#1-mainpy--server-entry-point)
2. [config.py — Settings Loader](#2-configpy--settings-loader)
3. [firebase_service.py — Database Layer](#3-firebase_servicepy--database-layer)
4. [ollama_service.py — AI Engine](#4-ollama_servicepy--ai-engine)
5. [pdf_parser.py — PDF Text Extraction](#5-pdf_parserpy--pdf-text-extraction)
6. [schemas.py — Data Models](#6-schemaspy--data-models)
7. [auth.py — Login & Registration](#7-authpy--login--registration)
8. [courses.py — Course Management](#8-coursespy--course-management)
9. [lessons.py — Lesson Management](#9-lessonspy--lesson-management)
10. [ai.py — AI Features & Questions](#10-aipy--ai-features--questions)
11. [quizzes.py — Quiz & Grading System](#11-quizzespy--quiz--grading-system)
12. [analytics.py — Educator Dashboard Data](#12-analyticspy--educator-dashboard-data)
13. [question_banks.py — Publishable Question Sets](#13-question_bankspy--publishable-question-sets)

---

## 1. `main.py` — Server Entry Point

This is the first file Python runs. It creates the FastAPI app and sets everything up.

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
```
**What this does:** Imports the tools we need.
- `FastAPI` — the framework itself
- `CORSMiddleware` — a security setting
- `asynccontextmanager` — lets us run startup/shutdown code

---

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 RBU Platform starting...")
    from app.services.firebase_service import initialize_firebase
    initialize_firebase()
    from app.services.ollama_service import check_health
    if check_health():
        logger.info("✅ Ollama available")
    yield
    logger.info("👋 Shutting down...")
```
**What this does:** Defines startup and shutdown behavior.
- Everything **before** `yield` runs when the server starts
- Everything **after** `yield` runs when the server stops
- On startup: connects to Firebase, checks if Ollama AI is running

---

```python
app = FastAPI(title="RBU Platform API", version="1.0.0", lifespan=lifespan)
```
**What this does:** Creates the main FastAPI application object.

---

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**What this does:** Adds CORS support. Without this, the browser blocks the frontend from calling the backend because they run on different ports (5173 vs 8000).

---

```python
from app.routes import auth, courses, lessons, quizzes, ai, analytics, question_banks

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["Quizzes"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(question_banks.router, prefix="/api/question-banks", tags=["Question Banks"])
```
**What this does:** Registers all route files. Each prefix is prepended to every endpoint in that file — e.g., all routes in `question_banks.py` start with `/api/question-banks/...`

---

## 2. `config.py` — Settings Loader

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    firebase_credentials_path: str = "./firebase-credentials.json"
    ollama_model: str = "llama3.2:3b"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    class Config:
        env_file = ".env"
```
**What this does:** Defines all configurable settings with default values. Values are loaded from a `.env` file automatically. If the `.env` file has `OLLAMA_MODEL=llama3.1:8b`, it overrides the default.

```python
settings = Settings()
```
**What this does:** Creates one single config object used everywhere in the app — the Singleton pattern.

---

## 3. `firebase_service.py` — Database Layer

This file is the only place that touches Firebase. Every other file calls these functions.

```python
_db = None
_initialized = False
```
**What this does:** Global state for the database connection. `_initialized` prevents connecting twice.

```python
def initialize_firebase():
    global _db, _initialized
    if _initialized:
        return
    cred_path = settings.firebase_credentials_path
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _db = firestore.client()
        _initialized = True
    else:
        logger.warning("Firebase credentials not found — running in mock mode")
```
**What this does:** Connects to Firebase once on startup. If the credentials file is missing, runs in "mock mode" — the server still starts, all db functions return safely without crashing (useful for development).

```python
def create_document(collection: str, data: dict, doc_id: str = None) -> str:
    data["createdAt"] = firestore.SERVER_TIMESTAMP
    if doc_id:
        _db.collection(collection).document(doc_id).set(data)
        return doc_id
    else:
        _, ref = _db.collection(collection).add(data)
        return ref.id
```
**What this does:** Saves a document to Firestore. Automatically adds a timestamp. Returns the document ID.

```python
def query_documents(collection: str, filters: list = None, limit: int = None) -> list:
    ref = _db.collection(collection)
    if filters:
        for field, op, value in filters:
            ref = ref.where(field, op, value)
    if limit:
        ref = ref.limit(limit)
    return [{"id": doc.id, **doc.to_dict()} for doc in ref.stream()]
```
**What this does:** Searches a collection. Applies each filter, then runs the query. Returns results as a list of dicts with the document ID added in.

---

## 4. `ollama_service.py` — AI Engine

### `generate_questions()` — Fixed MCQ Generation

```python
content = lesson_content[:4000]
```
Truncates content to 4000 characters — LLMs have a limit on how much text they can process at once.

```python
prompt = f"""...
STRICT RULES:
1. Generate EXACTLY {count} questions...
2. Each question MUST have EXACTLY 4 options labeled A), B), C), D).
3. EXACTLY ONE option must be correct...
4. NEVER use options like "None of the above"...
Return ONLY a valid JSON array..."""
```
The prompt uses strict numbered rules to force the AI to follow the format. Without rules like "NEVER use None of the above", the AI would sometimes say all options are wrong — which breaks grading.

---

### `_validate_questions()` — The Quality Gate

Every question the AI returns is checked:
1. Must have all required fields (question, options, correct_answer)
2. Must have exactly 4 options
3. correct_answer must be a single letter A, B, C, or D
4. No banned phrases like "none of the above" in any option
5. The answer letter must actually point to one of the 4 options

Questions that fail any check are silently dropped. This is why sometimes you get 4 questions when you asked for 5 — one was bad and got discarded.

---

### `build_answer_key()` — Answer Key Builder

```python
def build_answer_key(questions: list) -> list:
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
```
**What this does:** Builds a clean list like `[{number: 1, correct_letter: "B", correct_text: "A Queue", explanation: "..."}]`.

**IMPORTANT — This is NEVER saved to Firestore.** It is computed from question data on demand and returned in the API response. The frontend stores it in React state and shows/hides it behind a button.

**Used in 4 places:**
- After AI generates questions from a lesson → Answer Key modal pops up for educator
- After PDF upload generates questions → Same modal
- When student requests a practice set → revealed behind "Show Answer Key" button
- When anyone opens a question bank → revealed behind "Answer Key" button

---

### `generate_practice_questions()` — Fresh Practice Every Time

```python
def generate_practice_questions(topics: list, existing_content: str = "", count: int = 5) -> list:
```
Generates brand new questions from Ollama each time — not fetched from DB. This is why pressing "New Practice Set" always gives different questions.

---

### `ask_from_material()` — Grounded Q&A

```python
prompt = f"""Answer ONLY based on the material provided below.
If the material does not contain enough information, say "I couldn't find this."
Do NOT make up facts..."""
```
Prevents hallucination by explicitly instructing the AI to stay within the uploaded material.

---

### `explain_answer()` — Fast Because It's Tiny

```python
def explain_answer(question: str, student_answer: str, correct_answer: str) -> str:
```
This is fast because the prompt is tiny — just a question, the student's answer, and the correct answer. Ollama only needs to write 3-4 sentences. Compare this to generating 5 full MCQs which requires a much larger prompt and structured JSON output.

**Not stored anywhere.** The explanation lives only in the HTTP response and disappears when the page reloads.

---

## 5. `pdf_parser.py` — PDF Text Extraction

```python
def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n\n"
```
**What this does:**
- `io.BytesIO(pdf_bytes)` — wraps raw bytes in a fake file so PyPDF2 can read it without saving to disk
- Loops through every page, extracts text, adds spacing between pages
- **Limitation:** Only works on PDFs with actual text — scanned/image PDFs return nothing

---

## 6. `schemas.py` — Data Models

```python
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    institution: Optional[str] = None
```
**What this does:** Defines what a registration request must look like. FastAPI automatically validates every incoming request against this model. Wrong types or missing required fields → automatic 422 error.

```python
class QuestionResponse(BaseModel):
    correct_answer: str = ""
```
**Why `= ""`:** For students, this field is intentionally set to empty string by the backend — they can't see answers through the API response. The answer key is a separate object computed and then revealed only via the frontend toggle.

---

## 7. `auth.py` — Login & Registration

### `get_current_user()` — The Identity Checker

```python
async def get_current_user(creds = Depends(security)) -> TokenData:
    decoded = verify_firebase_token(creds.credentials)
    uid = decoded.get("uid", "")
    user_doc = get_document("users", uid)
    role = user_doc.get("role", "student") if user_doc else "student"
    return TokenData(uid=uid, email=decoded.get("email"), role=role)
```
**What this does:** Run automatically on every protected request via `Depends()`. Verifies the Firebase token, looks up the user's role in Firestore, returns a `TokenData` object.

### `require_role()` — The Permission Guard

```python
def require_role(*roles):
    async def check(user = Depends(get_current_user)) -> TokenData:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check
```
**What this does:** A function that returns another function (closure/factory pattern). Used as `Depends(require_role("educator", "admin"))` — FastAPI calls the whole chain automatically.

### `register()` — Profile Creation After Signup

Login happens entirely on the frontend via Firebase. The backend's `/register` endpoint only saves the profile info (name, role, institution) to Firestore. The user's Firebase Auth UID becomes the Firestore document ID so they're always linked.

---

## 8. `courses.py` — Course Management

### `list_courses()` — Role-based Filtering

```python
if user.role == "educator":
    docs = query_documents("courses", filters=[("educatorId", "==", user.uid)])
else:
    docs = query_documents("courses")
```
Same endpoint, different results based on role. Educators see only their own courses, students see all.

### `enroll()` — Joining a Course

```python
sids = d.get("studentIds", [])
if user.uid in sids:
    raise HTTPException(status_code=400, detail="Already enrolled")
sids.append(user.uid)
update_document("courses", course_id, {"studentIds": sids})
```
Student UIDs are stored in an array inside the course document. Checks for duplicates before adding.

---

## 9. `lessons.py` — Lesson Management

Standard CRUD. The key field is `content` — this is the raw text that the AI reads to generate questions. Educators paste or type lesson text here. The `materialLink` is a separate Google Drive URL just for students to read — the AI doesn't use it.

---

## 10. `ai.py` — AI Features & Questions

### `generate_questions_endpoint()` — Full Flow

1. If request includes content text, use it. If not, fetch it from the lesson in Firestore.
2. Call `generate_questions()` → Ollama generates, `_validate_questions()` filters bad ones
3. Call `build_answer_key()` on the validated questions
4. Save each valid question to Firestore `questions` collection with its `lessonId`
5. Return `{ questions: [...], answer_key: [...] }`

### `upload_pdf_questions()` — PDF Upload Flow

1. Read the uploaded PDF file bytes with `await file.read()`
2. Extract text with `pdf_parser.extract_text_from_pdf()`
3. Pass text to `generate_questions()` — same AI flow as above
4. Save questions, build answer key, return both

### `upload_pdf_ask()` — Student PDF Q&A

1. Read PDF bytes, extract text
2. Call `ask_from_material(text, question)` — AI instructed to ONLY answer from the material
3. Returns the grounded answer — not saved anywhere

### `generate_practice()` — Fresh Practice Set

1. Get student's last 20 attempts from Firestore
2. For each attempt, look up each question to find its topic
3. Calculate accuracy per topic (correct / total × 100)
4. Topics below 70% = weak topics
5. Call `generate_practice_questions(weak_topics)` → Ollama generates fresh questions
6. Call `build_answer_key()` on them
7. Return questions + answer key + topic accuracy data

Students get different questions every time because this calls Ollama fresh on each request — it does NOT pull from the questions DB.

---

## 11. `quizzes.py` — Quiz & Grading System

### `get_quiz()` — Delivering Without Answers

```python
correct_answer=q.get("correct_answer", "") if user.role != "student" else "",
```
A Python ternary — educators see answers, students get an empty string. This happens at the data layer, not the frontend. Even if a student inspects network traffic, the correct answer is not in the response.

### `submit_quiz()` — Auto-Grading

```python
is_correct = student_answer.upper() == correct_answer.upper()
```
Simple case-insensitive string comparison. Loops through all questions, counts correct ones, calculates percentage, saves the full attempt to `attempts` collection in Firestore. This is what the analytics endpoint reads later.

---

## 12. `analytics.py` — Educator Dashboard Data

One big endpoint that aggregates everything for a course:
1. Fetch all quizzes for the course
2. Fetch all attempts for each quiz
3. For each attempt, look up each answered question to find its topic
4. Calculate per-student scores, per-topic accuracy, per-quiz stats
5. Return it all in one response

Topics below 70% accuracy are flagged as "weak" — shown in orange/red on the dashboard.

---

## 13. `question_banks.py` — Publishable Question Sets

This is separate from quizzes. A question bank is a **practice set** sent directly to students — no timer, no grading, just questions to study from with an answer key they can reveal themselves.

### `create_question_bank()` — Publishing to Students

```python
doc_id = create_document("question_banks", {
    "title": title,
    "courseId": course_id,
    "questionIds": question_ids,
    "published": data.get("published", True),
    "createdBy": user.uid,
})
```
**What this does:** Saves a question bank to the `question_banks` collection. Only stores question IDs (not the full questions) — similar to how quizzes work. Published = True by default so students see it immediately.

**Important:** Creating a question bank does NOT copy or move the questions. The questions still live in the `questions` collection. The bank just holds a list of their IDs.

---

### `list_question_banks()` — Role-based Visibility

```python
if user.role == "student":
    filters.append(("published", "==", True))
```
Students automatically only see published banks. Educators see all (including unpublished/draft banks).

---

### `get_question_bank()` — The Correct Answer Key Pattern

This is the most important function to understand. It has a 3-step pattern:

**Step 1: Fetch all question data with answers included**
```python
full_questions = []
for qid in d.get("questionIds", []):
    q = get_document("questions", qid)
    if q:
        full_questions.append({
            "correct_answer": q.get("correct_answer", ""),  # FULL DATA
            "explanation": q.get("explanation", ""),         # FULL DATA
            ...
        })
```

**Step 2: Build the answer key from FULL data**
```python
answer_key = build_answer_key(full_questions)
```
This must happen BEFORE stripping — otherwise the answer key would be blank for students (which was a bug we fixed).

**Step 3: Strip answers from the question list for students**
```python
response_questions = []
for q in full_questions:
    rq = {**q}
    if user.role == "student":
        rq["correct_answer"] = ""
        rq["explanation"] = ""
    response_questions.append(rq)
```
The question list sent to students has empty answer fields. But the `answer_key` (a separate object) is always complete — the frontend hides it behind a button click.

---

### `toggle_publish()` — Instant Publish/Unpublish

```python
new_status = not d.get("published", False)
update_document("question_banks", bank_id, {"published": new_status})
```
Flips the boolean. If published → unpublished, students immediately stop seeing it. If unpublished → published, students immediately see it. No delays.

---

### `delete_question_bank()` — Safe Delete

```python
delete_document("question_banks", bank_id)
```
Only deletes the bank document — the underlying questions in the `questions` collection are untouched. The educator's question pool remains complete.

---

## Key Concept: Quiz vs Question Bank

| | Quiz | Question Bank |
|-|------|--------------|
| Stored in | `quizzes` collection | `question_banks` collection |
| Has timer | Yes (`duration` field) | No |
| Graded | Yes (attempt saved to `attempts`) | No |
| Answer revealed | Only after submission | Student reveals anytime via toggle |
| Purpose | Formal assessment | Practice / self-study |
| Who sees answers | After grading | After toggling key button |
