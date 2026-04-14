# RBU Platform — Library Justification & Alternatives

> For viva/presentation: Why each library was chosen, what it does, and what we could have used instead.

---

## Backend Libraries

---

### 1. FastAPI

**What it is:** The web framework that runs the entire backend server.

**Why we used it:**
- FastAPI is built on Python and designed specifically for building APIs
- It automatically validates incoming data — if a frontend sends the wrong data type, FastAPI rejects it immediately without us writing any validation code
- It auto-generates interactive documentation (Swagger UI) at `/docs` — you can test every endpoint from the browser
- It supports `async/await` natively, meaning it can handle many users at once without slowing down
- It uses Python **type hints** to declare what data looks like, which makes the code self-documenting

**Simple analogy:** FastAPI is like a receptionist that checks everyone's ID and paperwork before letting them into the office. It handles the boring checking so the actual code can focus on the real work.

**Alternatives we considered:**

| Alternative | Why we didn't use it |
|-------------|----------------------|
| **Flask** | Older, doesn't have automatic validation or async support out of the box. We'd need to add extra libraries manually (Marshmallow for validation, etc.) |
| **Django** | A full framework with too many built-in features we don't need (ORM, templating engine). Overkill for an API-only backend. Much more boilerplate code |
| **Django REST Framework** | Requires Django + adds another layer. Heavy setup for what is essentially the same result |
| **Express.js (Node)** | Would require switching from Python to JavaScript. Our AI integration (Ollama) has a better Python client |

**Verdict:** FastAPI is the fastest way to build a modern, validated Python API. For a project that's AI-heavy and needs clean data contracts, it's the ideal choice.

---

### 2. Uvicorn

**What it is:** The actual server that "runs" FastAPI and listens for incoming HTTP connections.

**Why we used it:**
- FastAPI by itself is just a framework — it describes how to handle requests but can't actually listen on a network port. Uvicorn is the engine that makes it listen
- It supports ASGI (Asynchronous Server Gateway Interface) — this allows async code to run properly
- Very lightweight and extremely fast — one of the fastest Python servers available
- Official recommendation by FastAPI's own documentation

**Command used:** `uvicorn app.main:app --reload`
- `app.main` = the Python file to run (`backend/app/main.py`)
- `app` = the FastAPI object inside that file
- `--reload` = restart automatically when code changes (dev only)

**Alternatives:**

| Alternative | Notes |
|-------------|-------|
| **Gunicorn** | Older, doesn't support async/ASGI natively. Often used with Uvicorn workers in production |
| **Hypercorn** | Also ASGI-compatible, but Uvicorn has better documentation and community |
| **Daphne** | Designed for Django Channels. Not ideal for FastAPI |

---

### 3. Pydantic & Pydantic-Settings

**What it is:** A data validation library. We use it to define exactly what shape data must be in.

**Why we used it:**
- When the frontend sends a registration request, we need to make sure it contains an email, a name, and a role. Pydantic checks this automatically
- If any field is missing or the wrong type, Pydantic raises a clear error immediately — no need to write `if "email" not in data` checks everywhere
- FastAPI is built on top of Pydantic — they're designed to work together
- `pydantic-settings` lets us load `.env` file variables into Python objects with type safety (e.g., `settings.ollama_model` is guaranteed to be a string)

**Simple analogy:** Pydantic is like a customs form at the airport — you fill it out, they check every field, and if anything's wrong you get sent back before you cause problems.

**Alternative:** `Marshmallow` — an older validation library for Python. Pydantic is faster and has cleaner syntax. FastAPI uses Pydantic internally, so there's no reason to swap it out.

---

### 4. Firebase Admin SDK (`firebase-admin==6.6.0`)

**What it is:** Google's official Python library for server-side access to Firebase services.

**Why we used it:**
- **Token verification:** When a user logs in on the frontend, Firebase gives them a JWT token. The backend uses this SDK to verify that token is genuine and hasn't been tampered with
- **Firestore access:** Read and write data to the cloud database
- **No password handling:** We never store or touch passwords. Firebase handles all of that on the client side. The backend only ever sees a verified token
- The free tier (Spark plan) is sufficient for a university-scale demo

**Why Firebase over a traditional database?**

| Option | Pros | Cons |
|--------|------|------|
| **Firebase (our choice)** | Auth handled for free, no server to maintain, scales automatically | Less control, NoSQL means no joins |
| **PostgreSQL + JWT** | Full SQL power, complete control | Must write auth from scratch, manage server, handle password hashing |
| **MongoDB + Auth0** | Similar to Firebase but separate services | Two vendors to manage, costs more |
| **MySQL** | Simple, familiar | No built-in auth, must host it yourself |

