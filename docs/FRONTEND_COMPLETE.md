# RBU Platform — Complete Frontend Documentation

> Every file, component, context, and service in the frontend explained in plain English.

---

## Table of Contents

1. [How the Frontend Works](#1-how-the-frontend-works)
2. [Project Structure](#2-project-structure)
3. [Entry Points — main.jsx & App.jsx](#3-entry-points--mainjsx--appjsx)
4. [Contexts — Shared State](#4-contexts--shared-state)
5. [Services — API & Firebase](#5-services--api--firebase)
6. [Components — Reusable UI Pieces](#6-components--reusable-ui-pieces)
7. [Pages](#7-pages)
8. [All Routes at a Glance](#8-all-routes-at-a-glance)

---

## 1. How the Frontend Works

The frontend is a **Single Page Application (SPA)** — the browser loads one HTML file once, and React takes over navigation and rendering from there. The page never does a full reload.

```
User opens browser → loads index.html (once)
  → React boots up (main.jsx)
  → App.jsx defines all page routes
  → User navigates → React swaps components without reload
  → Components call the backend API via Axios (api.js)
  → Response updates React state → component re-renders automatically
```

**React's core idea:** The UI is a function of state. When data changes, React re-renders the relevant part of the screen automatically. You don't manually update the DOM.

---

## 2. Project Structure

```
frontend/src/
├── main.jsx              ← Entry point — boots React
├── App.jsx               ← All page routes defined here
├── index.css             ← Global styles + Tailwind
│
├── contexts/             ← Shared state accessible from any component
│   ├── AuthContext.jsx   ← Who is logged in? What is their role?
│   └── ToastContext.jsx  ← Pop-up notification system
│
├── services/             ← External communication
│   ├── api.js            ← All Axios calls to our FastAPI backend
│   └── firebase.js       ← Firebase client setup (auth only)
│
├── components/
│   └── common/
│       ├── Navbar.jsx        ← Top navigation bar
│       ├── ProtectedRoute.jsx ← Redirects if not logged in
│       └── LoadingSpinner.jsx ← Spinning loader shown while fetching
│
└── pages/                ← One file per page/screen
    ├── Landing.jsx        ← Public homepage (/ route)
    ├── Login.jsx          ← Sign in / Sign up (/ login route)
    ├── Dashboard.jsx      ← After login hub (/dashboard)
    ├── CourseList.jsx     ← Course list + full course detail (/courses)
    ├── StudentQuiz.jsx    ← Quiz taking screen (/quiz/:id)
    ├── QuizResults.jsx    ← Quiz results view (/quiz/:id/results)
    ├── ConceptExplorer.jsx ← AI concept explain + PDF Q&A (/explore)
    ├── StudentProgress.jsx ← Practice sets + topic tracking (/progress)
    └── EducatorAnalytics.jsx ← Analytics dashboard (/analytics)
```

---

## 3. Entry Points — `main.jsx` & `App.jsx`

### `main.jsx` — The Ignition Switch

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)
```

**What this does step by step:**
- `document.getElementById('root')` — finds the `<div id="root">` in `index.html`
- `createRoot(...).render(...)` — tells React to take control of that div and render `<App />` inside it
- `<StrictMode>` — a development helper that double-runs effects to catch bugs (has no effect in production)
- `import './index.css'` — loads all global CSS including Tailwind

---

### `App.jsx` — The Route Map

```jsx
function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
```
**What this does:** A wrapper component that adds the navbar above every protected page. Pages that don't use it (like `StudentQuiz`) render fullscreen without the navbar.

```jsx
<BrowserRouter>
  <AuthProvider>
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
        } />
        ...
      </Routes>
    </ToastProvider>
  </AuthProvider>
</BrowserRouter>
```
**What this does:**
- `BrowserRouter` — enables URL-based navigation without page reloads
- `AuthProvider` — wraps everything so any component can check who's logged in
- `ToastProvider` — wraps everything so any component can show a notification
- `ProtectedRoute` — wraps pages that require login; redirects to `/login` if not authenticated

**Why wrap in this order?** `AuthProvider` must be outside `ToastProvider` because auth might need to show toasts. Both must wrap all routes so every page has access to auth state and toast notifications.

---

## 4. Contexts — Shared State

Contexts are React's way of sharing data between components without passing it through props at every level. Think of them like global variables that React components can subscribe to.

---

### `AuthContext.jsx` — The Identity Manager

This is the most important context. It answers: "Who is logged in? What is their role?"

#### Profile Caching (why it's fast)

```jsx
const PROFILE_KEY = 'rbu_user_profile';
const getCachedProfile = () => JSON.parse(localStorage.getItem(PROFILE_KEY));
const setCachedProfile = (profile) => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
const clearCachedProfile = () => localStorage.removeItem(PROFILE_KEY);
```
**What this does:** The user's profile (name, role, institution) is saved in `localStorage` (the browser's persistent storage). On the next page load, the cached profile is shown instantly while the backend sync happens in the background. This makes navigation feel instant instead of showing a spinner every time.

#### `onAuthStateChanged` — The Session Watcher

```jsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const cached = getCachedProfile();
      if (cached && cached.uid === fbUser.uid) {
        setUser(cached);           // Show UI immediately
        setLoading(false);
        // Background refresh (non-blocking)
        authAPI.getProfile().then(({ data }) => {
          setUser(fresh);
          setCachedProfile(fresh);
        });
      } else {
        // No cache — fetch from backend first
        const { data } = await authAPI.getProfile();
        setUser(profile);
        setCachedProfile(profile);
        setLoading(false);
      }
    } else {
      setUser(null);
      clearCachedProfile();
      setLoading(false);
    }
  });
  return () => unsubscribe(); // Clean up listener when component unmounts
}, []);
```
**What this does:** `onAuthStateChanged` is a Firebase listener that fires whenever the user's login state changes (e.g., page refresh, token expiry, logout). It runs once on mount and stays active. The cleanup function `unsubscribe()` stops the listener when the app unmounts.

**Two paths:**
1. **Cache hit** — shows cached profile immediately, syncs in background (fast)
2. **No cache** — fetches from backend first (happens on first login or after browser data cleared)

#### `login()` Function

```jsx
const login = useCallback(async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const { data } = await authAPI.getProfile();
  setUser(profile);
  setCachedProfile(profile);
  return cred.user;
}, []);
```
**What this does:**
1. Firebase handles password verification and issues a token
2. Then immediately fetches the profile from our backend (to get the role — Firebase doesn't store roles)
3. Saves everything to state + local storage

#### `register()` Function

```jsx
const register = useCallback(async (email, password, name, role, institution) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  try { await authAPI.register({ email, password, name, role, institution }); }
  catch { /* backend might not be available */ }
  setUser(profile);
  setCachedProfile(profile);
}, []);
```
**What this does:**
1. Firebase creates the account and returns credentials
2. Sets the display name on the Firebase profile
3. Calls our backend `/api/auth/register` to save name/role/institution to Firestore
4. Backend call is wrapped in try/catch so if the backend is down, signup still works (with limited profile data)

#### What `useAuth()` gives you

Any component can do `const { user, isEducator, login, logout } = useAuth()` and get:

| Property | Type | What it is |
|----------|------|-----------|
| `user` | Object | `{ uid, email, name, role, institution }` or `null` |
| `firebaseUser` | Object | Raw Firebase user object |
| `loading` | Boolean | True while checking if user is logged in |
| `isAuthenticated` | Boolean | `true` if user is logged in |
| `isEducator` | Boolean | `true` if role is "educator" |
| `isStudent` | Boolean | `true` if role is "student" |
| `isAdmin` | Boolean | `true` if role is "admin" |
| `login()` | Function | Sign in |
| `register()` | Function | Create account |
| `logout()` | Function | Sign out |

---

### `ToastContext.jsx` — The Notification System

```jsx
const toast = useToast();
toast.success('Questions generated!');
toast.error('Something went wrong.');
toast.warning('Select a file first.');
```
**What this does:** Shows small popup notifications (toasts) in the corner of the screen. Any component can call `useToast()` to get the toast functions. Toasts auto-dismiss after a few seconds.

**Why a context?** Without it, every component would need to render its own notification UI. The context puts one notification system at the top of the app and lets all children trigger it.

---

## 5. Services — API & Firebase

### `services/firebase.js` — Firebase Client Setup

```jsx
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = { apiKey: "...", projectId: "...", ... };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```
**What this does:** Initializes the Firebase client and exports the `auth` object. This is the only place the Firebase config keys live. The `auth` object is imported by `AuthContext.jsx` to call sign-in/sign-up functions.

---

### `services/api.js` — The Backend Communication Layer

This is the file that sends requests to the FastAPI backend. Every backend API call in the app goes through this file.

```jsx
import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
});
```
**What this does:**
- `axios.create()` creates a reusable HTTP client with default settings
- `baseURL` — all URLs are relative to this (so `api.get('/api/courses/')` calls `http://localhost:8000/api/courses/`)
- `timeout: 30000` — if the backend doesn't respond in 30 seconds, fail with an error (PDF uploads have longer timeouts of 180 seconds)

