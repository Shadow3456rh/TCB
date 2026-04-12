/**
 * QuizResults — Score + question review with AI explanations.
 */

import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { quizzesAPI, aiAPI } from '../services/api';
import { CheckCircle2, XCircle, Trophy, Sparkles, Brain, ArrowLeft } from 'lucide-react';

export default function QuizResults() {
  const { quizId } = useParams();
  const location = useLocation();
  const toast = useToast();

  const [result, setResult] = useState(location.state?.result || null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [explanations, setExplanations] = useState({});
  const [explaining, setExplaining] = useState(null);

  useEffect(() => {
    quizzesAPI.get(quizId).then(({ data }) => setQuiz(data)).catch(() => {});
    if (!result) {
      quizzesAPI.results(quizId)
        .then(({ data }) => { if (data?.length) setResult(data[data.length - 1]); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [quizId]);

  const getExplanation = async (question, studentAnswer) => {
    if (explanations[question.id]) return;
    setExplaining(question.id);
    try {
      const { data } = await aiAPI.explainAnswer({
        questionId: question.id, questionText: question.question,
        correctAnswer: question.correct_answer, studentAnswer,
      });
      setExplanations(prev => ({ ...prev, [question.id]: data.explanation }));
    } catch {
      setExplanations(prev => ({ ...prev, [question.id]: question.explanation || 'Explanation unavailable.' }));
    }
    setExplaining(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-neutral-50"><LoadingSpinner size="lg" /></div>;
  if (!result) return <div className="min-h-screen flex items-center justify-center"><p className="text-neutral-500">No results found.</p></div>;

  const pct = result.percentage || 0;
  const scoreColor = pct >= 80 ? 'text-success-600' : pct >= 50 ? 'text-warning-600' : 'text-error-600';
  const scoreBg = pct >= 80 ? 'bg-success-50' : pct >= 50 ? 'bg-warning-50' : 'bg-error-50';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      {/* Score */}
      <div className={`rounded-2xl p-8 mb-8 text-center animate-scale-in ${scoreBg}`}>
        <Trophy className={`w-12 h-12 mx-auto mb-3 ${scoreColor}`} />
        <h1 className="text-4xl font-extrabold text-neutral-900">{result.score} / {result.total}</h1>
        <p className={`text-2xl font-bold ${scoreColor} mt-1`}>{pct.toFixed(1)}%</p>
        <p className="text-neutral-600 mt-2">
          {pct >= 80 ? 'Excellent work! 🎉' : pct >= 50 ? 'Good effort! Keep practicing.' : 'Keep going! Review the explanations below.'}
        </p>
      </div>

      {/* Question Review */}
      <h2 className="text-xl font-semibold text-neutral-900 mb-5">Question Review</h2>
      <div className="space-y-4">
        {quiz?.questions?.map((question, i) => {
          const r = result.results?.find(r => r.question_id === question.id);
          const isCorrect = r?.is_correct;
          const studentAns = r?.student_answer || '—';

          return (
            <div key={question.id} className={`bg-white rounded-xl border-2 p-6 ${isCorrect ? 'border-success-200' : 'border-error-200'}`}>
              <div className="flex items-start gap-3">
                {isCorrect ? <CheckCircle2 className="w-6 h-6 text-success-500 shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-error-500 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-xs text-neutral-400 mb-1">Question {i + 1}</p>
                  <p className="font-medium text-neutral-900 mb-3">{question.question}</p>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {question.options?.map((opt, j) => {
                      const letter = String.fromCharCode(65 + j);
                      const isCA = question.correct_answer === letter;
                      const isSA = studentAns === letter && !isCorrect;
                      return (
                        <div key={j} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                          isCA ? 'bg-success-50 text-success-800 font-medium border border-success-200' :
                          isSA ? 'bg-error-50 text-error-700 border border-error-200 line-through' :
                          'bg-neutral-50 text-neutral-600'
                        }`}>
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                            isCA ? 'bg-success-600 text-white' : isSA ? 'bg-error-400 text-white' : 'bg-neutral-200 text-neutral-500'
                          }`}>{letter}</span>
                          {opt.replace(/^[A-D]\)\s*/, '')}
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Explain */}
                  {!isCorrect && (
                    <>
                      <button onClick={() => getExplanation(question, studentAns)} disabled={explaining === question.id}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors">
                        {explaining === question.id ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                        {explanations[question.id] ? 'AI Explanation' : 'Get AI Explanation'}
                      </button>
                      {explanations[question.id] && (
                        <div className="mt-3 p-4 bg-purple-50 rounded-lg text-sm text-purple-900 leading-relaxed">
                          <div className="flex items-center gap-2 mb-2 font-semibold"><Brain className="w-4 h-4" /> AI Explanation</div>
                          {explanations[question.id]}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link to="/dashboard" className="px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
