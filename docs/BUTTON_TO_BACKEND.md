# RBU Platform — "Which Button Runs Which Backend File?"

> For every button/action in the UI, this doc tells you exactly which backend file, 
> function, and API endpoint gets called — and what that function does.

---

## How to Read This

```
[Button clicked on screen]
  → Frontend file that handles the click
  → API call made (HTTP method + URL)
  → Backend file: function name
  → What the backend function does
```

---

## 🔐 Login & Registration Page (`/login`)

---

### Button: **"Sign Up"** (Register button)

```
User fills form → clicks Sign Up
  → Frontend: Login.jsx → handleRegister()
  
  Step 1 — Firebase (frontend only, no backend yet):
    firebase/auth → createUserWithEmailAndPassword(email, password)
    Firebase creates the account and returns a token
  
  Step 2 — Backend:
  → POST /api/auth/register
  → Backend file: routes/auth.py → register()
  → Saves name, role, institution to Firestore under the user's UID
```

**What `register()` does:**
1. Reads the Firebase token from the request header
2. Verifies it with Firebase to get the UID
3. Calls `create_document("users", {...}, doc_id=uid)` in `firebase_service.py`
4. Returns the saved user profile

---

### Button: **"Login"** (Sign In button)

```
User fills email/password → clicks Login
  → Frontend: Login.jsx → handleLogin()
  → Firebase only: signInWithEmailAndPassword(email, password)
  → NO backend call — Firebase handles login entirely
  → Firebase returns a token, stored in frontend context
```

> **Note:** Login does NOT call our backend. The backend only gets involved on the NEXT request after login, when it verifies the token.

---

## 📊 Dashboard Page (`/dashboard`)

---

### Page loads (Dashboard opens)

```
→ Frontend: Dashboard.jsx → useEffect on mount
→ GET /api/auth/me
→ Backend file: routes/auth.py → get_profile()
→ Fetches user's name, role, institution from Firestore
```

---

## 📚 Courses Page (`/courses`)

---

### Page loads (Course list opens)

```
→ Frontend: CourseList.jsx → CourseListView → load()
→ GET /api/courses/
→ Backend file: routes/courses.py → list_courses()
→ Educators get only their courses; Students get all courses
```

---

### Button: **"New Course"** → **"Create"** (Submit)

```
Educator fills title, code, description → clicks Create
→ Frontend: CourseList.jsx → handleCreate()
→ POST /api/courses/
→ Backend file: routes/courses.py → create_course()
→ Saves course to Firestore with educatorId = logged-in educator's UID
```

---

### Button: **"Enroll"** (on a course card, student view)

```
Student clicks Enroll on a course
→ Frontend: CourseList.jsx → handleEnroll(courseId)
→ POST /api/courses/{courseId}/enroll
→ Backend file: routes/courses.py → enroll()
→ Fetches course, checks if already enrolled, appends student UID to studentIds array
```

---

### Button: **"Open Course"** (navigates to course detail)

```
→ Frontend navigation only → /courses/{courseId}
→ CourseList.jsx → CourseDetail component loads
→ Multiple calls fire simultaneously:
    GET /api/courses/{courseId}     → routes/courses.py → get_course()
    GET /api/lessons/?courseId=...  → routes/lessons.py → list_lessons()
    GET /api/quizzes/?courseId=...  → routes/quizzes.py → list_quizzes()
    GET /api/ai/questions?courseId= → routes/ai.py     → list_questions()
```

---

## 📖 Course Detail Page (`/courses/:courseId`) — Educator View

---

### Button: **"Add Lesson"** → **"Add Lesson"** (Submit)

```
Educator fills title, content, material link → clicks Add Lesson
→ Frontend: CourseList.jsx → handleAddLesson()
→ POST /api/lessons/
→ Backend file: routes/lessons.py → create_lesson()
→ Saves lesson with courseId, title, content text, materialLink to Firestore
```

---

### Button: **"Upload PDF"** → **"Generate"** (Submit PDF form)

