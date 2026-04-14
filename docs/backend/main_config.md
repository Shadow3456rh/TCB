# Application Core (`app/main.py` & `app/config.py`)

These two files act as the foundation of the application. They don't do any heavy lifting (like calling databases or AI) directly, but they set up the environment so that everything else can work safely.

## 1. Application Entry Point (`app/main.py`)

When you type `uvicorn app.main:app` into the terminal to start the server, this is the exact file that executes.

### `lifespan(app: FastAPI)`
This is the "startup and shutdown" sequence.
- **Startup:** Before the server accepts any web traffic, it stops and tests its external connections. It triggers `initialize_firebase()`. Then it pings the local Ollama server to ensure the AI model is actually running. If Ollama isn't running, it prints a yellow warning to the console, but allows the server to keep starting.
- **Yield:** It pauses and hands control over to the actual server.
- **Shutdown:** When you hit CTRL+C to kill the server, the code resumes here to cleanly close down.

### Security and Middleware (`CORSMiddleware`)
This is a critical security step for modern web apps. Browsers have a strict rule: "A website running on `localhost:5173` is NOT allowed to pull data from a server running on `localhost:8000` unless the server explicitly grants permission." CORS (Cross-Origin Resource Sharing) is that explicit permission.

### `app.include_router(...)`
FastAPI uses "routers" to organize massive applications. Instead of putting 100 URL endpoints into this one file, we split them into files like `auth.py` and `courses.py`. This command simply stitches all those files back together, attaching them to prefixes like `/api/auth` or `/api/courses` so the application knows how to route incoming traffic.

## 2. Environment Configuration (`app/config.py`)

This file is responsible for reading the secret `.env` file safely into Python memory.

### `Settings(BaseSettings)`
We use Pydantic `BaseSettings` here. 
- **What it does:** It automatically hunts your local hard drive for files named `.env` and pulls variables from them (like `FIREBASE_PROJECT_ID`). If you forget to put a variable in your `.env` file, the app will crash instantly on startup and warn you, preventing silent bugs later on.
- **`cors_origins_list`:** Environment variables are always saved as strings (text). So `CORS_ORIGINS=http://localhost:5173,http://localhost:3000` is one long piece of text. This helper simply splits that string at the comma, turning it into a neat python list `["http://localhost:5173", "http://localhost:3000"]` so the `main.py` script can read it properly.
