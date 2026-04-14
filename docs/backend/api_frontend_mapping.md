# RBU Platform - API & Function Mapping

This document explains what each major feature of the platform does and maps the frontend calls to the exact Python functions handling the logic on the backend.

---

## 1. Authentication & Users
**Frontend Usage:** Login/Registration screens. Context providers ensure users stay logged in.
**Frontend API File:** `frontend/src/services/api.js` (`authAPI`)

*   **Registration**
    *   **Frontend Function:** `authAPI.register(data)`
    *   **Backend Route:** `POST /api/auth/register`
    *   **Python File:** `backend/app/routes/auth.py`
    *   **Python Function:** `register`
    *   **Description:** After Firebase client-side authentication succeeds, this endpoint stores the new user's profile (name, role, institution) into the Firestore database.

*   **Fetch Logged-In Profile**
    *   **Frontend Function:** `authAPI.getProfile()`
    *   **Backend Route:** `GET /api/auth/me`
    *   **Python File:** `backend/app/routes/auth.py`
    *   **Python Function:** `get_profile`
    *   **Description:** Retrieves the profile details using the Firebase Token associated with the session.

---

## 2. Courses
**Frontend Usage:** Educator and Student dashboards to create or view a list of enrolled/available classes.
**Frontend API File:** `frontend/src/services/api.js` (`coursesAPI`)

*   **Create Course (Educator)**
    *   **Frontend Function:** `coursesAPI.create(data)`
    *   **Backend Route:** `POST /api/courses/`
    *   **Python File:** `backend/app/routes/courses.py`
    *   **Python Function:** `create_course`
    *   **Description:** Allows an educator to create a new class space.

*   **List Courses**
    *   **Frontend Function:** `coursesAPI.list()`
    *   **Backend Route:** `GET /api/courses/`
    *   **Python File:** `backend/app/routes/courses.py`
    *   **Python Function:** `list_courses`
    *   **Description:** Students will see all active courses to enroll in, whereas Educators will only see the courses they created.

*   **Enroll Student**
    *   **Frontend Function:** `coursesAPI.enroll(id)`
    *   **Backend Route:** `POST /api/courses/{course_id}/enroll`
    *   **Python File:** `backend/app/routes/courses.py`
    *   **Python Function:** `enroll`
    *   **Description:** Appends the current student's ID string to the course's `studentIds` list in Firestore.

---

## 3. Lessons & Study Material
**Frontend Usage:** Course View to add documents, view Google Drive content, or rich text lessons.
**Frontend API File:** `frontend/src/services/api.js` (`lessonsAPI`)

*   **Create Lesson**
    *   **Frontend Function:** `lessonsAPI.create(data)`
    *   **Backend Route:** `POST /api/lessons/`
    *   **Python File:** `backend/app/routes/lessons.py`
    *   **Python Function:** `create_lesson`
    *   **Description:** Stores a text lesson and an optional Google Drive `materialLink` tied to a specific `courseId`.

*   **View Lessons**
    *   **Frontend Function:** `lessonsAPI.list(courseId)` / `lessonsAPI.get(id)`
    *   **Backend Route:** `GET /api/lessons/` and `GET /api/lessons/{lesson_id}`
    *   **Python File:** `backend/app/routes/lessons.py`
    *   **Python Function:** `list_lessons`, `get_lesson`
    *   **Description:** Used to display all lessons for a specific course or fetch content for the unified lesson viewer.

---

## 4. Question Bank
**Frontend Usage:** When educators build a Quiz, they build Questions first manually or using AI generation.
**Frontend API File:** `frontend/src/services/api.js` (`questionsAPI`)

*   **Manual Question Creation**
    *   **Frontend Function:** `questionsAPI.create(data)`
    *   **Backend Route:** `POST /api/ai/questions`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `create_manual_question`
    *   **Description:** Adds a standard multiple-choice question to the database manually.

*   **List Questions**
    *   **Frontend Function:** `questionsAPI.list(params)`
    *   **Backend Route:** `GET /api/ai/questions`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `list_questions`
    *   **Description:** Fetches questions for the quiz builder filtering by `lessonId` or `courseId`.

---

## 5. Quizzes & Tests
**Frontend Usage:** Student quiz-taking UI, Educator Quiz creation module, and Attempt history panels.
**Frontend API File:** `frontend/src/services/api.js` (`quizzesAPI`)