**Verdict:** For a project where speed of development matters and we don't need complex relational queries, Firebase + Firestore is the most practical choice. Auth is done, hosting is done, scaling is done.

---

### 5. Ollama (`ollama==0.4.7`)

**What it is:** A Python client for communicating with locally-running AI language models.

**Why we used it:**
- **Privacy:** All AI inference runs on your machine. No student data, no exam content, no questions are ever sent to OpenAI or any external server
- **No cost:** No API fees, no per-token pricing, no usage limits
- **Offline capable:** Works without internet after the model is downloaded
- Simple API — a single function call generates text

**Code example:**
```python
import ollama
response = ollama.chat(
    model="llama3.2:3b",
    messages=[{"role": "user", "content": "Generate 5 MCQs about recursion"}]
)
answer = response["message"]["content"]
```

**Alternatives:**

| Alternative | Why we didn't use it |
|-------------|----------------------|
| **OpenAI API (GPT-4)** | Costs money per request. Student data sent to a US company's servers — privacy concern for an educational institution |
| **Google Gemini API** | Same issue — external API, data leaves your system |
| **Anthropic Claude API** | Same issue |
| **Hugging Face Transformers** | Running models directly without Ollama. Much more complex setup — need to manage GPU memory, tokenizers, model loading manually |
| **LM Studio** | Similar to Ollama but no Python API library |

**Verdict:** Ollama is the best balance of simplicity, privacy, and zero cost for a self-hosted AI solution.

---

### 6. PyPDF2 (`PyPDF2==3.0.1`)

**What it is:** A Python library for reading PDF files and extracting their text content.

**Why we used it:**
- Pure Python — no system dependencies, works on any OS (Windows, Linux, Mac)
- Simple to use — three lines of code to extract all text from a PDF
- Lightweight — doesn't pull in heavy dependencies

**Code example:**
```python
import PyPDF2, io
reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
text = ""
for page in reader.pages:
    text += page.extract_text()
```

**Limitations:**
- Cannot extract text from scanned PDFs (images of pages) — for that you'd need OCR (Optical Character Recognition)
- Doesn't preserve formatting (tables become jumbled text)

**Alternatives:**

| Alternative | Notes |
|-------------|-------|
| **pdfplumber** | Better at handling tables and complex layouts. Slightly heavier |
| **pymupdf (fitz)** | Much faster, more accurate. Requires a compiled C library. Harder to install |
| **pdfminer.six** | More detailed control over PDF parsing. More complex API |
| **pytesseract** | OCR-capable (reads scanned PDFs). Requires Tesseract to be installed system-wide |

**Verdict:** PyPDF2 is the easiest to install and sufficient for PDFs with actual text (not scanned images). Good enough for this use case.

---

### 7. python-multipart

**What it is:** Enables FastAPI to accept file uploads through HTML forms.

**Why we used it:**
- Without this library, FastAPI cannot process `multipart/form-data` requests — the format browsers use to upload files
- Required specifically for the PDF upload endpoints
- Zero configuration — just install it and FastAPI automatically handles file uploads via `UploadFile`

**Alternative:** There is no real alternative — this is the standard Python library for multipart form parsing. FastAPI's own documentation requires it for file uploads.

---

### 8. python-dotenv (`python-dotenv==1.0.1`)

**What it is:** Loads environment variables from a `.env` file into the Python process.

**Why we used it:**
- Secret values (Firebase credentials path, API keys, database passwords) should never be hardcoded in the source code
- `.env` files are added to `.gitignore` so they're never accidentally pushed to GitHub
- Different environments (development vs. production) can have different `.env` files

**Example `.env` file:**
```
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
OLLAMA_MODEL=llama3.2:3b
CORS_ORIGINS=http://localhost:5173
```

**Alternative:** Setting environment variables directly in the OS shell. This works but is not convenient for development — you'd have to set them every time you open a terminal.

---

## Summary Table

| Library | Role | Key Reason Chosen | Main Alternative |
|---------|------|-------------------|-----------------|
| **FastAPI** | Web framework | Auto-validation, async, auto-docs | Flask, Django |
| **Uvicorn** | ASGI server | Fast, required for FastAPI async | Gunicorn |
| **Pydantic** | Data validation | Built into FastAPI, type-safe | Marshmallow |
| **Firebase Admin** | Auth + Database | Auth handled, free tier, no server | PostgreSQL + custom JWT |
| **Ollama** | Local AI | Free, private, no cloud needed | OpenAI API |
| **PyPDF2** | PDF reading | Pure Python, simple install | pdfplumber, pymupdf |
| **python-multipart** | File uploads | Required by FastAPI for forms | No alternative |
| **python-dotenv** | Config management | Keeps secrets out of source code | OS env vars |
