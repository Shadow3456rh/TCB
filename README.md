# RBU Platform — AI-Powered Educational Assessment

A simplified educational platform that generates AI-powered assessments and provides adaptive learning. Uses **Ollama (Llama 3.2:3b)** for AI features, **React/Vite** for frontend, **FastAPI** for backend, and **Firebase** for auth + database.

## What It Does (6 Core Features)

### Educator Flow
1. **Login → Create Course** → Add lessons with text or PDF
2. **Generate Questions** → Click button → AI reads content → Creates 5 MCQs
3. **Create Quiz** → Students take it with a timer

### Student Flow
4. **Take Quiz** → Submit → See score + AI explanations for wrong answers
5. **Concept Explorer** → Ask AI to explain any topic
6. **Adaptive Practice** → System tracks weak topics (< 70%) → Generates practice set

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.10+ |
| AI | Ollama (Llama 3.2:3b) — direct prompts, no RAG |
| Database | Firebase Firestore + Auth |
| PDF | PyPDF2 — simple text extraction |

## Quick Start

### Prerequisites
- Node.js 18+, Python 3.10+, [Ollama](https://ollama.com)

### 1. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Pull AI model
ollama pull llama3.2:3b

# Configure
# Edit .env with your Firebase project details
# Place firebase-credentials.json in backend/

# Run
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install

# Edit .env with your Firebase web config

npm run dev
```

### 3. Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
Project/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx         # Public homepage
│   │   │   ├── Login.jsx           # Auth (login/register)
│   │   │   ├── Dashboard.jsx       # Role-based home
│   │   │   ├── CourseList.jsx      # Browse/create/manage courses
│   │   │   ├── StudentQuiz.jsx     # Take quiz with timer
│   │   │   ├── QuizResults.jsx     # Score + AI explanations
│   │   │   ├── ConceptExplorer.jsx # Ask AI anything
│   │   │   └── StudentProgress.jsx # Topic accuracy table
│   │   ├── components/common/      # Navbar, ProtectedRoute, Spinner
│   │   ├── contexts/               # Auth + Toast providers
│   │   ├── services/               # API client + Firebase
│   │   └── App.jsx                 # Routing
│   └── .env
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry
│   │   ├── config.py               # Settings
│   │   ├── models/schemas.py       # Pydantic models
│   │   ├── routes/
│   │   │   ├── auth.py             # Register, login, profile
│   │   │   ├── courses.py          # CRUD + enroll
│   │   │   ├── lessons.py          # CRUD + PDF upload
│   │   │   ├── quizzes.py          # Create, take, submit, results
│   │   │   └── ai.py               # Generate Qs, explain, practice
│   │   ├── services/
│   │   │   ├── firebase_service.py # Firestore CRUD + Auth
│   │   │   └── ollama_service.py   # Direct AI prompts
│   │   └── utils/
│   │       └── pdf_parser.py       # PyPDF2 text extraction
│   └── .env
│
└── README.md
```

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| GET | `/api/auth/me` | Get profile |
| POST | `/api/courses/` | Create course |
| GET | `/api/courses/` | List courses |
| POST | `/api/courses/{id}/enroll` | Enroll student |
| POST | `/api/lessons/` | Add lesson |
| POST | `/api/lessons/{id}/upload-pdf` | Upload PDF → extract text |
| POST | `/api/ai/generate-questions` | AI generates MCQs from content |
| POST | `/api/ai/explain-answer` | AI explains wrong answer |
| POST | `/api/ai/explain-concept` | AI explains any concept |
| POST | `/api/ai/generate-practice` | Adaptive practice (weak topics) |
| POST | `/api/quizzes/` | Create quiz |
| POST | `/api/quizzes/{id}/submit` | Submit answers |
| GET | `/api/quizzes/{id}/results` | Get results |

## How to Explain (Demo Script)

**"Our platform has 3 main AI parts:**

1. **Question Generation** — Teacher uploads PDF → We extract text with PyPDF2 → Send to Ollama → Get MCQs back → Store in Firebase

2. **AI Explanations** — Student gets question wrong → We send the question + their answer to Ollama → Get a simple explanation

3. **Adaptive Practice** — We track scores by topic → If below 70% → Generate more questions on that topic"

**No vector databases, no complex algorithms — just simple, working AI features.**

## Notes
- Backend runs in **mock mode** without Firebase credentials (data won't persist)
- AI features require Ollama running locally with `llama3.2:3b`
- The `/docs` endpoint shows interactive Swagger API documentation