```
Educator selects PDF file, picks lesson and difficulty → clicks Generate
→ Frontend: CourseList.jsx → handlePdfUpload()
→ POST /api/ai/upload-pdf-questions  (multipart form with PDF file)
→ Backend file: routes/ai.py → upload_pdf_questions()
    → Calls utils/pdf_parser.py → extract_text_from_pdf()  [reads PDF bytes]
    → Calls services/ollama_service.py → generate_questions()  [sends to AI]
    → Calls services/ollama_service.py → _validate_questions()  [quality check]
    → Calls services/ollama_service.py → build_answer_key()  [builds key]
    → Calls firebase_service.py → create_document() for each question  [saves to DB]
→ Returns questions + answer key → Answer Key modal pops up automatically
```

---

### Button: **"⚡ AI Generate"** (on a lesson row)

```
Educator clicks AI Generate on a specific lesson
→ Frontend: CourseList.jsx → handleGenerate(lessonId)
→ POST /api/ai/generate-questions   { lessonId, count: 5, difficulty: "medium" }
→ Backend file: routes/ai.py → generate_questions_endpoint()
    → Calls firebase_service.py → get_document("lessons", lessonId)  [gets lesson text]
    → Calls services/ollama_service.py → generate_questions(content)  [sends to Ollama]
    → Calls services/ollama_service.py → _validate_questions()        [validates each Q]
    → Calls services/ollama_service.py → build_answer_key()           [builds key]
    → Calls firebase_service.py → create_document("questions", q)  [saves each Q]
→ Returns questions + answer key → Answer Key modal pops up
```

---

### Button: **"Add Question"** → **"Add Question"** (Submit manual form)

```
Educator fills question, 4 options, correct answer → clicks Add Question
→ Frontend: CourseList.jsx → handleAddManualQuestion()
→ POST /api/ai/questions
→ Backend file: routes/ai.py → create_manual_question()
→ Saves question directly to Firestore, generated_by = "manual", approved = true
```

---

### Button: **🗑 Delete** (on a question)

```
Educator clicks trash icon on a question
→ Frontend: CourseList.jsx → handleDeleteQuestion(id)
→ DELETE /api/ai/questions/{questionId}
→ Backend file: routes/ai.py → delete_question()
    → Calls firebase_service.py → delete_document("questions", id)
```

---

### Button: **"Create Quiz"** → **"Create Quiz (N Qs)"** (Submit)

```
Educator selects questions, sets title and duration → clicks Create
→ Frontend: CourseList.jsx → handleCreateQuiz()
→ POST /api/quizzes/
→ Backend file: routes/quizzes.py → create_quiz()
→ Saves quiz with title, courseId, list of selected questionIds, duration to Firestore
```

---

### Button: **"View Results →"** (on a quiz card, educator view)

```
Educator clicks a quiz card
→ Frontend navigation → /quiz/{quizId}/results
→ QuizResults.jsx loads
→ GET /api/quizzes/{quizId}/results
→ Backend file: routes/quizzes.py → get_results()
→ Fetches all attempts for this quiz from Firestore (educator sees ALL students)
```

---

### Button: **🗑 Delete** (on a lesson)

```
→ Frontend: CourseList.jsx → handleDeleteLesson(id)
→ DELETE /api/lessons/{lessonId}
→ Backend file: routes/lessons.py → delete_lesson()
    → Calls firebase_service.py → delete_document("lessons", id)
```

---

## 🎯 Quiz Take Page (`/quiz/:quizId`) — Student View

---

### Page loads (Quiz opens)

```
→ Frontend: StudentQuiz.jsx → useEffect on mount
→ GET /api/quizzes/{quizId}
→ Backend file: routes/quizzes.py → get_quiz()
→ Fetches quiz + expands all questions (correct answers HIDDEN for students)
→ Timer starts on frontend using setInterval
```

---

### Button: **"Submit"** (or timer runs out)

```
Student answers questions → clicks Submit
→ Frontend: StudentQuiz.jsx → handleSubmit()
→ POST /api/quizzes/{quizId}/submit   { answers: {qId: "B", ...}, timeSpent: 120 }
→ Backend file: routes/quizzes.py → submit_quiz()
    → Fetches each question document to get correct answers
    → Compares student answers vs correct answers (case-insensitive)
    → Calculates score and percentage
    → Calls firebase_service.py → create_document("attempts", {...})  [saves attempt]
→ Returns result → frontend navigates to /quiz/{quizId}/results
```