#### The Auth Interceptor — Automatic Token Attachment

```jsx
api.interceptors.request.use(async (config) => {
  const fbUser = auth.currentUser;
  if (fbUser) {
    const token = await fbUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
**What this does:** Before EVERY request is sent, this interceptor runs automatically:
1. Gets the currently logged-in Firebase user
2. Gets their current token (Firebase auto-refreshes expired tokens)
3. Adds it to the request header: `Authorization: Bearer eyJhbG...`

This means you never have to manually add auth headers anywhere — it's handled globally.

#### API Groups

```jsx
export const authAPI = { ... }       // Login, register, get profile
export const coursesAPI = { ... }    // CRUD for courses + enroll
export const lessonsAPI = { ... }    // CRUD for lessons
export const questionsAPI = { ... }  // List/delete questions
export const quizzesAPI = { ... }    // Create quizzes, submit, results
export const aiAPI = { ... }         // All AI features
export const analyticsAPI = { ... }  // Educator analytics
export const questionBanksAPI = { ... } // Question bank CRUD + publish
```

Each group is an object with named functions that call specific endpoints:
```jsx
// Example usage in a component:
const { data } = await coursesAPI.get(courseId);
const { data } = await aiAPI.generateQuestions({ lessonId, count: 5 });
const { data } = await questionBanksAPI.togglePublish(bankId);
```

---

## 6. Components — Reusable UI Pieces

### `Navbar.jsx` — Top Navigation Bar

Shows different links depending on role:
- **Not logged in:** Logo only
- **Student:** Dashboard, Courses, AI Explore, My Progress
- **Educator:** Dashboard, Courses (with My Courses label), Analytics
- **All logged in:** Logout button + user name

Uses `useAuth()` to determine what to show. No backend calls — reads from cached auth state.

---

### `ProtectedRoute.jsx` — The Login Gate

```jsx
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```
**What this does:** Wraps protected pages. If the user is not logged in, redirects to `/login`. If auth is still loading (checking session), shows a spinner. Otherwise, renders the page.

`replace` in `<Navigate replace />` means the login page replaces the current entry in browser history — so pressing Back after login doesn't go back to the protected page.

---

### `LoadingSpinner.jsx` — The Loading Indicator

A simple animated spinner shown while data is being fetched. Used across all pages during API calls.

---

## 7. Pages

---

### `Landing.jsx` — Public Homepage (`/`)

The public-facing homepage. No auth required. Has a hero section, features list, and CTA buttons. Clicking "Get Started" or "Login" navigates to `/login`.

---

### `Login.jsx` — Sign In / Sign Up (`/login`)

Two modes in one page — toggled by a tab:
- **Sign In** tab: email + password → calls `auth.login()`
- **Sign Up** tab: name, email, password, role (student/educator), institution → calls `auth.register()`

After successful login/register, redirects to `/dashboard`.

**Role selection:** The role dropdown here sets the user's role permanently in Firestore. Choosing "Educator" gives access to AI generation, question creation, and analytics. Choosing "Student" gives access to quizzes, practice sets, and concept explorer.

---

### `Dashboard.jsx` — Post-Login Hub (`/dashboard`)

The first page after login. Shows a welcome message and role-specific quick links. Uses `useAuth()` to determine which tiles to show:

- **Students see:** My Courses, AI Explore, My Progress
- **Educators see:** My Courses, Analytics, AI tools info

No heavy data loading — mostly navigation tiles. Calls `GET /api/auth/me` to confirm the profile.

---

### `CourseList.jsx` — The Biggest Page (`/courses` and `/courses/:courseId`)

This one file handles two views:

**View 1 — Course List** (`/courses`): Shows all available courses. Students see "Enroll" buttons. Educators see "New Course" button.

**View 2 — Course Detail** (`/courses/:courseId`): The full course management page. Determined by whether a `courseId` URL param is present:
```jsx
export default function CourseList() {
  const { courseId } = useParams();
  return courseId ? <CourseDetail courseId={courseId} /> : <CourseListView />;
}
```

**CourseDetail sections (educator view):**
1. **Lessons** — add/delete lessons with content and material links. "AI Generate" button per lesson.
2. **Questions Pool** — private list of all questions. "Send to Students" button to create a question bank.
3. **PDF Upload** — upload a PDF to generate questions from it.
4. **Question Banks** — published banks with publish/unpublish toggle and delete.
5. **Quizzes** — graded timed quizzes, link to results.

**CourseDetail sections (student view):**
1. **Lessons** — read-only list with material links.
2. **Question Banks** — "Practice →" button to open a question bank.
3. **Quizzes** — "Take Quiz →" button.

**State management:** This component has a lot of `useState` calls — each piece of UI state (modals, forms, loading flags) has its own state variable:
```jsx
const [showAddLesson, setShowAddLesson] = useState(false);
const [showPdfUpload, setShowPdfUpload] = useState(false);
const [showCreateBank, setShowCreateBank] = useState(false);
const [showAnswerKey, setShowAnswerKey] = useState(false);
// ... etc
```

---

### `StudentQuiz.jsx` — Quiz Taking (`/quiz/:quizId`)

Renders without the Navbar (fullscreen quiz experience). Handles:
- Loading the quiz and displaying questions one by one
- A countdown timer using `setInterval`
- Tracking selected answers in state
- Auto-submitting when timer hits zero
- Calling `quizzesAPI.submit()` → navigates to results

```jsx
// Timer countdown
useEffect(() => {
  const interval = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(interval); handleSubmit(); return 0; }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, []);
