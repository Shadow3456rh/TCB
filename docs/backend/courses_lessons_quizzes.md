# Core Entities (`app/routes/courses.py`, `lessons.py`, `quizzes.py`)

These three files manage the primary building blocks of the educational platform. They are mostly standard "CRUD" (Create, Read, Update, Delete) files that interact directly with the database.

## 1. Courses (`app/routes/courses.py`)

- **`create_course()`**: Takes a `title` and `code` from the teacher and creates a new database record. It records the teacher's ID as the `educatorId`. Note that this is protected so only educators can call it.
- **`list_courses()`**: Uses a database query to return a list of courses. If a teacher calls this, it returns their courses. If a student calls this, it returns all available courses so they can browse and enroll.
- **`enroll_course()`**: 
  - **Logic:** This is how a student joins a class. It fetches the course document, looks at the list of `studentIds`, and adds the currently logged-in student's ID to that list. Then it saves the updated list back to the database.

## 2. Lessons (`app/routes/lessons.py`)

- **`create_lesson()`**: A teacher provides a title, and optionally pastes in some raw text `content` or provides a `materialLink` (like a Google Drive URL where the actual syllabus or presentation lives). This gets tied to a specific `courseId` and saved.
- **`list_lessons()` / `get_lesson()`**: Simple fetch operations to display the lessons on the Course Details page.
- **`update_lesson()` / `delete_lesson()`**: Standard functions for editing the text or link of a lesson, or deleting it entirely. Protected so only educators can call them.

## 3. Quizzes (`app/routes/quizzes.py`)

- **`create_quiz()`**: A teacher gives the quiz a `title`, sets a `duration` (in minutes), and provides a list of `questionIds` (the specific questions the students need to answer). This is saved as a single "Quiz" document.
- **`submit_quiz()`**: **This is the Grading Engine.**
  - **Logic:** When a student clicks "Submit", the frontend sends over a dictionary mapping the questions to their chosen answers (e.g., `{"Q1_ID": "A", "Q2_ID": "C"}`).
  - The backend opens up the quiz, loops through every question, and fetches the original question from the database to see what the *actual* correct answer is.
  - It compares the student's answer to the real answer.
  - It tallies up the `score`, counts the `total`, and calculates the `percentage`.
  - It then creates a complete "Receipt" of the test (what they answered vs what the correct answer was) and saves this entire bundle into the database as an `attempt`.
- **`get_quiz_results()`**: When a student goes to the results page, this route fetches their previous `attempt` receipts so they can see what they got right or wrong. When a teacher calls this, it fetches *everyone's* attempts for analytics.
