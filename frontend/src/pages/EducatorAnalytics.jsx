/**
 * EducatorAnalytics — Course analytics dashboard for teachers.
 * Shows student performance, weak topics, quiz stats.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { analyticsAPI, coursesAPI } from '../services/api';
import {
  ArrowLeft, Users, FileQuestion, BarChart3, TrendingDown,
  TrendingUp, AlertTriangle, CheckCircle2, Trophy, Target,
} from 'lucide-react';

export default function EducatorAnalytics() {
  const { courseId } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesAPI.list().then(({ data: c }) => {
      setCourses(c || []);
      if (!selectedCourse && c?.length) setSelectedCourse(c[0].id);
    }).catch(() => {});
    if (selectedCourse) loadAnalytics(selectedCourse);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCourse) loadAnalytics(selectedCourse);
  }, [selectedCourse]);

  const loadAnalytics = async (cid) => {
    setLoading(true);
    try {
      const { data: d } = await analyticsAPI.course(cid);
      setData(d);
    } catch (err) {
      setData(null);
    }
    setLoading(false);
  };

  const ScoreBar = ({ value, max = 100 }) => {
    const pct = Math.min(value, max);
    const color = pct >= 80 ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-error-500';
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-semibold text-neutral-700 w-14 text-right">{value}%</span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Monitor student performance and identify weak areas.</p>
        </div>
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-neutral-300 text-sm font-medium bg-white focus:ring-2 focus:ring-primary-500 outline-none min-w-48">
          <option value="">Select course...</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading analytics..." /></div>}

      {!loading && !data && (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="font-semibold text-neutral-800 mb-1">No data yet</h3>
          <p className="text-sm text-neutral-500">Students need to take quizzes before analytics are available.</p>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8 animate-fade-in">

          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: data.totalStudents, icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: 'Quizzes', value: data.totalQuizzes, icon: FileQuestion, color: 'text-accent-600', bg: 'bg-accent-50' },
              { label: 'Attempts', value: data.totalAttempts, icon: Target, color: 'text-info-500', bg: 'bg-info-50' },
              { label: 'Avg Score', value: `${data.overallAvgScore}%`, icon: Trophy, color: data.overallAvgScore >= 70 ? 'text-success-600' : 'text-warning-600', bg: data.overallAvgScore >= 70 ? 'bg-success-50' : 'bg-warning-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-neutral-200 p-5">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-neutral-900">{value}</p>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Topic Analysis */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" /> Topic Analysis
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">Topics sorted by accuracy — weakest first</p>
            </div>
            {data.topicAnalysis?.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {data.topicAnalysis.map((t, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-8 shrink-0">
                      {t.isWeak ? (
                        <div className="w-8 h-8 rounded-lg bg-error-50 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-error-500" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-success-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-neutral-900">{t.topic}</h3>
                        <span className="text-xs text-neutral-400">{t.correctCount}/{t.totalAttempts} correct · {t.studentCount} students</span>
                      </div>
                      <ScoreBar value={t.accuracy} />
                    </div>
                    {t.isWeak && (
                      <span className="px-2.5 py-1 bg-error-50 text-error-700 text-xs font-semibold rounded-full shrink-0">Weak</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-neutral-500">No topic data yet.</div>
            )}
          </div>

          {/* Student Performance */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" /> Student Performance
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">Sorted by average score — students needing help first</p>
            </div>
            {data.studentPerformance?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Student</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Quizzes</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase w-1/3">Performance</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.studentPerformance.map((s, i) => (
                      <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                              {s.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{s.name}</p>
                              <p className="text-xs text-neutral-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-neutral-700 font-medium">{s.quizzesTaken}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-bold ${s.avgScore >= 80 ? 'text-success-600' : s.avgScore >= 50 ? 'text-warning-600' : 'text-error-600'}`}>
                            {s.avgScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4"><ScoreBar value={s.avgScore} /></td>
                        <td className="px-6 py-4 text-center">
                          {s.quizzesTaken === 0 ? (
                            <span className="text-xs text-neutral-400">No attempts</span>
                          ) : s.avgScore >= 80 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700 bg-success-50 px-2.5 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3" /> Strong
                            </span>
                          ) : s.avgScore >= 50 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-700 bg-warning-50 px-2.5 py-1 rounded-full">
                              Average
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-error-700 bg-error-50 px-2.5 py-1 rounded-full">
                              <TrendingDown className="w-3 h-3" /> At Risk
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-neutral-500">No student data yet.</div>
            )}
          </div>

          {/* Quiz Stats */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-primary-600" /> Quiz Results
              </h2>
            </div>
            {data.quizStats?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {data.quizStats.map(q => (
                  <div key={q.id} className="border border-neutral-200 rounded-xl p-5">
                    <h3 className="font-semibold text-neutral-900 mb-3">{q.title}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-neutral-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-neutral-500">Attempts</p>
                        <p className="text-lg font-bold text-neutral-800">{q.attemptCount}</p>
                      </div>
                      <div className="bg-neutral-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-neutral-500">Avg Score</p>
                        <p className={`text-lg font-bold ${q.avgScore >= 70 ? 'text-success-600' : 'text-warning-600'}`}>{q.avgScore}%</p>
                      </div>
                      <div className="bg-success-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-success-600">Highest</p>
                        <p className="text-lg font-bold text-success-700">{q.highest}%</p>
                      </div>
                      <div className="bg-error-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-error-600">Lowest</p>
                        <p className="text-lg font-bold text-error-700">{q.lowest}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mt-3">{q.questionCount} questions</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-neutral-500">No quiz data yet.</div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