```
**What this does:** Decrements `timeLeft` by 1 every second. When it reaches 0, auto-submits the quiz. The cleanup function `clearInterval` stops the timer if the component unmounts (e.g., user navigates away).

---

### `QuizResults.jsx` — Results View (`/quiz/:quizId/results`)

Shows quiz results. Two modes:
- **Educator view:** All students' attempts in a table — name, score, date
- **Student view:** Only their own latest attempt — score, per-question correct/wrong

Fetches from `GET /api/quizzes/{quizId}/results`. The backend automatically filters — students only get their own data.

---

### `ConceptExplorer.jsx` — AI Tools for Students (`/explore`)

Two-column layout:

**Left column — General Concept Explain:**
- Text input for any concept
- Suggestion chips (click to auto-fill and search)
- Calls `POST /api/ai/explain-concept`
- Shows the AI explanation below

**Right column — PDF Q&A (Upload Study Material):**
- Upload a PDF file
- Ask questions about it in a chat-style interface
- Multiple questions per PDF (upload once, ask many)
- Each question calls `POST /api/ai/upload-pdf-ask`
- Answers shown as chat bubbles
- Source attribution on each answer ("From: filename.pdf")

---

### `StudentProgress.jsx` — Practice & Topic Tracking (`/progress`)

Three sections:

**1. Topic Accuracy Table:**
- Shows each topic with a progress bar and percentage
- Topics below 70% show "Needs Work" badge
- Data comes from the practice endpoint (which analyzes past attempts)

**2. Practice Questions:**
- Fresh AI-generated questions every time "New Practice Set" is pressed
- Interactive option selection (click A/B/C/D before revealing answers
- Questions are color coded — green/red once answer key is revealed

**3. Answer Key reveal:**
- "Show Answer Key" toggle button
- Reveals correct answers highlighted in green
- Wrong selection highlighted in red
- Explanation text shown below each question
- Score summary: "4 / 5 correct"

No backend call for showing the answer key — it was already in the API response, just hidden in state until the button is clicked.

---

### `EducatorAnalytics.jsx` — Analytics Dashboard (`/analytics`)

Educator-only page. Calls `GET /api/analytics/course/{courseId}`.

Displays:
- **Overview cards:** Total students, quizzes, attempts, average score
- **Student performance table:** Each student's score, sorted weakest first
- **Topic accuracy chart:** Bar chart showing which topics students struggle with (using Recharts)
- **Quiz stats:** Per-quiz average, highest, lowest scores
- **Weak topics highlight:** Topics below 70% flagged in red

Course selector dropdown at the top — changing it re-fetches all analytics for the selected course.

---

## 8. All Routes at a Glance

| URL | Component | Auth Required | Who Sees It |
|-----|-----------|--------------|-------------|
| `/` | `Landing` | No | Everyone |
| `/login` | `Login` | No | Everyone |
| `/dashboard` | `Dashboard` | Yes | Everyone |
| `/courses` | `CourseList` (list view) | Yes | Everyone |
| `/courses/:courseId` | `CourseList` (detail view) | Yes | Everyone |
| `/quiz/:quizId` | `StudentQuiz` | Yes | Everyone |
| `/quiz/:quizId/results` | `QuizResults` | Yes | Everyone |
| `/explore` | `ConceptExplorer` | Yes | Students mainly |
| `/progress` | `StudentProgress` | Yes | Students mainly |
| `/analytics` | `EducatorAnalytics` | Yes | Educators mainly |
| `/analytics/:courseId` | `EducatorAnalytics` | Yes | Educators mainly |
| `*` (anything else) | Redirects to `/` | — | — |

> "Everyone" means any authenticated user. The UI adjusts based on role — educators see management tools, students see learning tools. The backend enforces actual access restrictions.
