/**
 * API Service — Simple Axios calls to the backend.
 */

import axios from 'axios';
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,  // 2 min for AI calls
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase auth token
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* proceed without token */ }
  return config;
});

// Normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'Something went wrong';
    return Promise.reject({ message, status: err.response?.status });
  }
);

// ---- Auth ----
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  getProfile: () => api.get('/api/auth/me'),
};

// ---- Courses ----
export const coursesAPI = {
  create: (data) => api.post('/api/courses/', data),
  list: () => api.get('/api/courses/'),
  get: (id) => api.get(`/api/courses/${id}`),
  enroll: (id) => api.post(`/api/courses/${id}/enroll`),
  delete: (id) => api.delete(`/api/courses/${id}`),
};

// ---- Lessons ----
export const lessonsAPI = {
  create: (data) => api.post('/api/lessons/', data),
  list: (courseId) => api.get('/api/lessons/', { params: { courseId } }),
  get: (id) => api.get(`/api/lessons/${id}`),
  update: (id, data) => api.put(`/api/lessons/${id}`, data),
  delete: (id) => api.delete(`/api/lessons/${id}`),
};

// ---- Questions ----
export const questionsAPI = {
  create: (data) => api.post('/api/ai/questions', data),
  list: (params) => api.get('/api/ai/questions', { params }),
  delete: (id) => api.delete(`/api/ai/questions/${id}`),
};

// ---- Quizzes ----
export const quizzesAPI = {
  create: (data) => api.post('/api/quizzes/', data),
  list: (courseId) => api.get('/api/quizzes/', { params: { courseId } }),
  get: (id) => api.get(`/api/quizzes/${id}`),
  submit: (id, data) => api.post(`/api/quizzes/${id}/submit`, data),
  results: (id) => api.get(`/api/quizzes/${id}/results`),
};

// ---- AI ----
export const aiAPI = {
  health: () => api.get('/api/ai/health'),
  generateQuestions: (data) => api.post('/api/ai/generate-questions', data),
  explainAnswer: (data) => api.post('/api/ai/explain-answer', data),
  explainConcept: (data) => api.post('/api/ai/explain-concept', data),
  generatePractice: () => api.post('/api/ai/generate-practice'),
};

// ---- Analytics ----
export const analyticsAPI = {
  course: (courseId) => api.get(`/api/analytics/course/${courseId}`),
};

export default api;