*   **Create Quiz**
    *   **Frontend Function:** `quizzesAPI.create(data)`
    *   **Backend Route:** `POST /api/quizzes/`
    *   **Python File:** `backend/app/routes/quizzes.py`
    *   **Python Function:** `create_quiz`
    *   **Description:** Bunches together selected question IDs inside an organized "Quiz" with a time limit and name.

*   **Fetch Quiz (Take Mode)**
    *   **Frontend Function:** `quizzesAPI.get(id)`
    *   **Backend Route:** `GET /api/quizzes/{quiz_id}`
    *   **Python File:** `backend/app/routes/quizzes.py`
    *   **Python Function:** `get_quiz`
    *   **Description:** Provides quiz metadata and expands all its questions. *Note: Correct answers are stripped if the user is a student.*

*   **Submit Answer & Auto-Grade**
    *   **Frontend Function:** `quizzesAPI.submit(id, data)`
    *   **Backend Route:** `POST /api/quizzes/{quiz_id}/submit`
    *   **Python File:** `backend/app/routes/quizzes.py`
    *   **Python Function:** `submit_quiz`
    *   **Description:** Evaluates chosen answers iteratively against the correct answers and stores a graded "Attempt" record in Firestore.

*   **Get Results**
    *   **Frontend Function:** `quizzesAPI.results(id)`
    *   **Backend Route:** `GET /api/quizzes/{quiz_id}/results`
    *   **Python File:** `backend/app/routes/quizzes.py`
    *   **Python Function:** `get_results`
    *   **Description:** Retrieves student submission logs and attempt data for a specific quiz.

---

## 6. Local AI Features (Ollama Engine)
**Frontend Usage:** "Generate Quiz with AI" button, "Explain Answer" prompts on feedback screens, and the interactive Study Practice.
**Frontend API File:** `frontend/src/services/api.js` (`aiAPI`)

*   **Generate Questions using Ollama**
    *   **Frontend Function:** `aiAPI.generateQuestions(data)`
    *   **Backend Route:** `POST /api/ai/generate-questions`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `generate_questions_endpoint`
    *   **Description:** Takes provided lesson text and prompts Ollama to generate valid JSON question definitions locally. (Calls `app.services.ollama_service.generate_questions`)

*   **AI Explain Concept**
    *   **Frontend Function:** `aiAPI.explainConcept(data)`
    *   **Backend Route:** `POST /api/ai/explain-concept`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `explain_concept_endpoint`
    *   **Description:** Compiles specific lesson context to have the LLM clarify or summarize concepts using simplified analogies. (Calls `app.services.ollama_service.explain_concept`)

*   **AI Explain Answer**
    *   **Frontend Function:** `aiAPI.explainAnswer(data)`
    *   **Backend Route:** `POST /api/ai/explain-answer`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `explain_answer_endpoint`
    *   **Description:** Tells the student exactly *why* their selected option was wrong and explains the logic of the correct choice. (Calls `app.services.ollama_service.explain_answer`)

*   **Generate Weak Topic Practice**
    *   **Frontend Function:** `aiAPI.generatePractice()`
    *   **Backend Route:** `POST /api/ai/generate-practice`
    *   **Python File:** `backend/app/routes/ai.py`
    *   **Python Function:** `generate_practice`
    *   **Description:** Tracks recent "Attempts" by the student, discovers which tags/topics their average score dropped below 70%, and constructs a personalized set targeting those exact topics.

---

## 7. Analytics Dashboard
**Frontend Usage:** Educator Analytics Dashboard visualizer (used to plot line graphs, pie charts, and stats).
**Frontend API File:** `frontend/src/services/api.js` (`analyticsAPI`)

*   **View Real-Time Class Analytics**
    *   **Frontend Function:** `analyticsAPI.course(courseId)`
    *   **Backend Route:** `GET /api/analytics/course/{course_id}`
    *   **Python File:** `backend/app/routes/analytics.py`
    *   **Python Function:** `course_analytics`
    *   **Description:** Aggregates and returns:
        - `studentPerformance`: Calculated percentage, attempt counts per student.
        - `topicAnalysis`: Average correctness per question topic across the whole class to detect weak areas.
        - `quizStats`: Highest, lowest, and average class grades for individual quizzes.
