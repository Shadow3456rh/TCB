/**
 * CourseList — View, create, enroll in courses.
 * Course detail: lessons with drive links, question management (manual + AI), quizzes.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { coursesAPI, lessonsAPI, quizzesAPI, aiAPI, questionsAPI, questionBanksAPI } from '../services/api';
import {
  BookOpen, Plus, Users, FileText, FileQuestion, ExternalLink,
  Trash2, Sparkles, CheckCircle2, LogIn, ArrowLeft, Clock,
  PencilLine, ChevronDown, ChevronUp, Upload, Eye, EyeOff, Key,
  Send, Library, ToggleLeft, ToggleRight,
} from 'lucide-react';

export default function CourseList() {
  const { courseId } = useParams();
  return courseId ? <CourseDetail courseId={courseId} /> : <CourseListView />;
}

/* ======== Course List ======== */
function CourseListView() {
  const { user, isEducator } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const { data } = await coursesAPI.list(); setCourses(data || []); }
    catch { setCourses([]); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await coursesAPI.create(form);
      toast.success('Course created!');
      setShowCreate(false);
      setForm({ title: '', code: '', description: '' });
      load();
    } catch (err) { toast.error(err.message); }
    setCreating(false);
  };

  const handleEnroll = async (id) => {
    setEnrolling(id);
    try { await coursesAPI.enroll(id); toast.success('Enrolled!'); load(); }
    catch (err) { toast.error(err.message); }
    setEnrolling(null);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Courses</h1>
          <p className="text-neutral-500 text-sm mt-1">{isEducator ? 'Create and manage your courses.' : 'Browse and enroll in courses.'}</p>
        </div>
        {isEducator && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> New Course
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Create Course</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Course Title</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="e.g., Introduction to CS" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Code</label>
                <input type="text" required value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                  placeholder="e.g., CS101" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Brief description..." rows={3} className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="font-semibold text-neutral-800 mb-1">No courses yet</h3>
          {isEducator && (
            <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              Create First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => {
            const isEnrolled = course.studentIds?.includes(user?.uid);
            return (
              <div key={course.id} className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg transition-all animate-fade-in flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-md">{course.code}</span>
                  {!isEducator && isEnrolled && <span className="flex items-center gap-1 text-xs text-success-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Enrolled</span>}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">{course.title}</h3>
                <p className="text-sm text-neutral-500 line-clamp-2 flex-1 mb-4">{course.description || 'No description'}</p>
                <p className="text-xs text-neutral-400 mb-4"><Users className="w-3.5 h-3.5 inline mr-1" />{course.studentIds?.length || 0} students</p>
                {isEducator || isEnrolled ? (
                  <Link to={`/courses/${course.id}`} className="block w-full text-center py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                    Open Course
                  </Link>
                ) : (
                  <button onClick={() => handleEnroll(course.id)} disabled={enrolling === course.id}
                    className="w-full py-2.5 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {enrolling === course.id ? <LoadingSpinner size="sm" /> : <LogIn className="w-4 h-4" />} Enroll
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ======== Course Detail ======== */
function CourseDetail({ courseId }) {
  const { user, isEducator } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Question bank form
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [selectedBankQs, setSelectedBankQs] = useState(new Set());

  // Student question bank viewer
  const [viewingBank, setViewingBank] = useState(null);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankAnswerKey, setBankAnswerKey] = useState([]);
  const [showBankKey, setShowBankKey] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);

  // Lesson form
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', materialLink: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(null);

  // Manual question form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [qForm, setQForm] = useState({
    lessonId: '', question: '', optA: '', optB: '', optC: '', optD: '',
    correct_answer: 'A', explanation: '', difficulty: 'medium', topic: '',
  });

  // Quiz form
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState(30);
  const [selectedQs, setSelectedQs] = useState(new Set());

  // PDF upload form
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLessonId, setPdfLessonId] = useState('');
  const [pdfCount, setPdfCount] = useState(5);
  const [pdfDifficulty, setPdfDifficulty] = useState('medium');
  const [uploading, setUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const pdfInputRef = useRef(null);

  // Answer key state (for AI-generated questions)
  const [answerKey, setAnswerKey] = useState(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Expand sections
  const [expandedLesson, setExpandedLesson] = useState(null);

  useEffect(() => { loadAll(); }, [courseId]);

  const loadAll = async () => {
    try {
      const [c, l, q] = await Promise.all([
        coursesAPI.get(courseId), lessonsAPI.list(courseId), quizzesAPI.list(courseId),
      ]);
      setCourse(c.data);
      setLessons(l.data || []);
      setQuizzes(q.data || []);

      // Load questions for this course
      try {
        const { data: qs } = await questionsAPI.list({ courseId });
        setQuestions(qs || []);
      } catch { setQuestions([]); }

      // Load question banks for this course
      try {
        const { data: banks } = await questionBanksAPI.list(courseId);
        setQuestionBanks(banks || []);
      } catch { setQuestionBanks([]); }
    } catch { toast.error('Failed to load course'); }
    setLoading(false);
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await lessonsAPI.create({ courseId, title: lessonForm.title, content: lessonForm.content, materialLink: lessonForm.materialLink });
      toast.success('Lesson added!');
      setShowAddLesson(false);
      setLessonForm({ title: '', content: '', materialLink: '' });
      loadAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleGenerate = async (lessonId) => {
    setGenerating(lessonId);
    try {
      const { data } = await aiAPI.generateQuestions({ lessonId, count: 5, difficulty: 'medium' });
      const qs = data.questions || data;
      const count = Array.isArray(qs) ? qs.length : 0;
      toast.success(`Generated ${count} questions!`);
      if (data.answer_key) {
        setAnswerKey(data.answer_key);
        setShowAnswerKey(true);
      }
      loadAll();
    } catch (err) {
      toast.error(err.message || 'AI generation failed. Is Ollama running?');
    }
    setGenerating(null);
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) { toast.warning('Select a PDF file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('lessonId', pdfLessonId || lessons[0]?.id || '');
      formData.append('count', pdfCount);
      formData.append('difficulty', pdfDifficulty);
      const { data } = await aiAPI.uploadPdfQuestions(formData);
      const qs = data.questions || [];
      toast.success(`Generated ${qs.length} questions from PDF!`);
      setPdfResult(data);
      if (data.answer_key) {
        setAnswerKey(data.answer_key);
        setShowAnswerKey(true);
      }
      loadAll();
    } catch (err) {
      toast.error(err.message || 'PDF processing failed.');
    }
    setUploading(false);
  };

  const handleAddManualQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await questionsAPI.create({
        lessonId: qForm.lessonId || lessons[0]?.id || '',
        question: qForm.question,
        options: [`A) ${qForm.optA}`, `B) ${qForm.optB}`, `C) ${qForm.optC}`, `D) ${qForm.optD}`],
        correct_answer: qForm.correct_answer,
        explanation: qForm.explanation,
        difficulty: qForm.difficulty,
        topic: qForm.topic,
      });
      toast.success('Question added!');
      setShowAddQuestion(false);
      setQForm({ lessonId: '', question: '', optA: '', optB: '', optC: '', optD: '', correct_answer: 'A', explanation: '', difficulty: 'medium', topic: '' });
      loadAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDeleteLesson = async (id) => {
    if (!confirm('Delete this lesson?')) return;
    try { await lessonsAPI.delete(id); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try { await questionsAPI.delete(id); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const toggleQ = (qid) => {
    setSelectedQs(prev => {
      const next = new Set(prev);
      next.has(qid) ? next.delete(qid) : next.add(qid);
      return next;
    });
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (selectedQs.size === 0) { toast.warning('Select at least one question'); return; }
    setSaving(true);
    try {
      await quizzesAPI.create({ courseId, title: quizTitle, questionIds: Array.from(selectedQs), duration: quizDuration });
      toast.success('Quiz created!');
      setShowCreateQuiz(false);
      setSelectedQs(new Set());
      loadAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    if (selectedBankQs.size === 0) { toast.warning('Select at least one question'); return; }
    setSaving(true);
    try {
      await questionBanksAPI.create({
        title: bankTitle, courseId, questionIds: Array.from(selectedBankQs), published: true,
      });
      toast.success('Question bank created & published to students!');
      setShowCreateBank(false);
      setSelectedBankQs(new Set());
      setBankTitle('');
      loadAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleToggleBankPublish = async (bankId) => {
    try {
      const { data } = await questionBanksAPI.togglePublish(bankId);
      toast.success(data.published ? 'Published to students' : 'Unpublished');
      loadAll();
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDeleteBank = async (bankId) => {
    if (!confirm('Delete this question bank?')) return;
    try { await questionBanksAPI.delete(bankId); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const handleOpenBank = async (bankId) => {
    setLoadingBank(true);
    setShowBankKey(false);
    try {
      const { data } = await questionBanksAPI.get(bankId);
      setViewingBank(data);
      setBankQuestions(data.questions || []);
      setBankAnswerKey(data.answer_key || []);
    } catch { toast.error('Failed to load question bank'); }
    setLoadingBank(false);
  };

  const toggleBankQ = (qid) => {
    setSelectedBankQs(prev => {
      const next = new Set(prev);
      next.has(qid) ? next.delete(qid) : next.add(qid);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!course) return <div className="text-center py-20 text-neutral-500">Course not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg">{course.code}</span>
            <span className="text-xs text-neutral-400">{course.studentIds?.length || 0} students</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">{course.title}</h1>
          {course.description && <p className="text-neutral-500 text-sm mt-1">{course.description}</p>}
        </div>
        {isEducator && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={() => setShowAddLesson(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
              <Plus className="w-4 h-4" /> Add Lesson
            </button>
            <button onClick={() => { setPdfLessonId(lessons[0]?.id || ''); setShowPdfUpload(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Upload className="w-4 h-4" /> Upload PDF
            </button>
            <button onClick={() => { setQForm(f => ({...f, lessonId: lessons[0]?.id || ''})); setShowAddQuestion(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">
              <PencilLine className="w-4 h-4" /> Add Question
            </button>
            <button onClick={() => setShowCreateQuiz(true)}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">
              <FileQuestion className="w-4 h-4" /> Create Quiz
            </button>
          </div>
        )}
      </div>

      {/* ---- Add Lesson Modal ---- */}
      {showAddLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Add Lesson</h2>
            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                <input type="text" required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                  placeholder="e.g., Chapter 1: Introduction" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Content (text for AI question generation)</label>
                <textarea value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                  placeholder="Paste lesson content here... This text will be used by AI to generate questions." rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Material Link (Drive / URL)</label>
                <input type="url" value={lessonForm.materialLink} onChange={e => setLessonForm({...lessonForm, materialLink: e.target.value})}
                  placeholder="https://drive.google.com/file/d/..." className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                <p className="text-xs text-neutral-400 mt-1">Google Drive link to PDF/PPT for students to access</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddLesson(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Add Manual Question Modal ---- */}
      {showAddQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Add Question Manually</h2>
            <form onSubmit={handleAddManualQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Lesson</label>
                <select value={qForm.lessonId} onChange={e => setQForm({...qForm, lessonId: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Question</label>
                <textarea required value={qForm.question} onChange={e => setQForm({...qForm, question: e.target.value})}
                  placeholder="What is...?" rows={2} className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map(letter => (
                  <div key={letter}>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Option {letter}</label>
                    <input type="text" required value={qForm[`opt${letter}`]}
                      onChange={e => setQForm({...qForm, [`opt${letter}`]: e.target.value})}
                      placeholder={`Option ${letter}`}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Correct Answer</label>
                  <select value={qForm.correct_answer} onChange={e => setQForm({...qForm, correct_answer: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm({...qForm, difficulty: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Topic</label>
                <input type="text" value={qForm.topic} onChange={e => setQForm({...qForm, topic: e.target.value})}
                  placeholder="e.g., Arrays, OOP" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Explanation (optional)</label>
                <textarea value={qForm.explanation} onChange={e => setQForm({...qForm, explanation: e.target.value})}
                  placeholder="Why is this the correct answer?" rows={2} className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddQuestion(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Create Quiz Modal ---- */}
      {showCreateQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Create Quiz</h2>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Quiz Title</label>
                <input type="text" required value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                  placeholder="e.g., Chapter 1 Quiz" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Duration (min)</label>
                <input type="number" min={5} max={180} value={quizDuration} onChange={e => setQuizDuration(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              {/* Question selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Select Questions ({selectedQs.size} selected)</label>
                {questions.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">No questions yet. Add questions first (manually or via AI).</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-neutral-200 rounded-lg p-3">
                    {questions.map(q => (
                      <label key={q.id} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedQs.has(q.id) ? 'bg-primary-50' : 'hover:bg-neutral-50'}`}>
                        <input type="checkbox" checked={selectedQs.has(q.id)} onChange={() => toggleQ(q.id)}
                          className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                        <div className="min-w-0">
                          <p className="text-sm text-neutral-800 line-clamp-2">{q.question}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-neutral-400">{q.difficulty}</span>
                            {q.topic && <span className="text-xs text-neutral-400">· {q.topic}</span>}
                            <span className={`text-xs ${q.generated_by === 'ai' ? 'text-purple-500' : 'text-success-600'}`}>{q.generated_by === 'ai' ? '🤖 AI' : '✏️ Manual'}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateQuiz(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={saving || selectedQs.size === 0} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Creating...' : `Create Quiz (${selectedQs.size} Qs)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- PDF Upload Modal ---- */}
      {showPdfUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Upload PDF → Generate Questions</h2>
            <p className="text-sm text-neutral-500 mb-6">Upload a PDF document and AI will generate a question bank with verified answer key.</p>
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">PDF File</label>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-neutral-300 rounded-xl text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                  <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  {pdfFile ? (
                    <p className="text-sm font-medium text-purple-700">{pdfFile.name}</p>
                  ) : (
                    <p className="text-sm text-neutral-500">Click to select a PDF file</p>
                  )}
                  <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => setPdfFile(e.target.files[0] || null)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Attach to Lesson</label>
                <select value={pdfLessonId} onChange={e => setPdfLessonId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                  <option value="">— No lesson —</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Questions</label>
                  <input type="number" min={1} max={20} value={pdfCount}
                    onChange={e => setPdfCount(parseInt(e.target.value) || 5)}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Difficulty</label>
                  <select value={pdfDifficulty} onChange={e => setPdfDifficulty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowPdfUpload(false); setPdfFile(null); setPdfResult(null); }}
                  className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={uploading || !pdfFile}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? <><LoadingSpinner size="sm" /> Processing...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
                </button>
              </div>
            </form>

            {/* PDF Result Preview */}
            {pdfResult && (
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-neutral-900 text-sm">Generated {pdfResult.questions?.length || 0} Questions</h3>
                  <span className="text-xs text-neutral-400">{pdfResult.extracted_chars?.toLocaleString()} chars extracted</span>
                </div>
                <p className="text-xs text-success-600 mb-3">✅ Questions saved to question bank.</p>
                <button onClick={() => { setShowPdfUpload(false); setPdfFile(null); setPdfResult(null); }}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Answer Key Modal ---- */}
      {showAnswerKey && answerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Answer Key</h2>
                <p className="text-xs text-neutral-500">{answerKey.length} questions verified</p>
              </div>
            </div>
            <div className="space-y-3">
              {answerKey.map((a, i) => (
                <div key={i} className="border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-xs font-bold">{a.number}</span>
                    <span className="text-sm font-bold text-success-700">Answer: {a.correct_letter}</span>
                    <span className="text-xs text-neutral-500">— {a.correct_text}</span>
                  </div>
                  {a.explanation && <p className="text-xs text-neutral-600 pl-9 leading-relaxed">{a.explanation}</p>}
                </div>
              ))}
            </div>
            <button onClick={() => setShowAnswerKey(false)}
              className="w-full mt-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Close</button>
          </div>
        </div>
      )}

      {/* ======== Lessons ======== */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" /> Lessons ({lessons.length})
        </h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-neutral-500 bg-white rounded-xl border border-neutral-200 p-6 text-center">
            No lessons yet. {isEducator && 'Add your first lesson above.'}
          </p>
        ) : (
          <div className="space-y-3">
            {lessons.map(lesson => (
              <div key={lesson.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-900">{lesson.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {lesson.content && <span className="text-xs text-neutral-400">{lesson.content.length} chars</span>}
                      {lesson.materialLink && (
                        <a href={lesson.materialLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700">
                          <ExternalLink className="w-3 h-3" /> View Material
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEducator && lesson.content && (
                      <button onClick={() => handleGenerate(lesson.id)} disabled={generating === lesson.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors">
                        {generating === lesson.id ? <LoadingSpinner size="sm" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {generating === lesson.id ? 'Generating...' : 'AI Generate'}
                      </button>
                    )}
                    <button onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                      className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50">
                      {expandedLesson === lesson.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isEducator && (
                      <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Expanded content */}
                {expandedLesson === lesson.id && lesson.content && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {lesson.content.substring(0, 500)}{lesson.content.length > 500 && '...'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ======== Questions Pool (Educator Only) ======== */}
      {isEducator && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <PencilLine className="w-5 h-5 text-purple-600" /> Questions Pool ({questions.length})
            </h2>
            {questions.length > 0 && (
              <button onClick={() => { setSelectedBankQs(new Set()); setShowCreateBank(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                <Send className="w-3.5 h-3.5" /> Send to Students
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-500 mb-3">Your private pool of questions. Use them for quizzes or publish them as a Question Bank for students to practice.</p>
          {questions.length === 0 ? (
            <p className="text-sm text-neutral-500 bg-white rounded-xl border border-neutral-200 p-6 text-center">
              No questions yet. Generate with AI or add manually.
            </p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-white rounded-lg border border-neutral-200 px-5 py-3 flex items-start gap-3">
                  <span className="text-xs font-bold text-neutral-400 mt-1 w-6">{i+1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800">{q.question}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${q.generated_by === 'ai' ? 'bg-purple-50 text-purple-600' : 'bg-success-50 text-success-600'}`}>
                        {q.generated_by === 'ai' ? '🤖 AI' : '✏️ Manual'}
                      </span>
                      <span className="text-xs text-neutral-400">{q.difficulty}</span>
                      {q.topic && <span className="text-xs text-neutral-400">· {q.topic}</span>}
                      <span className="text-xs text-neutral-400">Answer: {q.correct_answer}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-neutral-400 hover:text-error-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Create Question Bank Modal (Educator) ---- */}
      {showCreateBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Send Question Bank to Students</h2>
                <p className="text-xs text-neutral-500">Students will see these questions as practice material</p>
              </div>
            </div>
            <form onSubmit={handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
                <input type="text" required value={bankTitle} onChange={e => setBankTitle(e.target.value)}
                  placeholder="e.g., Chapter 1 Practice Set" className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Select Questions ({selectedBankQs.size} selected)</label>
                <div className="max-h-60 overflow-y-auto space-y-2 border border-neutral-200 rounded-lg p-3">
                  {questions.map(q => (
                    <label key={q.id} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedBankQs.has(q.id) ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}>
                      <input type="checkbox" checked={selectedBankQs.has(q.id)} onChange={() => toggleBankQ(q.id)}
                        className="mt-1 rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-800 line-clamp-2">{q.question}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-neutral-400">{q.difficulty}</span>
                          {q.topic && <span className="text-xs text-neutral-400">· {q.topic}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateBank(false)} className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={saving || selectedBankQs.size === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? 'Publishing...' : <><Send className="w-4 h-4" /> Publish ({selectedBankQs.size} Qs)</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======== Published Question Banks ======== */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Library className="w-5 h-5 text-blue-600" /> Question Banks ({questionBanks.length})
        </h2>
        {questionBanks.length === 0 ? (
          <p className="text-sm text-neutral-500 bg-white rounded-xl border border-neutral-200 p-6 text-center">
            No question banks yet. {isEducator && 'Select questions from the pool above and send them to students.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionBanks.map(bank => (
              <div key={bank.id} className="bg-white rounded-xl border border-neutral-200 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900">{bank.title}</h3>
                  {isEducator && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleBankPublish(bank.id)} title={bank.published ? 'Unpublish' : 'Publish'}
                        className={`p-1.5 rounded-lg transition-colors ${bank.published ? 'text-success-600 hover:bg-success-50' : 'text-neutral-400 hover:bg-neutral-50'}`}>
                        {bank.published ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDeleteBank(bank.id)} className="p-1.5 text-neutral-400 hover:text-error-600 rounded-lg hover:bg-error-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-500 mb-3">
                  <span className="flex items-center gap-1"><FileQuestion className="w-4 h-4" /> {bank.questionCount || bank.questionIds?.length || 0} Questions</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bank.published ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {bank.published ? '● Published' : '○ Draft'}
                  </span>
                </div>
                <button onClick={() => handleOpenBank(bank.id)}
                  className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                  {isEducator ? 'View Questions' : 'Practice →'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Question Bank Viewer Modal ---- */}
      {viewingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{viewingBank.title}</h2>
                <p className="text-sm text-neutral-500">{bankQuestions.length} questions</p>
              </div>
              <div className="flex items-center gap-2">
                {bankAnswerKey.length > 0 && (
                  <button onClick={() => setShowBankKey(!showBankKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      showBankKey ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}>
                    {showBankKey ? <EyeOff className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                    {showBankKey ? 'Hide Answers' : 'Answer Key'}
                  </button>
                )}
              </div>
            </div>

            {loadingBank ? (
              <div className="py-10 text-center"><LoadingSpinner size="lg" /></div>
            ) : (
              <div className="space-y-4">
                {bankQuestions.map((q, i) => {
                  const keyEntry = bankAnswerKey[i];
                  return (
                    <div key={q.id || i} className="border border-neutral-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-neutral-900 mb-3">{i + 1}. {q.question}</p>
                      <div className="space-y-1.5 mb-2">
                        {q.options?.map((opt, j) => {
                          const letter = String.fromCharCode(65 + j);
                          const isCorrect = showBankKey && keyEntry && letter === keyEntry.correct_letter;
                          return (
                            <div key={j} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                              isCorrect ? 'bg-success-50 border border-success-300' : 'bg-neutral-50'
                            }`}>
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCorrect ? 'bg-success-600 text-white' : 'bg-neutral-200 text-neutral-600'
                              }`}>{letter}</span>
                              <span className="text-neutral-700">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-success-600 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                      {q.topic && <p className="text-xs text-neutral-400">Topic: {q.topic} · {q.difficulty}</p>}
                      {showBankKey && keyEntry?.explanation && (
                        <p className="text-xs text-neutral-600 bg-neutral-50 rounded-lg p-3 mt-2">💡 {keyEntry.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {showBankKey && bankAnswerKey.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h3 className="font-semibold text-amber-900 text-sm mb-2 flex items-center gap-2"><Key className="w-4 h-4" /> Quick Key</h3>
                <div className="flex flex-wrap gap-2">
                  {bankAnswerKey.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 bg-white border border-amber-200 rounded-md text-xs font-bold text-amber-800">
                      Q{a.number}: {a.correct_letter}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setViewingBank(null); setBankQuestions([]); setBankAnswerKey([]); setShowBankKey(false); }}
              className="w-full mt-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Close</button>
          </div>
        </div>
      )}

      {/* ======== Quizzes (Graded) ======== */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-success-600" /> Quizzes ({quizzes.length})
        </h2>
        <p className="text-xs text-neutral-500 mb-3">{isEducator ? 'Timed, graded assessments for students.' : 'Timed quizzes — your answers will be graded.'}</p>
        {quizzes.length === 0 ? (
          <p className="text-sm text-neutral-500 bg-white rounded-xl border border-neutral-200 p-6 text-center">
            No quizzes yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => (
              <Link key={quiz.id} to={isEducator ? `/quiz/${quiz.id}/results` : `/quiz/${quiz.id}`}
                className="group bg-white rounded-xl border border-neutral-200 p-5 hover:shadow-lg hover:border-primary-200 transition-all">
                <h3 className="font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors mb-2">{quiz.title}</h3>
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  <span className="flex items-center gap-1"><FileQuestion className="w-4 h-4" /> {quiz.questionIds?.length || 0} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {quiz.duration} min</span>
                </div>
                <div className="mt-3">
                  <span className="px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-lg">
                    {isEducator ? 'View Results →' : 'Take Quiz →'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
