/**
 * App.jsx — Simplified routing. 9 pages total.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import StudentQuiz from './pages/StudentQuiz';
import QuizResults from './pages/QuizResults';
import ConceptExplorer from './pages/ConceptExplorer';
import StudentProgress from './pages/StudentProgress';
import EducatorAnalytics from './pages/EducatorAnalytics';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            } />

            {/* Courses */}
            <Route path="/courses" element={
              <ProtectedRoute><AppLayout><CourseList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/courses/:courseId" element={
              <ProtectedRoute><AppLayout><CourseList /></AppLayout></ProtectedRoute>
            } />

            {/* Quiz */}
            <Route path="/quiz/:quizId" element={
              <ProtectedRoute><StudentQuiz /></ProtectedRoute>
            } />
            <Route path="/quiz/:quizId/results" element={
              <ProtectedRoute><AppLayout><QuizResults /></AppLayout></ProtectedRoute>
            } />

            {/* Student tools */}
            <Route path="/explore" element={
              <ProtectedRoute><AppLayout><ConceptExplorer /></AppLayout></ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute><AppLayout><StudentProgress /></AppLayout></ProtectedRoute>
            } />

            {/* Educator */}
            <Route path="/analytics" element={
              <ProtectedRoute><AppLayout><EducatorAnalytics /></AppLayout></ProtectedRoute>
            } />
            <Route path="/analytics/:courseId" element={
              <ProtectedRoute><AppLayout><EducatorAnalytics /></AppLayout></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
