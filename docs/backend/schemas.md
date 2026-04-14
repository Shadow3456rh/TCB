# Schemas (`app/models/schemas.py`)

This file contains the "blueprints" for all the data that enters and exits the backend. We use a tool called **Pydantic** here. Pydantic acts like a strict bouncer at the door of the club: if the data doesn't match the exact shape defined here, it gets rejected immediately before it can crash the app.

## Classes Explained in Simple Words:

### Auth Models
- **`UserRegister`**: The strict rules for when a new user signs up. They MUST provide an `email`, `password`, and `name`. By default, their `role` is assumed to be `"student"`, but they can Optionally provide an `institution` (like their school name).
- **`UserResponse`**: Defines exactly what user information the backend is allowed to send back to the frontend (notice there's no password included here!).
- **`TokenData`**: Used internally when we verify a user is logged in. It stores just their `uid` (unique ID), `email`, and `role`.

### Course Models
- **`CourseCreate`**: To make a new course, a teacher MUST provide a `title` and a `code`.
- **`CourseResponse`**: What the frontend receives when it asks for a course. It includes the ID, title, code, the teacher's ID (`educatorId`), and a list of `studentIds` (the students taking the course).

### Lesson Models
- **`LessonCreate`**: Rules for adding a lesson. It MUST belong to a `courseId`, and MUST have a `title`. It OPTIONALLY can have full text `content` (to feed to the AI later), and a `materialLink` (like a Google Drive URL where the actual PDF lives).
- **`LessonResponse`**: The same shape, returned to the frontend so it can display the lesson.

### Question Models
- **`QuestionCreate`**: Rules for adding a manual question. A teacher must provide the `question` text, 4 `options`, the `correct_answer` (A, B, C, or D), and they can optionally provide an `explanation` or a specific `topic`.
- **`QuestionResponse`**: The shape of questions retrieved from the database. It includes a bunch of default settings like `difficulty="medium"` and `bloom_level="understand"`. 

### Quiz Models
- **`QuizCreate`**: To make a quiz, a teacher MUST link it to a `courseId`, give it a `title`, and provide an array of `questionIds` (the specific questions the students have to answer).
- **`QuizSubmission`**: This is what the student sends us when they click "Submit Quiz". It contains an `answers` dictionary (e.g., `{"question1_id": "A", "question2_id": "C"}`) and the `timeSpent`.
- **`QuizResult`**: The final grade. It sends back the `score`, the `percentage`, and the details of exactly what they got right or wrong.

### AI Models
- **`GenerateQuestionsRequest`**: Defines the data needed to tell the AI to build questions (how many questions, and what the source text `content` is).
- **`ExplainAnswerRequest` & `ExplainAnswerResponse`**: Models used when a student gets something wrong and asks the AI to explain why.
- **`ConceptExplainRequest` & `ConceptExplainResponse`**: Models used when a student asks the AI to simplify a complex term.
