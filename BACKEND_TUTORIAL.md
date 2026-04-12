# RBU Platform - Backend Tutorial

Welcome to the backend of the RBU Educational Platform! This guide will explain how the backend works, what each file does, and break down the key functions in simple terms.

## 🏗️ High-Level Architecture Overview

The backend is built with **FastAPI** (a modern, fast Python web framework). It acts as the "brain," standing between the React frontend and our databases/AI. 

Here is the general flow of how things work:
1. The **React Frontend** asks the backend to do something (e.g., "Create a lesson" or "Generate questions").
2. The **Backend** receives this request through a specific **Route** (URL endpoint).
3. The Route uses **Pydantic Schemas** to validate that the incoming data is correct.
4. The Route then talks to our **Services**:
   - The **Firebase Service** to save or read data.
   - The **Ollama Service** to ask the local AI (Llama-3.2) to generate text.
5. The backend sends a clean response back to the frontend.

---

## 📂 File By File Breakdown

Below is an explanation of every file in the `backend/app` folder and what the functions inside them do.

### `main.py`
This is the **Entry Point** of the entire application. When you run the backend, this is the first script that executes.
- **`lifespan()`**: This function runs right when the server starts. It initializes the connection to Firebase and checks if the Ollama AI is running.
- **`health()`**: A very simple endpoint (`/api/health`) to check if the server is alive.
- **`app.include_router(...)`**: This "registers" all the different category URLs (like `/api/auth`, `/api/courses`) so FastAPI knows about them.

### `config.py`
Holds the secret settings.
- **`Settings` Class**: Automatically reads your `.env` file and loads things like the Firebase Project ID or the Ollama URL.

---

### 📂 `models/` - Data Rules
### `schemas.py`
This file defines the "shape" of our data using a tool called Pydantic. If the frontend tries to send a quiz without a "title", Pydantic will throw an error immediately before it breaks the app.
- **`UserRegister`, `CourseCreate`, `LessonResponse`**: These are classes that strictly define what fields are required (like `title` or `email`) and what type they are (like text or integer).

---

### 📂 `services/` - The Workhorses
This folder handles talking to external systems (Databases and AI).

### `firebase_service.py`
This file contains all the functions that interact with Google Firebase (our database).
- **`initialize_firebase()`**: Connects the backend to your specific Firebase project using the `firebase-credentials.json` file.
- **`verify_firebase_token()`**: When a user logs in, they get a "token". This function proves they really are who they say they are.
- **`create_firebase_user()`**: Creates a brand new account in Firebase Authentication.
- **`get_document(collection, doc_id)`**: Grabs a specific item (like one specific lesson or course) from the database.
- **`query_documents(collection, filters)`**: Grabs a list of items based on rules. (e.g., "Get all questions WHERE lessonId == X").
- **`create_document()`, `update_document()`, `delete_document()`**: The basic functions to add, change, or remove data from the database.

### `ollama_service.py`
This file is responsible for talking to the local AI model (Llama-3.2). 
- **`generate_questions(lesson_content, count, difficulty)`**: Takes the text of a lesson, wraps it in a carefully crafted "Prompt" asking for Multiple Choice Questions, sends it to the AI, and then forces the AI's response into a clean JSON list.
- **`explain_answer(question, student_answer, correct_answer)`**: Sends a prompt to the AI asking it to explain *why* the student got the question wrong in an encouraging way.
- **`explain_concept(concept, context)`**: Sends a prompt asking the AI to explain a term in simple words.

---

### 📂 `routes/` - The Traffic Directors
Routes are the actual web addresses (URLs) the frontend calls. They tie the schemas and services together.

### `auth.py` (Authentication & Users)
- **`get_current_user()`**: A helper function. Any route that uses this forces the user to be logged in to access it.
- **`require_role(...)`**: Forces a user to be logged in AND have a specific role (like "educator").
- **`register()`**: Registers a user. (Note: The frontend actually creates the Firebase Auth user first, and this backend route just saves their extra profile info like their "role" into the database).
- **`get_profile()`**: Returns the logged-in user's details.

### `courses.py` & `lessons.py`
These are simple "CRUD" (Create, Read, Update, Delete) files.
- **`create_course()`, `list_courses()`, `enroll_course()`**: Uses `firebase_service.py` to save or fetch courses from the database.
- **`create_lesson()`, `list_lessons()`**: Similar to courses, but manages lessons. It includes a field for a `materialLink` (like a Google Drive URL).

### `quizzes.py`
- **`create_quiz()`, `get_quiz()`**: Saves and fetches quiz setups.
- **`submit_quiz()`**: This is a key function! When a student finishes a quiz, this function compares their answers against the correct answers in the database, calculates their score and percentage, and saves the "Attempt" to the database.
- **`get_quiz_results()`**: Fetches past attempts for the educator or student to review.

### `ai.py` (AI Generation & Question Bank)
This route connects the frontend buttons to the `ollama_service.py`.
- **`create_manual_question()`, `list_questions()`**: Allows teachers to manually add questions to the database without AI, or list all questions for a course.
- **`generate_questions_endpoint()`**: Gets the text content from a lesson, passes it to `generate_questions()` in the AI service, and then saves the returned questions directly into the Firebase database.
- **`generate_practice()`**: **The Adaptive Practice Engine.** It looks at a student's last 10 quiz attempts, calculates their accuracy per "topic", finds topics where accuracy is under 70%, and gathers highly-targeted practice questions from the database for those weak topics.

### `analytics.py` (Teacher Dashboard)
- **`course_analytics()`**: A massive data-crunching function. It pulls every single quiz attempt for a course. It calculates the average score per student, identifies which specific students are struggling, calculates the success rate of every individual topic across the whole class, and packages it all neatly for the React charts to display.

---

## 🛠️ Summary of How the AI Works (No Complex RAG)

Originally, AI platforms use complex "Vector Databases" (like ChromaDB) to search through massive PDFs. 

To keep this project lightweight and demo-ready, we simplified it:
1. The teacher pastes the raw text of their lesson into the "Content" box when creating a lesson.
2. When they click **"Generate"**, that raw text is shoved directly into a text prompt.
3. The prompt explicitly commands the AI: *"Read this text. Generate 5 MCQs. Output ONLY in JSON format."*
4. The Backend catches that JSON, cleans it up, and saves it to Firebase as regular questions.

By doing it this way, we eliminated the need for heavy vector databases while keeping 100% of the AI magic!