---

## 📈 Analytics Page (`/analytics`) — Educator View

---

### Page loads / **"Select Course"** dropdown changes

```
→ Frontend: EducatorAnalytics.jsx → loadAnalytics(courseId)
→ GET /api/analytics/course/{courseId}
→ Backend file: routes/analytics.py → course_analytics()
    → get_document("courses", courseId)              [fetch course]
    → query_documents("quizzes", courseId filter)    [fetch all quizzes]
    → query_documents("attempts", per quiz)          [fetch all attempts]
    → get_document("users", sid) for each student    [fetch student names]
    → get_document("questions", qid) per answer      [fetch topic tags]
    → Aggregates: per-student scores, per-topic accuracy, per-quiz stats
→ Returns full analytics object → charts and tables rendered
```

---

## 🧠 Concept Explorer Page (`/explore`) — Student View

---

### Button: **"Explain"** (General concept)

```
Student types a concept → clicks Explain
→ Frontend: ConceptExplorer.jsx → handleExplain()
→ POST /api/ai/explain-concept   { concept: "recursion", detailLevel: "medium" }
→ Backend file: routes/ai.py → explain_concept_endpoint()
    → If lessonId provided: gets lesson content from Firestore as context
    → Calls services/ollama_service.py → explain_concept(concept, context)
→ Returns explanation text
```

---

### Clicking a **"Suggestion"** chip

```
Student clicks "Explain recursion with an example"
→ Frontend: ConceptExplorer.jsx → handleExplain(suggestionText)
→ Same as above — triggers instantly with the suggestion as the concept
```

---

### Button: **"Ask"** (From uploaded PDF material)

```
Student uploads PDF, types question → clicks Ask
→ Frontend: ConceptExplorer.jsx → handlePdfAsk()
→ POST /api/ai/upload-pdf-ask   (multipart: file + question string)
→ Backend file: routes/ai.py → upload_pdf_ask()
    → await file.read()  [reads PDF bytes]
    → Calls utils/pdf_parser.py → extract_text_from_pdf()  [extracts text]
    → Calls services/ollama_service.py → ask_from_material(text, question)
       [AI instructed to answer ONLY from uploaded content]
→ Returns grounded answer → displayed as chat bubble
```

---

## 📊 Student Progress Page (`/progress`) — Student View

---

### Page loads + Button: **"New Practice Set"**

```
Page loads or student clicks New Practice Set
→ Frontend: StudentProgress.jsx → generatePractice() (or loadProgress on mount)
→ POST /api/ai/generate-practice
→ Backend file: routes/ai.py → generate_practice()
    → query_documents("attempts", studentId filter, limit 20)  [last 20 attempts]
    → get_document("questions", qid) for each answered question  [get topic tags]
    → Calculates accuracy per topic
    → Finds weak topics (accuracy < 70%)
    → get_document("lessons", lid) for weak topic questions  [get lesson context]
    → Calls services/ollama_service.py → generate_practice_questions(weak_topics, context)
       [FRESH AI questions generated every single time]
    → Calls services/ollama_service.py → build_answer_key()
→ Returns new questions + answer key + topic accuracy data
→ UI re-renders with new questions (NOT the same as last time)
```

---

### Button: **"Show Answer Key"** (toggle)

```
Student clicks Show Answer Key
→ Frontend only — no backend call
→ StudentProgress.jsx → setShowAnswerKey(!showAnswerKey)
→ React re-renders: reveals correct answers, explanations, score summary
→ Previously selected answers turn green (correct) or red (wrong)
```

---

### Clicking an **answer option** on a practice question

```
Student clicks option B on practice question 3
→ Frontend only — no backend call
→ StudentProgress.jsx → selectPracticeAnswer(questionIndex, "B")
→ Stored in local state: selectedAnswers = { 2: "B" }
→ Used only when answer key is revealed to show correct/wrong
```

