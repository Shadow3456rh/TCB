# RBU Platform — Tech Stack

A full breakdown of every technology used in this project, what it does, and why it was chosen.

---

## Overview

```
┌─────────────────────────────────────────────┐
│                  FRONTEND                   │
│         React 19 + Vite + Tailwind          │
└────────────────────┬────────────────────────┘
                     │ HTTP (Axios)
┌────────────────────▼────────────────────────┐
│                  BACKEND                    │
│              FastAPI (Python)               │
└──────┬───────────────────────┬──────────────┘
       │                       │
┌──────▼──────┐        ┌───────▼──────┐
│  Firebase   │        │    Ollama    │
│  Firestore  │        │  (Local AI)  │
│  Auth       │        │ llama3.2:3b  │
└─────────────┘        └──────────────┘
```

---

## Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.4 | Core UI framework — builds the component-based interface |
| **Vite** | 8.0.4 | Build tool and dev server — blazing fast hot reload during development |
| **Tailwind CSS** | 4.2.2 | Utility-first CSS framework — styles every element using class names |
| **React Router DOM** | 7.14.0 | Client-side routing — navigates between pages without page reloads |
| **Axios** | 1.15.0 | HTTP client — sends requests to the backend API |
| **Firebase (Client SDK)** | 12.12.0 | Handles user sign-in/sign-up and provides auth tokens |
| **Lucide React** | 1.8.0 | Icon library — all the icons (pencil, trash, sparkles, etc.) |
| **Recharts** | 3.8.1 | Charting library — used in the Analytics Dashboard for graphs |
| **React Hook Form** | 7.72.1 | Form state management — handles form inputs, validation, submission |
| **Zod** | 4.3.6 | Schema validation library — validates form data on the client |
| **clsx + tailwind-merge** | latest | Utility helpers for conditionally combining Tailwind class names |

### Why React?
React allows the UI to be split into reusable components (e.g., `Navbar`, `LoadingSpinner`, `CourseCard`). When data changes (like a new quiz result arriving), React automatically re-renders only the affected parts of the page.

### Why Vite?
Vite starts the dev server in milliseconds and uses native ES modules — much faster than older tools like Create React App.

### Why Tailwind CSS?
Styles are written directly in JSX as class names (`className="px-4 py-2 bg-blue-600 text-white rounded-lg"`), which keeps styling co-located with components and avoids writing separate CSS files.

---

## Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Programming language for the entire backend |
| **FastAPI** | latest | Web framework — defines API endpoints, handles routing and validation |
| **Uvicorn** | latest | ASGI server — actually runs the FastAPI app and accepts incoming HTTP connections |
| **Pydantic** | latest | Data validation — defines the shape and types of request/response data |
| **Pydantic Settings** | latest | Loads configuration from `.env` files into typed settings objects |
| **python-multipart** | latest | Enables file uploads (PDF upload endpoints) |
| **python-dotenv** | 1.0.1 | Loads `.env` environment variables into the Python process |

### Why FastAPI?
- Automatically validates incoming request data (wrong types → automatic 422 error)
- Auto-generates interactive API documentation at `/docs` (Swagger UI)
- Native async support — handles many requests simultaneously without blocking
- Very fast — one of the fastest Python frameworks available

---

## Database & Auth Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Firebase Admin SDK** | 6.6.0 | Server-side Firebase — verifies tokens, reads/writes Firestore |
| **Firebase Auth** | (client) | Manages user accounts, sign-in, and session tokens |
| **Google Firestore** | (cloud) | NoSQL cloud database — stores all users, courses, lessons, questions, quizzes, attempts |

### Why Firebase + Firestore?
- **No SQL schema needed** — data is stored as flexible JSON-like documents
- **Auth is handled for you** — Firebase Auth handles password hashing, session management, token generation/verification, and supports Google/email login out of the box
- **Free tier is generous** — suitable for a university-scale demo
- **Real-time capable** — Firestore supports live listeners if needed in the future

### How Firebase Auth works in this project
1. User signs in on the **frontend** using the Firebase Client SDK
2. Firebase gives the user a **JWT token** (a long encoded string)
3. The frontend attaches this token to every API request: `Authorization: Bearer <token>`
4. The **backend** uses Firebase Admin SDK to verify the token is genuine
5. The backend reads the user's role from Firestore and decides what they're allowed to do

---

## AI Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Ollama** | 0.4.7 (Python client) | Local AI inference — runs LLMs on your own machine |
| **llama3.2:3b** | (model) | The actual language model used for question generation and explanations |
| **PyPDF2** | 3.0.1 | PDF text extraction — reads uploaded PDF files and converts them to plain text |

### Why Ollama?
- **100% local** — the AI model runs on your machine, no data is sent to OpenAI or any cloud service
- **Free** — no API costs or usage limits
- **Privacy-safe** — student data and exam content never leave the institution's infrastructure
- **Simple API** — the `ollama` Python library makes it as easy as one function call

### The AI Model: llama3.2:3b
- A 3-billion parameter language model by Meta
- Small enough to run on a regular laptop (4-8GB RAM)
- Capable enough for structured tasks like MCQ generation and concept explanation
- The `:3b` means 3 billion parameters — larger models (7b, 13b) would give better results but need more RAM

### Why PyPDF2?
Simple, pure-Python PDF reader with no external dependencies. Works on any OS without installing system libraries. Good enough for extracting text from standard PDFs. Note: does not work on scanned/image-based PDFs.

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | JavaScript linting — catches bugs and enforces code style in the frontend |
| **Git** | Version control |
| **npm** | Frontend package manager |
| **pip + venv** | Backend package manager and virtual environment |

---

## Project Structure

```
TCB/Project/
├── frontend/                   # React app
│   ├── src/
│   │   ├── pages/              # Full page components
│   │   ├── components/         # Reusable UI components
│   │   ├── services/           # API calls (api.js, firebase.js)
│   │   ├── contexts/           # React Context (Auth, Toast)
│   │   └── lib/                # Utility functions
│   ├── package.json            # Frontend dependencies
│   └── vite.config.js          # Build configuration
│
├── backend/                    # FastAPI app
│   ├── app/
│   │   ├── main.py             # Server entry point
│   │   ├── config.py           # Settings from .env
│   │   ├── routes/             # API endpoint handlers
│   │   │   ├── auth.py
│   │   │   ├── courses.py
│   │   │   ├── lessons.py
│   │   │   ├── quizzes.py
│   │   │   ├── ai.py
│   │   │   └── analytics.py
│   │   ├── services/           # Business logic
│   │   │   ├── firebase_service.py
│   │   │   └── ollama_service.py
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic data models
│   │   └── utils/
│   │       └── pdf_parser.py   # PDF text extraction
│   ├── requirements.txt        # Backend dependencies
│   └── .env                    # Environment variables (not committed to git)
│
└── docs/                       # Documentation
```

---

## Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite dev server) | 5173 | `http://localhost:5173` |
| Backend (Uvicorn) | 8000 | `http://localhost:8000` |
| Ollama (AI server) | 11434 | `http://localhost:11434` |
| Swagger API Docs | 8000 | `http://localhost:8000/docs` |
