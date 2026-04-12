/**
 * QuizTake — Take a quiz with timer and submit.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { quizzesAPI } from '../services/api';
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';

export default function QuizTake() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    quizzesAPI.get(quizId)
      .then(({ data }) => { setQuiz(data); setTimeLeft(data.duration * 60); })
      .catch(() => { toast.error('Failed to load quiz'); navigate(-1); })
      .finally(() => setLoading(false));
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (!quiz || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [quiz]);

  const questions = quiz?.questions || [];
  const q = questions[currentQ];

  const selectAnswer = (qid, letter) => setAnswers(prev => ({ ...prev, [qid]: letter }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startRef.current) / 1000);
    try {
      const { data: result } = await quizzesAPI.submit(quizId, { answers, timeSpent });
      toast.success('Quiz submitted!');
      navigate(`/quiz/${quizId}/results`, { state: { result } });
    } catch (err) { toast.error(err.message || 'Submission failed'); }
    setSubmitting(false);
  };

  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const answeredCount = Object.keys(answers).length;
  const lowTime = timeLeft < 60;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-neutral-50"><LoadingSpinner size="lg" text="Loading quiz..." /></div>;
  if (!quiz || questions.length === 0) return <div className="min-h-screen flex items-center justify-center"><p className="text-neutral-500">No questions in this quiz.</p></div>;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900 truncate">{quiz.title}</h1>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold ${lowTime ? 'bg-error-50 text-error-700 animate-pulse' : 'bg-neutral-100 text-neutral-700'}`}>
            <Clock className="w-4 h-4" />{fmt(timeLeft)}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm animate-fade-in">
          <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-6 inline-block">
            Question {currentQ + 1} of {questions.length}
          </span>

          <h2 className="text-xl font-semibold text-neutral-900 mb-8 leading-relaxed">{q.question}</h2>

          <div className="space-y-3 mb-8">
            {q.options?.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const sel = answers[q.id] === letter;
              return (
                <button key={i} onClick={() => selectAnswer(q.id, letter)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    sel ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                  }`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${sel ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{letter}</span>
                  <span className={`text-sm ${sel ? 'text-primary-800 font-medium' : 'text-neutral-700'}`}>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700">
                <Send className="w-4 h-4" /> Submit
              </button>
            )}
          </div>
        </div>

        {/* Question nav pills */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {questions.map((qq, i) => (
            <button key={qq.id} onClick={() => setCurrentQ(i)}
              className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                i === currentQ ? 'bg-primary-600 text-white ring-2 ring-primary-200' :
                answers[qq.id] ? 'bg-success-100 text-success-800' :
                'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}>{i+1}</button>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-scale-in text-center">
            <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Submit Quiz?</h3>
            <p className="text-sm text-neutral-500 mb-1">Answered {answeredCount} of {questions.length}</p>
            {answeredCount < questions.length && <p className="text-xs text-warning-600 mb-4">{questions.length - answeredCount} unanswered</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Review</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
