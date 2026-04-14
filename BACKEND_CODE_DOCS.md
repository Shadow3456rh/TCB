# RBU Platform - Backend Code Documentation

This document provides a detailed, file-by-file explanation of the backend codebase. It explains what each Python file does, breaks down the classes and functions inside it, and uses simple words to describe the logic.

---

## 1. Core Application Setup

### `app/main.py`
This is the heart of the backend server. When you start the server, this is the file that runs.

- **`lifespan(app: FastAPI)`**: 
  - **What it does:** This is a special function that runs *before* the server starts receiving web requests, and cleans up when the server stops.
  - **Logic:** It tries to connect to Firebase (our database) using `initialize_firebase()`. Then, it checks if the Ollama AI is running locally on your computer. If anything fails, it prints a warning to the console but doesn't crash the server.
- **`app = FastAPI(...)`**: Creates the actual web server application.
- **`app.add_middleware(CORSMiddleware, ...)`**: Security setting. It tells the backend what frontend websites are allowed to talk to it (configured in `.env`). Without this, the browser would block the frontend from connecting.
- **`global_error(...)`**: A safety net. If any code in the backend crashes unexpectedly, this catches the crash, logs the error, and sends a polite "Internal server error" message to the frontend instead of crashing the whole server.
- **`app.include_router(...)`**: This is how we organize out URLs. It tells the main app to look at the other files (like `auth.py` or `courses.py`) for specific web addresses.

### `app/config.py`
This file manages environment variables (the secret settings stored in `.env`).

- **`Settings(BaseSettings)`**: 
  - **What it does:** A class built with Pydantic that automatically looks at your `.env` file and pulls the values out.
  - **Logic:** If a variable is missing (like `CORS_ORIGINS`), it provides a default value. `cors_origins_list` is a helper property that takes a single string of URLs separated by commas and turns them into a proper Python list.

---

## 2. Models & Data Structures

### `app/models/schemas.py`
This file defines the strict "shapes" of our data using Pydantic. It ensures that when the frontend sends data, it has exactly the right fields, and when the backend sends data, it is formatted correctly.

- **Auth Models (`UserRegister`, `UserResponse`, `TokenData`)**: Define what happens when a user signs up. For example, `UserRegister` ensures an email, password, and name are provided.
- **Course & Lesson Models (`CourseCreate`, `LessonCreate`, etc.)**: Defines that a course needs a `title` and `code`. A lesson needs a `title` and optionally `content` (text) or a `materialLink` (Google Drive URL).
- **Question Models (`QuestionCreate`, `QuestionResponse`)**: Defines the structure of a multiple choice question, ensuring it has 4 `options`, a `correct_answer`, and a `difficulty`.
- **Quiz Models (`QuizCreate`, `QuizSubmission`, `QuizResult`)**: Handles creating a quiz (needs a list of question IDs and a duration), submitting a quiz (sending the answers), and the final result (showing score and percentage).

---

## 3. Services (Connecting to the Outside World)

### `app/services/firebase_service.py`
This file is the "Database Manager". It translates standard python commands into Firebase Cloud Firestore commands.

- **`initialize_firebase()`**: Looks for your `firebase-credentials.json` file and logs the backend into your Google Firebase project securely.
- **`verify_firebase_token(token)`**: When a user logs in on the frontend, Firebase gives them a temporary token. The frontend sends this token to the backend, and this function asks Google, "Is this token real?". If yes, it returns the user's ID.
- **`create_firebase_user(email, password, name)`**: Manually creates a user in the Firebase Authentication system.
- **`create_document(collection_name, data, doc_id)`**: Adds a new item to the database. If `doc_id` is provided, it uses that specific ID, otherwise Firebase randomly generates one. It automatically timestamps when it was created.
- **`get_document(...)`**, **`update_document(...)`**, **`delete_document(...)`**: Basic reading, updating, and deleting of a specific record by its ID.
- **`query_documents(collection_name, filters, limit)`**: The search function. It lets the backend say, "Get me all lessons where the courseId equals X", or "Get me 5 questions where the topic is Y".

### `app/services/ollama_service.py`
This file acts as the translator between your Python backend and the Llama 3.2 AI running on your computer.

