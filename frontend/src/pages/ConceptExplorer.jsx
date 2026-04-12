/**
 * ConceptExplorer — Ask AI to explain any concept.
 */

import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { aiAPI } from '../services/api';
import { Brain, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTIONS = [
  'What is Object-Oriented Programming?',
  'Explain recursion with an example',
  'How does a binary search tree work?',
  'What are ACID properties in databases?',
  'Explain the difference between TCP and UDP',
];

export default function ConceptExplorer() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const handleExplain = async (concept = query) => {
    if (!concept.trim()) { toast.warning('Enter a concept'); return; }
    setLoading(true);
    setExplanation(null);
    try {
      const { data } = await aiAPI.explainConcept({ concept: concept.trim(), detailLevel: 'medium' });
      setExplanation({ concept: data.concept, text: data.explanation });
    } catch (err) {
      toast.error(err.message || 'Failed to get explanation. Is AI running?');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Concept Explorer</h1>
      <p className="text-neutral-500 text-sm mb-8">Ask the AI to explain any topic in simple terms.</p>

      {/* Search */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6 shadow-sm">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Brain className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExplain()}
              placeholder="What would you like to understand?"
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-neutral-300 text-base focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <button onClick={() => handleExplain()} disabled={loading || !query.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0">
            {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
            Explain
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-neutral-400 mb-2 uppercase font-medium tracking-wide">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setQuery(s); handleExplain(s); }}
                className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium hover:bg-primary-50 hover:text-primary-700 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center">
          <Brain className="w-10 h-10 text-primary-500 mx-auto mb-3" style={{ animation: 'spin 2s linear infinite' }} />
          <p className="text-neutral-500">AI is thinking...</p>
        </div>
      )}

      {/* Result */}
      {explanation && !loading && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">{explanation.concept}</h3>
          </div>
          <div className="text-neutral-700 leading-relaxed text-sm whitespace-pre-wrap">
            {explanation.text}
          </div>
        </div>
      )}
    </div>
  );
}
