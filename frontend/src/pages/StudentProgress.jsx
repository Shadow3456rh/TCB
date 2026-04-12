/**
 * StudentProgress — Simple topic accuracy table + practice generation.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { quizzesAPI, aiAPI } from '../services/api';
import { BarChart3, AlertTriangle, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentProgress() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [topicData, setTopicData] = useState([]);
  const [practicing, setPracticing] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    // Simple approach: call the practice endpoint which returns weak topics
    try {
      const { data } = await aiAPI.generatePractice();
      // Parse topic accuracy from weak_topics
      if (data.weak_topics?.length > 0) {
        setTopicData(data.weak_topics.map(t => ({ name: t, accuracy: 'Low', isWeak: true })));
      }
      setPracticeResult(data);
    } catch {
      // Backend might not be available
    }
    setLoading(false);
  };

  const generatePractice = async () => {
    setPracticing(true);
    try {
      const { data } = await aiAPI.generatePractice();
      setPracticeResult(data);
      toast.success(data.message || 'Practice set generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate practice');
    }
    setPracticing(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading progress..." /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Progress</h1>
          <p className="text-neutral-500 text-sm mt-1">Track your topic accuracy and get practice on weak areas.</p>
        </div>
        <button onClick={generatePractice} disabled={practicing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          {practicing ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
          Get Practice Set
        </button>
      </div>

      {/* Topic Accuracy Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-neutral-900">Topic Accuracy</h2>
        </div>

        {topicData.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-sm">
            Take some quizzes to start tracking your topic mastery.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Topic</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {topicData.map((t, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900">{t.name}</td>
                  <td className="px-6 py-4 text-right">
                    {t.isWeak ? (
                      <span className="inline-flex items-center gap-1 text-sm text-error-600 font-medium">
                        <AlertTriangle className="w-4 h-4" /> Needs Work
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-success-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Strong
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Practice Questions */}
      {practiceResult?.questions?.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" /> Practice Questions
          </h2>
          <p className="text-sm text-neutral-500 mb-4">{practiceResult.message}</p>
          <div className="space-y-3">
            {practiceResult.questions.map((q, i) => (
              <div key={q.id || i} className="border border-neutral-200 rounded-lg p-4">
                <p className="text-sm font-medium text-neutral-900 mb-2">{i + 1}. {q.question}</p>
                <div className="space-y-1">
                  {q.options?.map((opt, j) => (
                    <p key={j} className="text-sm text-neutral-600 pl-4">{opt}</p>
                  ))}
                </div>
                {q.topic && <p className="text-xs text-neutral-400 mt-2">Topic: {q.topic}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