- **`generate_questions(lesson_content, count, difficulty)`**:
  - **Logic:** It takes the text notes a teacher provided. It creates a massive text string (the prompt) saying, "You are an educator. Read this content and give me X multiple choice questions in JSON format."
  - It sends this prompt to Ollama.
  - When Ollama replies, it uses a helper function `_extract_json()` to clean up the AI's response and turn it into standard Python dictionaries.
- **`explain_answer(question, student_answer, correct_answer)`**: Creates a prompt saying, "A student answered X but the answer is Y. Explain why Y is correct in simple terms."
- **`explain_concept(concept, lesson_content)`**: Asks the AI to explain a specific topic or concept, using the provided lesson notes as context if available.
- **`check_health()`**: Pings Ollama to see if it is running.

---

## 4. Web Routes (The APIs)

These files define the actual URLs (like `/api/auth/register`) that the frontend application calls. 

### `app/routes/auth.py`
Handles logins, registrations, and permissions.

- **`get_current_user()`**: This is a "Dependency". If you put this on a route, FastAPI will intercept the request, look for a Firebase token in the headers, verify it using `firebase_service`, and figure out who the user is. If they don't have a token, it blocks them with a 401 Unauthorized error.
- **`require_role(*roles)`**: Another security checkpoint. It checks if the logged-in user's role (e.g., 'student' or 'educator') is in the allowed list before letting them proceed.
- **`register()`**: The frontend creates the account on Firebase, then calls this route to save the user's profile details (like their name and whether they are a teacher or student) into the Firestore database.
- **`get_profile()`**: Returns the user's details for displaying on the dashboard.

### `app/routes/courses.py` & `app/routes/lessons.py`
These files are very straightforward and handle standard saving and loading of Courses and Lessons.

- They have **`POST`** routes to create new courses/lessons (using `create_document`).
- They have **`GET`** routes to list all courses/lessons (using `query_documents`). 
- **`enroll_course`**: Simply takes a course document, grabs the list of `studentIds`, adds the currently logged-in student's ID to the list, and saves it.

### `app/routes/quizzes.py`
Handles building quizzes and grading them.

- **`create_quiz()`**: Saves a specific combination of questions as a "Quiz".
- **`submit_quiz()`**: 
  - **Logic:** This is the grading engine. When a student submits a quiz, this function loops over every answer they provided. It fetches the original question from the database, checks if the chosen option matches the `correct_answer`, and tallies the score. 
  - It then creates a `QuizResult` containing their final score, percentage, and which ones they got wrong, and saves this attempt to the database for analytics later.
- **`get_quiz_results()`**: Either lists all attempts for a quiz (if you are a teacher) or just your own attempts (if you are a student).

### `app/routes/ai.py`
Connects the Ollama AI service to the frontend buttons.

- **`create_manual_question()`, `list_questions()`**: Standard routes for adding and viewing questions in the database.
- **`generate_questions_endpoint()`**: Calls `generate_questions()` from the AI service, but handles database logic. Once the AI generates the questions, this route iterates through them and saves each one into the database.
- **`generate_practice()`**: 
  - **Logic:** The Adaptive Learning Core. It queries the database for the current student's last 10 quiz attempts. It calculates their success rate per "topic". If any topic is below 70%, it tags it as a "weak topic". 
  - It then asks the database for 3 questions specifically from that weak topic to create a custom practice test. If the student has no weak topics, it provides a random assortment of 5 questions.

### `app/routes/analytics.py`
The data crunching engine for the educator's dashboard.

- **`course_analytics()`**: 
  - **Logic:** This route gathers massive amounts of data and aggregates it. It first finds all quizzes belonging to a specific course. Then it finds *all* student attempts for those quizzes.
  - It groups the scores by student to figure out the "Student Performance" (who is struggling, who is doing well). 
  - It groups the answers by topic to figure out "Topic Analysis" (e.g., 80% of students got 'OOP' questions right, but only 40% got 'Arrays' questions right).
  - It calculates the highest, lowest, and average score per quiz to show class-wide trends.

### `app/utils/pdf_parser.py`
*(Note: Although we switched to Google Drive links for materials, this utility still exists in the codebase for potential future use or localized extraction).*

- **`extract_text_from_pdf(pdf_path)`**: The simplest possible way to read a PDF file using the `PyPDF2` library. It opens the file, loops through every single page, grabs the raw text, and crushes it all into one giant string of text. This text is what gets passed to the AI to read.