---

## 🤖 AI Health Check

---

### Page loads with AI status indicator

```
→ Frontend: Dashboard.jsx (or wherever AI status is shown)
→ GET /api/ai/health
→ Backend file: routes/ai.py → ai_health()
    → Calls services/ollama_service.py → check_health()
       → ollama.list()  [pings the Ollama server]
→ Returns { "ollama_available": true/false }
```

---

## 🔑 Every Request — Hidden But Always Running

### On EVERY protected API call (behind the scenes)

```
Frontend attaches token in header: Authorization: Bearer <firebase-token>
  → FastAPI reads the header via HTTPBearer security
  → routes/auth.py → get_current_user()
      → firebase_service.py → verify_firebase_token(token)
         → Firebase Admin SDK checks the token is valid + not expired
      → firebase_service.py → get_document("users", uid)
         → Reads user's role from Firestore
  → TokenData(uid, email, role) is injected into the route function
```

This auth check runs on every single protected endpoint automatically via FastAPI's `Depends()` system.

---

## 🗂️ Course Detail — Question Banks Section

---

### Button: **"Send to Students"** (in Questions Pool header)

```
Educator clicks Send to Students
→ Frontend: CourseList.jsx → setShowCreateBank(true)
→ Opens a modal to pick a title and select questions from the pool
```

---

### Button: **"Publish (N Qs)"** (Submit in Send to Students modal)

```
Educator selects questions + title → clicks Publish
→ Frontend: CourseList.jsx → handleCreateBank()
→ POST /api/question-banks/   { title, courseId, questionIds, published: true }
→ Backend file: routes/question_banks.py → create_question_bank()
→ Saves to Firestore "question_banks" collection, published = true
→ Students can immediately see it in their Question Banks section
```

---

### Button: **Toggle icon** (publish/unpublish on a bank card)

```
Educator clicks the toggle icon on a question bank card
→ Frontend: CourseList.jsx → handleToggleBankPublish(bankId)
→ PUT /api/question-banks/{bankId}/publish
→ Backend file: routes/question_banks.py → toggle_publish()
→ Flips the "published" field: true → false or false → true
→ Unpublished banks are hidden from students instantly
```

---

### Button: **🗑 Delete** (on a question bank card)

```
Educator clicks delete on a question bank
→ Frontend: CourseList.jsx → handleDeleteBank(bankId)
→ DELETE /api/question-banks/{bankId}
→ Backend file: routes/question_banks.py → delete_question_bank()
→ Deletes the bank from Firestore — the questions themselves are NOT deleted
   (they stay in the questions pool)
```

---

### Button: **"Practice →"** or **"View Questions"** (on a question bank card)

```
Student or educator clicks on a bank card
→ Frontend: CourseList.jsx → handleOpenBank(bankId)
→ GET /api/question-banks/{bankId}
→ Backend file: routes/question_banks.py → get_question_bank()
    → Fetches each question document from the "questions" collection
    → Builds the answer key from full question data FIRST
    → Then strips correct_answer and explanation from student view
    → Returns questions + answer_key in one response
→ Opens viewer modal with questions
```

---

### Button: **"Answer Key"** toggle (inside question bank viewer)

```
Student or educator clicks Answer Key button
→ Frontend only — no backend call
→ setShowBankKey(!showBankKey)
→ React re-renders: reveals correct answers highlighted in green + explanations
→ A Quick Key summary appears at the bottom showing Q1: B, Q2: A, etc.
```

> **Why is the answer key always in the response even for students?**
> The backend sends the answer key in the API response, but the question list
> returned to students has correct_answer stripped out. The answer key is
> a SEPARATE computed object built from the full data before stripping.
> The frontend decides when to show it — behind a button click.

---

## 🔑 Where is the Answer Key used?

The `build_answer_key()` function is called in 4 places. It is NEVER saved to Firestore — it is computed fresh each time and lives only in the HTTP response and the React state:

