"""
RBU Platform — FastAPI Entry Point (Simplified)
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 RBU Platform starting...")

    # Init Firebase
    try:
        from app.services.firebase_service import initialize_firebase
        initialize_firebase()
        logger.info("   ✅ Firebase initialized")
    except Exception as e:
        logger.warning(f"   ⚠️  Firebase init failed: {e}")

    # Check Ollama
    try:
        from app.services.ollama_service import check_health
        if check_health():
            logger.info("   ✅ Ollama available")
        else:
            logger.warning("   ⚠️  Ollama not available")
    except Exception:
        logger.warning("   ⚠️  Ollama check failed")

    yield
    logger.info("👋 Shutting down...")


app = FastAPI(title="RBU Platform API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_error(request: Request, exc: Exception):
    logger.error(f"Error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


# Register routes
from app.routes import auth, courses, lessons, quizzes, ai, analytics, question_banks

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["Quizzes"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(question_banks.router, prefix="/api/question-banks", tags=["Question Banks"])

