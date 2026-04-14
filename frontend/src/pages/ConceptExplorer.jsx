/**
 * ConceptExplorer — Ask AI to explain any concept + Upload study material for grounded Q&A.
 */

import { useState, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { aiAPI } from '../services/api';
import { Brain, Sparkles, ArrowLeft, Upload, FileText, X, MessageCircle } from 'lucide-react';
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

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfQuestion, setPdfQuestion] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfAnswer, setPdfAnswer] = useState(null);
  const [pdfHistory, setPdfHistory] = useState([]);
  const pdfInputRef = useRef(null);

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

  const handlePdfAsk = async () => {
    if (!pdfFile) { toast.warning('Upload a PDF first'); return; }
    if (!pdfQuestion.trim()) { toast.warning('Enter a question'); return; }
    setPdfLoading(true);
    setPdfAnswer(null);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('question', pdfQuestion.trim());
      const { data } = await aiAPI.uploadPdfAsk(formData);
      setPdfAnswer(data.answer);
      setPdfHistory(prev => [...prev, { question: pdfQuestion.trim(), answer: data.answer }]);
      setPdfQuestion('');
    } catch (err) {
      toast.error(err.message || 'Failed to answer from material.');
    }
    setPdfLoading(false);
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfAnswer(null);
    setPdfHistory([]);
    setPdfQuestion('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Concept Explorer</h1>
      <p className="text-neutral-500 text-sm mb-8">Ask the AI to explain any topic, or upload your study material for grounded Q&A.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ──── Left: General Concept Explain ──── */}
        <div>
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-600" /> Ask a Concept
            </h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleExplain()}
                  placeholder="What would you like to understand?"
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <button onClick={() => handleExplain()} disabled={loading || !query.trim()}
                className="px-5 py-3 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0">
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

          {/* General Loading */}
          {loading && (
            <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center">
              <Brain className="w-10 h-10 text-primary-500 mx-auto mb-3" style={{ animation: 'spin 2s linear infinite' }} />
              <p className="text-neutral-500">AI is thinking...</p>
            </div>
          )}

          {/* General Result */}
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

        {/* ──── Right: PDF Upload + Grounded Q&A ──── */}
        <div>
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" /> Ask from Your Material
            </h2>
            <p className="text-xs text-neutral-500 mb-4">Upload a PDF and ask questions — AI will answer strictly from your material, no hallucination.</p>

            {/* File Upload Area */}
            {!pdfFile ? (
              <div onClick={() => pdfInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-neutral-300 rounded-xl text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors mb-4">
                <Upload className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500 font-medium">Click to upload study material (PDF)</p>
                <p className="text-xs text-neutral-400 mt-1">Your file is processed locally and not stored</p>
                <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { if (e.target.files[0]) { setPdfFile(e.target.files[0]); setPdfHistory([]); setPdfAnswer(null); } }} />
              </div>
            ) : (
              <>
                {/* File loaded indicator */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl mb-4">
                  <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-800 truncate">{pdfFile.name}</p>
                    <p className="text-xs text-purple-500">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={clearPdf} className="p-1.5 text-purple-400 hover:text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Question input */}
                <div className="flex gap-2 mb-4">
                  <input type="text" value={pdfQuestion} onChange={e => setPdfQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePdfAsk()}
                    placeholder="Ask a question about your material..."
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                  <button onClick={handlePdfAsk} disabled={pdfLoading || !pdfQuestion.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2 shrink-0">
                    {pdfLoading ? <LoadingSpinner size="sm" /> : <MessageCircle className="w-4 h-4" />}
                    Ask
                  </button>
                </div>

                {/* Loading */}
                {pdfLoading && (
                  <div className="text-center py-6">
                    <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" style={{ animation: 'spin 2s linear infinite' }} />
                    <p className="text-sm text-neutral-500">Searching your material...</p>
                  </div>
                )}

                {/* Conversation history */}
                {pdfHistory.length > 0 && (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {pdfHistory.map((item, i) => (
                      <div key={i} className="animate-fade-in">
                        {/* Question bubble */}
                        <div className="flex justify-end mb-2">
                          <div className="bg-primary-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[85%]">
                            <p className="text-sm">{item.question}</p>
                          </div>
                        </div>
                        {/* Answer bubble */}
                        <div className="flex justify-start">
                          <div className="bg-neutral-100 text-neutral-800 px-4 py-3 rounded-2xl rounded-tl-md max-w-[85%]">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                            <p className="text-[10px] text-neutral-400 mt-2 uppercase tracking-wide">From: {pdfFile.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