| Trigger | Endpoint | Where it appears in UI |
|---------|----------|------------------------|
| Educator clicks "AI Generate" on a lesson | `POST /api/ai/generate-questions` | Answer Key modal pops up automatically |
| Educator uploads a PDF | `POST /api/ai/upload-pdf-questions` | Same Answer Key modal pops up |
| Student clicks "New Practice Set" | `POST /api/ai/generate-practice` | Toggle button on StudentProgress page |
| Anyone opens a Question Bank | `GET /api/question-banks/{id}` | Toggle button inside the bank viewer modal |

---

## 🤖 AI Explain Answer — Is it stored?

When a student clicks "Explain" after getting a question wrong:
→ `POST /api/ai/explain-answer`
→ Ollama generates the explanation on the fly from a short prompt
→ The explanation is returned directly in the response
→ **It is NOT saved to Firestore anywhere**
→ It is fast because the prompt is tiny (just a question + two answers)
   compared to MCQ generation which is a large prompt with strict rules

---

## ⚡ Quick Reference Table

| UI Action | HTTP | Endpoint | Backend File | Function |
|-----------|------|----------|--------------|----------|
| Sign Up | POST | `/api/auth/register` | `routes/auth.py` | `register()` |
| Get profile | GET | `/api/auth/me` | `routes/auth.py` | `get_profile()` |
| List courses | GET | `/api/courses/` | `routes/courses.py` | `list_courses()` |
| Create course | POST | `/api/courses/` | `routes/courses.py` | `create_course()` |
| Enroll in course | POST | `/api/courses/{id}/enroll` | `routes/courses.py` | `enroll()` |
| Open course | GET | `/api/courses/{id}` | `routes/courses.py` | `get_course()` |
| Add lesson | POST | `/api/lessons/` | `routes/lessons.py` | `create_lesson()` |
| Delete lesson | DELETE | `/api/lessons/{id}` | `routes/lessons.py` | `delete_lesson()` |
| AI Generate (lesson) | POST | `/api/ai/generate-questions` | `routes/ai.py` | `generate_questions_endpoint()` |
| Upload PDF (educator) | POST | `/api/ai/upload-pdf-questions` | `routes/ai.py` | `upload_pdf_questions()` |
| Upload PDF (student ask) | POST | `/api/ai/upload-pdf-ask` | `routes/ai.py` | `upload_pdf_ask()` |
| Add manual question | POST | `/api/ai/questions` | `routes/ai.py` | `create_manual_question()` |
| Delete question | DELETE | `/api/ai/questions/{id}` | `routes/ai.py` | `delete_question()` |
| Create quiz | POST | `/api/quizzes/` | `routes/quizzes.py` | `create_quiz()` |
| Open quiz (student) | GET | `/api/quizzes/{id}` | `routes/quizzes.py` | `get_quiz()` |
| Submit quiz | POST | `/api/quizzes/{id}/submit` | `routes/quizzes.py` | `submit_quiz()` |
| View results | GET | `/api/quizzes/{id}/results` | `routes/quizzes.py` | `get_results()` |
| Explain concept | POST | `/api/ai/explain-concept` | `routes/ai.py` | `explain_concept_endpoint()` |
| Explain wrong answer | POST | `/api/ai/explain-answer` | `routes/ai.py` | `explain_answer_endpoint()` |
| Generate practice | POST | `/api/ai/generate-practice` | `routes/ai.py` | `generate_practice()` |
| View analytics | GET | `/api/analytics/course/{id}` | `routes/analytics.py` | `course_analytics()` |
| AI health check | GET | `/api/ai/health` | `routes/ai.py` | `ai_health()` |
| Send questions to students | POST | `/api/question-banks/` | `routes/question_banks.py` | `create_question_bank()` |
| List question banks | GET | `/api/question-banks/` | `routes/question_banks.py` | `list_question_banks()` |
| Open/practice question bank | GET | `/api/question-banks/{id}` | `routes/question_banks.py` | `get_question_bank()` |
| Toggle publish/unpublish bank | PUT | `/api/question-banks/{id}/publish` | `routes/question_banks.py` | `toggle_publish()` |
| Delete question bank | DELETE | `/api/question-banks/{id}` | `routes/question_banks.py` | `delete_question_bank()` |
