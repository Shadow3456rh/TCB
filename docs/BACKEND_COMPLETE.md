# RBU Platform — Complete Backend Documentation

> Written in plain English. No prior backend experience required to understand this.

---

## Table of Contents

1. [What is the Backend?](#1-what-is-the-backend)
2. [How the Server Starts](#2-how-the-server-starts)
3. [How Requests Work (The Request Cycle)](#3-how-requests-work-the-request-cycle)
4. [Configuration (`config.py`)](#4-configuration-configpy)
5. [The Database — Firebase & Firestore](#5-the-database--firebase--firestore)
6. [Authentication — Who Are You?](#6-authentication--who-are-you)
7. [Courses](#7-courses)
8. [Lessons](#8-lessons)
9. [Questions & Question Bank](#9-questions--question-bank)
10. [Quizzes & Grading](#10-quizzes--grading)
11. [AI Features — Ollama](#11-ai-features--ollama)
12. [Analytics Dashboard](#12-analytics-dashboard)
13. [Data Models (Schemas)](#13-data-models-schemas)
14. [Firestore Collections Reference](#14-firestore-collections-reference)
15. [All API Endpoints at a Glance](#15-all-api-endpoints-at-a-glance)

---

## 1. What is the Backend?

The **backend** is the engine that runs on the server. The frontend (the website the user sees) sends requests to the backend, the backend does the heavy work, and then sends results back.

Think of it like a restaurant:
- The **frontend** is the customer (places orders, sees the food)
- The **backend** is the kitchen (takes the order, cooks, sends the plate out)
- The **database** is the pantry (stores all the ingredients/data)

This backend is built with **FastAPI** — a Python framework that makes it easy to create web API endpoints.

---

## 2. How the Server Starts

**File:** `backend/app/main.py`

When you run the server (`uvicorn app.main:app`), this is what happens step by step:

1. **FastAPI app is created** — the server object is initialized
2. **CORS Middleware is added** — this allows the frontend (running on a different port) to talk to the backend without browser errors
3. **Firebase is initialized** — connects to Google's database (Firestore) using a credentials file
4. **Ollama is checked** — checks if the local AI model is running and reachable
5. **All routes are registered** — the server registers all URL paths (endpoints) for auth, courses, lessons, AI, etc.

If Firebase credentials are not found, the server runs in **"mock mode"** — it still starts but database operations silently do nothing (useful for development without setting up Firebase).

---

## 3. How Requests Work (The Request Cycle)

Every time a user does something in the app (clicks a button, loads a page), the frontend sends an HTTP request to the backend. Here's what happens:

```
Browser → HTTP Request → FastAPI Router → Route Function → Service/DB → Response → Browser
```

**Example:** A student clicks "Take Quiz"
1. Frontend sends `GET /api/quizzes/abc123` 
2. FastAPI matches this to the `get_quiz` function in `quizzes.py`
3. The function checks who the user is (reads their token)
4. It fetches quiz data from Firestore
5. It returns the quiz data as JSON
6. Frontend displays the quiz

**Authentication happens on every request:** Every protected request must include a Firebase token in the `Authorization: Bearer <token>` header. The backend verifies this token before doing anything.

---

## 4. Configuration (`config.py`)

**File:** `backend/app/config.py`

This file holds all configurable settings. Values are loaded from a `.env` file so they're never hardcoded.

| Setting | What it does | Default |
|---------|-------------|---------|
| `firebase_credentials_path` | Path to the Firebase service account JSON file | `./firebase-credentials.json` |
| `firebase_project_id` | Your Firebase project ID | `your_project_id` |
| `ollama_base_url` | Where the local AI server is running | `http://localhost:11434` |
| `ollama_model` | Which AI model to use | `llama3.2:3b` |
| `cors_origins` | Which frontend URLs are allowed to connect | `http://localhost:5173` |
| `environment` | `development` or `production` | `development` |

---

## 5. The Database — Firebase & Firestore

**File:** `backend/app/services/firebase_service.py`

**Firestore** is Google's cloud database. Think of it like a collection of folders, and each folder contains documents (like JSON files). There are no SQL tables — just collections and documents.

This file provides 5 simple functions that every other part of the backend uses:

### `create_document(collection, data, doc_id=None)`
Saves a new record to the database.  
- If you provide a `doc_id`, the document will have that exact ID (used when registering users, so the Firestore ID matches the Firebase Auth UID)
- If not, Firestore auto-generates a random ID
- Automatically adds a `createdAt` timestamp

```python
# Example: Save a new course
doc_id = create_document("courses", {"title": "Python 101", "educatorId": "user123"})
# Returns the auto-generated document ID like "xK9dJp2mNq"
```

### `get_document(collection, doc_id)`
Fetches one document by its ID. Returns `None` if not found.

```python
course = get_document("courses", "xK9dJp2mNq")
# Returns: {"id": "xK9dJp2mNq", "title": "Python 101", "educatorId": "user123"}
```

### `update_document(collection, doc_id, data)`
Updates specific fields on an existing document without replacing the whole thing.

```python
update_document("courses", "xK9dJp2mNq", {"studentIds": ["student1", "student2"]})
```

### `delete_document(collection, doc_id)`
Permanently deletes a document.

### `query_documents(collection, filters=[], limit=None)`
Searches a collection with optional filters. Returns a list of matching documents.

```python
# Get all courses owned by educator "user123"
docs = query_documents("courses", filters=[("educatorId", "==", "user123")])
```

> **Mock Mode:** If Firebase isn't set up, all these functions silently do nothing and return safe empty values. This lets the server start without crashing.

---

## 6. Authentication — Who Are You?

**File:** `backend/app/routes/auth.py`

Authentication answers the question: *"Who is making this request, and are they allowed to?"*

The platform uses **Firebase Authentication** — users sign in through Google/email on the frontend, and Firebase gives them a **token** (a long encoded string). This token is sent with every backend request to prove identity.

### How token verification works

```
User logs in on frontend → Firebase gives them a token
→ Frontend sends token in every API request header
→ Backend calls verify_firebase_token() → Gets user's UID and email
→ Backend looks up their role from Firestore ("student", "educator", "admin")
```

### Key functions

**`get_current_user()`**  
This is a FastAPI "dependency" — any route that needs to know who the user is adds `Depends(get_current_user)` to its parameters. FastAPI automatically calls this function and injects the result.

It verifies the token, finds the user's profile in Firestore, and returns a `TokenData` object containing `uid`, `email`, and `role`.

**`require_role(*roles)`**  
A stricter version of `get_current_user`. Only allows the request through if the user has one of the required roles. Otherwise returns a `403 Forbidden` error.

```python
# Example: Only educators and admins can call this
async def create_course(user = Depends(require_role("educator", "admin"))):
```

### Endpoints

| Method | Path | What it does |
|--------|------|-------------|
| `POST` | `/api/auth/register` | After sign-up on frontend, this saves the user's name/role/institution to Firestore |
| `GET` | `/api/auth/me` | Returns the logged-in user's profile data |

**Important:** The actual sign-up (creating the account) happens on the *frontend* using Firebase client SDK. The backend's `/register` endpoint only saves the extra profile info (name, role, institution).

---

## 7. Courses

**File:** `backend/app/routes/courses.py`

Courses are the top-level containers — like a class or subject. Educators create them, students enroll in them.

### How courses are stored in Firestore
Each course document looks like:
```json
{
  "title": "Introduction to CS",
  "code": "CS101",
  "description": "Learn the basics...",
  "educatorId": "uid-of-the-educator",
  "studentIds": ["uid-student1", "uid-student2"],
  "createdAt": "2026-04-14T..."
}
```

### Endpoints

| Method | Path | Who | What it does |
|--------|------|-----|-------------|
| `POST` | `/api/courses/` | Educator/Admin | Creates a new course. The educator's UID is automatically saved as `educatorId` |
| `GET` | `/api/courses/` | Anyone | **Educators** see only their own courses. **Students** see all courses |
| `GET` | `/api/courses/{id}` | Anyone | Gets one specific course by ID |
| `POST` | `/api/courses/{id}/enroll` | Student | Adds the student's UID to the course's `studentIds` array. Prevents duplicate enrollment |
| `DELETE` | `/api/courses/{id}` | Educator/Admin | Deletes the course |

---

## 8. Lessons

**File:** `backend/app/routes/lessons.py`

Lessons live inside a course. A lesson can have:
- A **title** (shown in the UI)
- **Text content** (used by the AI to generate questions)
- A **material link** (a Google Drive URL to a PDF/PPT for students to read)

### Endpoints

| Method | Path | Who | What it does |
|--------|------|-----|-------------|
| `POST` | `/api/lessons/` | Educator/Admin | Creates a lesson, linking it to a course via `courseId` |
| `GET` | `/api/lessons/` | Anyone | Lists all lessons. Pass `?courseId=...` as a URL parameter to filter by course |
| `GET` | `/api/lessons/{id}` | Anyone | Gets one specific lesson |
| `PUT` | `/api/lessons/{id}` | Educator/Admin | Updates a lesson's title, content, or material link |
| `DELETE` | `/api/lessons/{id}` | Educator/Admin | Deletes a lesson |

---

## 9. Questions & Question Bank

**File:** `backend/app/routes/ai.py` (questions are managed here alongside AI features)

Questions are individual MCQ items stored in the `questions` Firestore collection. They can be:
- **Created manually** by an educator (no AI involved)
- **Generated by AI** from lesson text
- **Generated by AI** from an uploaded PDF

### Question structure in Firestore
```json
{
  "lessonId": "lesson-abc",
  "question": "What is a variable in programming?",
  "options": ["A) A fixed value", "B) A named storage location", "C) A function", "D) A loop"],
  "correct_answer": "B",
  "explanation": "A variable is a named container that stores a value in memory.",
  "difficulty": "easy",
  "topic": "Variables",
  "generated_by": "ai",
  "approved": false
}
```

### Endpoints

| Method | Path | Who | What it does |
|--------|------|-----|-------------|
| `POST` | `/api/ai/questions` | Educator/Admin | Manually creates a question without AI |
| `GET` | `/api/ai/questions` | Anyone | Lists questions. Filter with `?lessonId=...` or `?courseId=...`. Students automatically get answers **hidden** |
| `DELETE` | `/api/ai/questions/{id}` | Educator/Admin | Deletes a question |

> **Note on student privacy:** When a student calls `GET /api/ai/questions`, the `correct_answer` and `explanation` fields are automatically stripped from the response. They only see the question text and options.

---

## 10. Quizzes & Grading

**File:** `backend/app/routes/quizzes.py`

A quiz is a bundle of questions that the educator assembles and assigns to students. The backend handles:
1. **Creating** the quiz (educator picks questions and sets a time limit)
2. **Delivering** the quiz (student requests it, gets questions without answers)
3. **Auto-grading** submissions (backend scores it and saves the attempt)
4. **Results retrieval** (educator sees all student attempts; student sees only their own)

### Key concepts

**Quiz → Questions:** A quiz stores a list of question IDs (`questionIds`). When a student opens a quiz, the backend fetches all those question documents from Firestore and returns them together.

**Attempt:** Every time a student submits a quiz, a new document is saved in the `attempts` collection. This stores their answers, score, and time spent.

### Auto-grading logic (`submit_quiz`)
1. Fetch quiz → get list of question IDs
2. Fetch each question document → get correct answer
3. Compare student's answer for each question
4. Count correct answers, calculate percentage
5. Save the attempt to `attempts` collection
6. Return the result immediately to the student

```python
# Simplified grading logic
is_correct = student_answer.upper() == correct_answer.upper()
```

### Endpoints

| Method | Path | Who | What it does |
|--------|------|-----|-------------|
| `POST` | `/api/quizzes/` | Educator/Admin | Creates a quiz with selected question IDs and duration |
| `GET` | `/api/quizzes/` | Anyone | Lists quizzes. Filter with `?courseId=...` |
| `GET` | `/api/quizzes/{id}` | Anyone | Gets quiz with full question objects. **Students see questions without answers** |
| `POST` | `/api/quizzes/{id}/submit` | Anyone | Submits answers, grades them, saves attempt, returns score |
| `GET` | `/api/quizzes/{id}/results` | Anyone | Educators see all attempts; students see only their own |

---

## 11. AI Features — Ollama

**Files:** `backend/app/routes/ai.py` + `backend/app/services/ollama_service.py` + `backend/app/utils/pdf_parser.py`

The AI features use **Ollama** — a locally-running AI system. This means the AI model runs on your own machine, not any external cloud service. No data leaves your system.

### How Ollama is used

The backend talks to Ollama through the `ollama` Python library. It sends a text prompt and Ollama returns a text response. The backend then parses that response.

```python
response = ollama.chat(
    model="llama3.2:3b",
    messages=[{"role": "user", "content": prompt}]
)
answer = response["message"]["content"]
```

---

### Feature 1: Generate Questions from Lesson Text

**Endpoint:** `POST /api/ai/generate-questions`  
**Who can use it:** Educators only

**How it works:**
1. Educator sends the `lessonId` and optional settings (count, difficulty)
2. Backend fetches the lesson's text content from Firestore
3. Sends the text to Ollama with a strict prompt (see below)
4. Ollama returns a JSON array of questions
5. Each question is **validated** — invalid ones are thrown out
6. Valid questions are **saved to Firestore** in the `questions` collection
7. Returns the saved questions + a full **answer key**

**The prompt strategy:** The prompt gives Ollama very specific rules:
- Exactly 4 options labeled A, B, C, D
- One correct answer that must match one of the 4 options
- No "none of the above" or "all of the above" type answers
- Must include an explanation for why the correct answer is right

**Validation (`_validate_questions`):**
After Ollama responds, every question is checked:
- Does it have exactly 4 options? If not, discard it
- Is the `correct_answer` a single letter A, B, C, or D? If not, discard it
- Does any option contain "none of the above" or similar banned phrases? If yes, discard it
- Does the correct answer letter actually point to one of the 4 options? If not, discard it

**Answer Key (`build_answer_key`):**
Builds a clean summary of correct answers with explanations. This is returned to the educator for verification.

---

### Feature 2: Upload PDF → Generate Question Bank

**Endpoint:** `POST /api/ai/upload-pdf-questions` (multipart form upload)  
**Who can use it:** Educators only

**How it works:**
1. Educator uploads a PDF file through the request
2. `extract_text_from_pdf()` in `pdf_parser.py` extracts all text from the PDF using PyPDF2
3. The extracted text is sent to Ollama just like lesson text
4. Questions are generated, validated, and saved to Firestore
5. Returns questions + answer key + how many characters were extracted

**PDF Parser (`utils/pdf_parser.py`):**  
Reads the PDF byte by byte, extracts text from each page, concatenates it all into one string. If a PDF has scanned images instead of text (like a photo of a page), this will return empty text.

---

### Feature 3: Upload PDF → Student Asks Questions

**Endpoint:** `POST /api/ai/upload-pdf-ask` (multipart form upload)  
**Who can use it:** Anyone (students)

**How it works:**
1. Student uploads a PDF + types a question
2. Backend extracts text from the PDF
3. Sends both the text AND the question to Ollama with a strict grounding instruction
4. The instruction tells Ollama: *"Answer ONLY from this material. If the answer isn't in it, say so."*
5. Returns the answer

This prevents hallucination because the AI is explicitly told it cannot use knowledge outside of the provided text.

---

### Feature 4: Explain a Wrong Answer

**Endpoint:** `POST /api/ai/explain-answer`  
**Who can use it:** Anyone

After a student gets a question wrong, they can ask why. Backend sends:
- The question text
- What the student answered
- What the correct answer is

Ollama explains the correct answer in a friendly, encouraging way.

---

### Feature 5: Explain a Concept

**Endpoint:** `POST /api/ai/explain-concept`  
**Who can use it:** Anyone

A student types any concept they don't understand. If they provide a `lessonId`, the backend fetches that lesson's content and includes it as context in the prompt. Ollama then gives a simple explanation with an example.

---

### Feature 6: Generate Fresh Practice Set

**Endpoint:** `POST /api/ai/generate-practice`  
**Who can use it:** Anyone (students)

**How it works:**
1. Fetches the student's last 20 quiz attempts from Firestore
2. For each attempt, looks at each question answered and which topic it belonged to
3. Calculates accuracy per topic: `(correct / total) * 100`
4. Topics below 70% accuracy are marked as "weak"
5. **Generates FRESH AI questions** targeting those weak topics (not pulled from DB)
6. Returns the new questions + answer key + topic accuracy data

**If AI generation fails:** Falls back to fetching existing questions from DB for the weak topics.

**This is why it generates new questions every time** — it calls Ollama fresh each press, so each practice set is unique.

---

### AI Health Check

**Endpoint:** `GET /api/ai/health`  
**Who can use it:** Anyone

Simply calls `ollama.list()` to see if Ollama is running. Returns `{ "ollama_available": true/false }`.

---

## 12. Analytics Dashboard

**File:** `backend/app/routes/analytics.py`

**Endpoint:** `GET /api/analytics/course/{course_id}`  
**Who can use it:** Educators only

This is the big data aggregation endpoint that powers the educator's analytics dashboard. It does a lot of work in one call:

### What it calculates

**Step 1: Gather all raw data**
- Fetch the course document
- Get all quizzes for this course
- Get all quiz attempts for all those quizzes
- Get user profiles for all enrolled students

**Step 2: Per-student performance**
For each student:
- Count how many quizzes they took
- Add up their total correct answers and total questions
- Calculate their overall average score: `(total_correct / total_questions) * 100`
- Sort students from worst to best (weakest first, so educator notices them)

**Step 3: Per-topic analysis**
Goes through every attempt → every question answered → looks up the topic tag on that question:
- Counts total attempts per topic
- Counts correct answers per topic
- Calculates accuracy per topic
- Marks topics below 70% as "weak"
- Counts how many unique students attempted each topic

**Step 4: Per-quiz statistics**
For each quiz:
- How many students took it
- Average score across all students
- Highest score
- Lowest score

**Step 5: Overall course stats**
- Total number of students enrolled
- Total quizzes created
- Total quiz attempts
- Overall average score across all attempts

### What gets returned
```json
{
  "courseId": "...",
  "courseTitle": "...",
  "totalStudents": 25,
  "totalQuizzes": 5,
  "totalAttempts": 87,
  "overallAvgScore": 71.4,
  "studentPerformance": [...],
  "topicAnalysis": [...],
  "quizStats": [...]
}
```

---

## 13. Data Models (Schemas)

**File:** `backend/app/models/schemas.py`

Schemas define the shape of data coming in and going out. FastAPI uses these to:
1. **Validate incoming data** — if the frontend sends wrong data, FastAPI rejects it automatically
2. **Document the API** — auto-generates Swagger docs at `/docs`

Here are all the models:

### Auth
| Model | Used for |
|-------|---------|
| `UserRegister` | Registration form data (email, password, name, role, institution) |
| `UserResponse` | What gets sent back about a user (no password!) |
| `TokenData` | Internal object representing the logged-in user (uid, email, role) |

### Courses
| Model | Used for |
|-------|---------|
| `CourseCreate` | Creating a course (title, code, description) |
| `CourseResponse` | A course object returned to the frontend |

### Lessons
| Model | Used for |
|-------|---------|
| `LessonCreate` | Creating a lesson (courseId, title, content, materialLink) |
| `LessonResponse` | A lesson object returned to the frontend |

### Questions
| Model | Used for |
|-------|---------|
| `QuestionCreate` | Manually creating a question |
| `QuestionResponse` | A question returned to frontend (correct_answer is hidden for students) |

### Quizzes
| Model | Used for |
|-------|---------|
| `QuizCreate` | Creating a quiz (courseId, title, questionIds, duration) |
| `QuizResponse` | A quiz with embedded question objects |
| `QuizSubmission` | Student's answers + time spent |
| `QuizResult` | Score, percentage, per-question results |

### AI
| Model | Used for |
|-------|---------|
| `GenerateQuestionsRequest` | Request to generate AI questions (lessonId, count, difficulty) |
| `ExplainAnswerRequest` | Request to explain a wrong answer |
| `ExplainAnswerResponse` | The explanation text |
| `ConceptExplainRequest` | Request to explain a concept |
| `ConceptExplainResponse` | The explanation text |
| `StudentAskResponse` | Answer from PDF-grounded Q&A |

---

## 14. Firestore Collections Reference

Firestore stores data in **collections** (like tables) made up of **documents** (like rows). Here's every collection used:

| Collection | What's stored |
|-----------|--------------|
| `users` | User profiles (name, email, role, institution) |
| `courses` | Course records (title, code, educatorId, studentIds list) |
| `lessons` | Lesson content (courseId, title, content text, materialLink) |
| `questions` | MCQ questions (lessonId, question, options, correct_answer, explanation, topic) |
| `quizzes` | Quiz records (courseId, title, questionIds list, duration) |
| `attempts` | Submitted quiz attempts (studentId, quizId, answers, score, percentage, completedAt) |
| `question_banks` | Published practice sets (title, courseId, questionIds list, published true/false, createdBy) |

### Relationships between collections

```
users
  ↓ (educatorId)
courses
  ↓ (studentIds list inside course)
users (students)

courses
  ↓ (courseId)
lessons
  ↓ (lessonId)
questions
    ↑ (questionIds list inside quiz)
quizzes
    ↓ (quizId + studentId)
attempts
```

---

## 15. All API Endpoints at a Glance

| Method | Endpoint | Auth Required | Role |
|--------|----------|--------------|------|
| `GET` | `/api/health` | No | — |
| **Auth** | | | |
| `POST` | `/api/auth/register` | Optional | — |
| `GET` | `/api/auth/me` | Yes | Any |
| **Courses** | | | |
| `POST` | `/api/courses/` | Yes | Educator/Admin |
| `GET` | `/api/courses/` | Yes | Any |
| `GET` | `/api/courses/{id}` | Yes | Any |
| `POST` | `/api/courses/{id}/enroll` | Yes | Any |
| `DELETE` | `/api/courses/{id}` | Yes | Educator/Admin |
| **Lessons** | | | |
| `POST` | `/api/lessons/` | Yes | Educator/Admin |
| `GET` | `/api/lessons/` | Yes | Any |
| `GET` | `/api/lessons/{id}` | Yes | Any |
| `PUT` | `/api/lessons/{id}` | Yes | Educator/Admin |
| `DELETE` | `/api/lessons/{id}` | Yes | Educator/Admin |
| **Questions** | | | |
| `POST` | `/api/ai/questions` | Yes | Educator/Admin |
| `GET` | `/api/ai/questions` | Yes | Any |
| `DELETE` | `/api/ai/questions/{id}` | Yes | Educator/Admin |
| **AI** | | | |
| `GET` | `/api/ai/health` | No | — |
| `POST` | `/api/ai/generate-questions` | Yes | Educator/Admin |
| `POST` | `/api/ai/upload-pdf-questions` | Yes | Educator/Admin |
| `POST` | `/api/ai/upload-pdf-ask` | Yes | Any |
| `POST` | `/api/ai/explain-answer` | Yes | Any |
| `POST` | `/api/ai/explain-concept` | Yes | Any |
| `POST` | `/api/ai/generate-practice` | Yes | Any |
| **Quizzes** | | | |
| `POST` | `/api/quizzes/` | Yes | Educator/Admin |
| `GET` | `/api/quizzes/` | Yes | Any |
| `GET` | `/api/quizzes/{id}` | Yes | Any |
| `POST` | `/api/quizzes/{id}/submit` | Yes | Any |
| `GET` | `/api/quizzes/{id}/results` | Yes | Any |
| **Analytics** | | | |
| `GET` | `/api/analytics/course/{id}` | Yes | Educator/Admin |
| **Question Banks** | | | |
| `POST` | `/api/question-banks/` | Yes | Educator/Admin |
| `GET` | `/api/question-banks/` | Yes | Any |
| `GET` | `/api/question-banks/{id}` | Yes | Any |
| `PUT` | `/api/question-banks/{id}/publish` | Yes | Educator/Admin |
| `DELETE` | `/api/question-banks/{id}` | Yes | Educator/Admin |

> **Tip:** You can explore all endpoints interactively by visiting `http://localhost:8000/docs` while the backend is running. FastAPI auto-generates a Swagger UI page.
