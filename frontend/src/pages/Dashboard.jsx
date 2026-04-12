/**
 * Dashboard — Role-based home page. Simple and clean.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { coursesAPI } from '../services/api';
import {
  BookOpen, Plus, Users, ArrowRight, Brain, BarChart3,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isEducator } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesAPI.list()
      .then(({ data }) => setCourses(data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading..." /></div>;
  }

  const enrolled = courses.filter(c => c.studentIds?.includes(user?.uid));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-neutral-500 mt-1">
          {isEducator
            ? 'Manage courses, generate AI questions, and track student progress.'
            : 'Take quizzes, get AI explanations, and track your learning.'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 rounded-lg"><BookOpen className="w-5 h-5 text-primary-600" /></div>
            <span className="text-sm text-neutral-500">{isEducator ? 'Your Courses' : 'Enrolled'}</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{isEducator ? courses.length : enrolled.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg"><Brain className="w-5 h-5 text-purple-600" /></div>
            <span className="text-sm text-neutral-500">AI Features</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">3</p>
        </div>
        {isEducator && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success-50 rounded-lg"><Users className="w-5 h-5 text-success-600" /></div>
              <span className="text-sm text-neutral-500">Students</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {courses.reduce((sum, c) => sum + (c.studentIds?.length || 0), 0)}
            </p>
          </div>
        )}
      </div>

      {/* Courses */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-neutral-900">
          {isEducator ? 'Your Courses' : 'My Courses'}
        </h2>
        <Link to="/courses" className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
          {isEducator ? 'Manage' : 'Browse All'} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {(isEducator ? courses : enrolled).length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="font-semibold text-neutral-800 mb-1">
            {isEducator ? 'No courses yet' : 'Not enrolled in any courses'}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">
            {isEducator ? 'Create your first course to get started.' : 'Browse courses to enroll.'}
          </p>
          <Link to="/courses"
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            {isEducator ? 'Create Course' : 'Browse Courses'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(isEducator ? courses : enrolled).map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="group bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg hover:border-primary-200 transition-all duration-200 animate-fade-in"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-md">{course.code}</span>
                <span className="text-xs text-neutral-400">{course.studentIds?.length || 0} students</span>
              </div>
              <h3 className="font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors mb-1">{course.title}</h3>
              <p className="text-sm text-neutral-500 line-clamp-2">{course.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions for Students */}
      {!isEducator && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/explore" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-all group">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">Concept Explorer</h3>
                <p className="text-xs text-neutral-500">Ask AI to explain any topic</p>
              </div>
            </Link>
            <Link to="/progress" className="flex items-center gap-4 p-5 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-all group">
              <div className="p-3 bg-success-50 rounded-xl group-hover:bg-success-100 transition-colors">
                <BarChart3 className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">My Progress</h3>
                <p className="text-xs text-neutral-500">View topic accuracy & weak areas</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
