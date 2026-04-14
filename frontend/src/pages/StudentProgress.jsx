/**
 * StudentProgress — Topic accuracy tracking + FRESH AI practice sets with answer key reveal.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { quizzesAPI, aiAPI } from '../services/api';
import { BarChart3, AlertTriangle, CheckCircle2, Sparkles, ArrowLeft, Key, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentProgress() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [topicData, setTopicData] = useState([]);
  const [practicing, setPracticing] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const { data } = await aiAPI.generatePractice();
      if (data.topic_accuracy?.length > 0) {
        setTopicData(data.topic_accuracy);
      } else if (data.weak_topics?.length > 0) {
        setTopicData(data.weak_topics.map(t => ({ topic: t, accuracy: 0, isWeak: true })));
      }
      setPracticeResult(data);
    } catch {
      // Backend might not be available
    }
    setLoading(false);
  };

  const generatePractice = async () => {
    setPracticing(true);
    setShowAnswerKey(false);
    setSelectedAnswers({});
    try {
      const { data } = await aiAPI.generatePractice();
      setPracticeResult(data);
      if (data.topic_accuracy?.length > 0) {
        setTopicData(data.topic_accuracy);
      }
      toast.success(data.message || 'Fresh practice set generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate practice');
    }
    setPracticing(false);
  };

  const selectPracticeAnswer = (qIndex, letter) => {
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: letter }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading progress..." /></div>;

  const answerKey = practiceResult?.answer_key || [];
  const questions = practiceResult?.questions || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Progress</h1>
          <p className="text-neutral-500 text-sm mt-1">Track your topic accuracy and get AI-generated practice on weak areas.</p>
        </div>
        <button onClick={generatePractice} disabled={practicing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          {practicing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
          {practicing ? 'Generating...' : 'New Practice Set'}
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
                <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Accuracy</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {topicData.map((t, i) => {
                const accuracy = typeof t.accuracy === 'number' ? t.accuracy : 0;
                const isWeak = t.isWeak || accuracy < 70;
                return (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{t.topic || t.name}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isWeak ? 'bg-error-500' : 'bg-success-500'}`}
                            style={{ width: `${Math.min(accuracy, 100)}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500 font-mono w-10">{accuracy}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isWeak ? (
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Practice Questions */}
      {questions.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Practice Questions
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={generatePractice} disabled={practicing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-200 disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${practicing ? 'animate-spin' : ''}`} /> Regenerate
              </button>
              {answerKey.length > 0 && (
                <button onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showAnswerKey
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}>
                  {showAnswerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                  {showAnswerKey ? 'Hide Answers' : 'Show Answer Key'}
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-neutral-500 mb-5">{practiceResult.message}</p>

          <div className="space-y-4">
            {questions.map((q, i) => {
              const userAnswer = selectedAnswers[i];
              const keyEntry = answerKey[i];
              const isCorrect = showAnswerKey && userAnswer && keyEntry && userAnswer === keyEntry.correct_letter;
              const isWrong = showAnswerKey && userAnswer && keyEntry && userAnswer !== keyEntry.correct_letter;

              return (
                <div key={q.id || i} className={`border rounded-xl p-5 transition-colors ${
                  isCorrect ? 'border-success-300 bg-success-50/50' :
                  isWrong ? 'border-error-300 bg-error-50/50' :
                  'border-neutral-200'
                }`}>
                  <p className="text-sm font-semibold text-neutral-900 mb-3">{i + 1}. {q.question}</p>

                  {/* Interactive options */}
                  <div className="space-y-2 mb-2">
                    {q.options?.map((opt, j) => {
                      const letter = String.fromCharCode(65 + j);
                      const isSelected = userAnswer === letter;
                      const isCorrectOption = showAnswerKey && keyEntry && letter === keyEntry.correct_letter;
                      const isWrongSelection = showAnswerKey && isSelected && !isCorrectOption;

                      let optClasses = 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50';
                      if (isSelected && !showAnswerKey) {
                        optClasses = 'border-primary-500 bg-primary-50';
                      } else if (showAnswerKey && isCorrectOption) {
                        optClasses = 'border-success-500 bg-success-50';
                      } else if (isWrongSelection) {
                        optClasses = 'border-error-400 bg-error-50';
                      }

                      return (
                        <button key={j} onClick={() => !showAnswerKey && selectPracticeAnswer(i, letter)}
                          disabled={showAnswerKey}
                          className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all flex items-center gap-3 text-sm ${optClasses} disabled:cursor-default`}>
                          <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                            showAnswerKey && isCorrectOption ? 'bg-success-600 text-white' :
                            isWrongSelection ? 'bg-error-500 text-white' :
                            isSelected ? 'bg-primary-600 text-white' :
                            'bg-neutral-100 text-neutral-600'
                          }`}>{letter}</span>
                          <span className="text-neutral-700">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                          {showAnswerKey && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-success-600 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Topic badge */}
                  {q.topic && <p className="text-xs text-neutral-400 mt-2">Topic: {q.topic}</p>}

                  {/* Answer Key Reveal */}
                  {showAnswerKey && keyEntry && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-success-700">✅ Correct: {keyEntry.correct_letter}) {keyEntry.correct_text}</span>
                      </div>
                      {keyEntry.explanation && (
                        <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 rounded-lg p-3 mt-1">
                          💡 {keyEntry.explanation}
                        </p>
                      )}
                      {isWrong && (
                        <p className="text-xs text-error-600 mt-1">You selected {userAnswer} — review the explanation above.</p>
                      )}
                      {isCorrect && (
                        <p className="text-xs text-success-600 mt-1">🎉 Great job! You got this one right.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary when answer key is shown */}
          {showAnswerKey && answerKey.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900 text-sm">Answer Key Summary</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {answerKey.map((a, i) => {
                  const userAns = selectedAnswers[i];
                  const isCorrect = userAns === a.correct_letter;
                  return (
                    <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      !userAns ? 'bg-white text-neutral-600 border border-neutral-200' :
                      isCorrect ? 'bg-success-100 text-success-800' :
                      'bg-error-100 text-error-800'
                    }`}>
                      Q{a.number}: {a.correct_letter}
                      {userAns && (isCorrect ? ' ✓' : ` ✗ (${userAns})`)}
                    </div>
                  );
                })}
              </div>
              {Object.keys(selectedAnswers).length > 0 && (
                <p className="text-xs text-amber-700 mt-3">
                  Score: {Object.entries(selectedAnswers).filter(([i, a]) => answerKey[i]?.correct_letter === a).length} / {questions.length} correct
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
