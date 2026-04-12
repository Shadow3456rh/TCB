/**
 * Landing — Professional academic landing page.
 */

import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Brain, BarChart3, FileQuestion,
  Sparkles, Shield, ArrowRight, ChevronRight,
} from 'lucide-react';

const FEATURES = [
  { icon: BookOpen, title: 'Course Management', desc: 'Create courses, add lessons with Google Drive materials. Organize your curriculum effortlessly.', color: 'text-primary-600', bg: 'bg-primary-50' },
  { icon: Sparkles, title: 'AI Question Generation', desc: 'Paste lesson content and let Llama 3.2 generate relevant MCQs instantly.', color: 'text-accent-600', bg: 'bg-accent-50' },
  { icon: FileQuestion, title: 'Quiz Builder', desc: 'Build quizzes from AI-generated or manually created questions. Students take timed assessments.', color: 'text-info-500', bg: 'bg-info-50' },
  { icon: Brain, title: 'AI Explanations', desc: 'Students get personalized AI explanations when they answer incorrectly.', color: 'text-warning-600', bg: 'bg-warning-50' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track student performance, identify weak topics, and monitor progress across courses.', color: 'text-success-600', bg: 'bg-success-50' },
  { icon: Shield, title: 'Adaptive Practice', desc: 'System identifies weak areas and generates focused practice to help students improve.', color: 'text-error-500', bg: 'bg-error-50' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900 tracking-tight">RBU<span className="text-primary-600"> Platform</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">Sign In</Link>
            <Link to="/login?mode=register" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-neutral-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" /> Powered by Llama 3.2 AI
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-tight tracking-tight mb-6 animate-slide-up">
            Smarter Assessments.<br />
            <span className="text-primary-600">Better Learning.</span>
          </h1>

          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            An AI-powered educational platform that helps educators create assessments and provides adaptive learning for students — all running on local AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/login?mode=register" className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:-translate-y-0.5">
              Start Teaching <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="flex items-center gap-2 px-8 py-3.5 border-2 border-neutral-300 text-neutral-700 rounded-xl font-semibold text-base hover:border-primary-400 hover:text-primary-700 transition-all">
              I'm a Student <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-neutral-900 mb-3">Everything You Need</h2>
          <p className="text-neutral-500 max-w-xl mx-auto">From course creation to adaptive practice — a complete teaching and learning toolkit.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="group bg-white rounded-xl border border-neutral-200 p-7 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-white border-t border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl font-bold text-neutral-900 mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create & Upload', desc: 'Add courses, lessons, and link your study materials from Google Drive.' },
              { step: '02', title: 'Generate & Build', desc: 'AI generates MCQs from your content, or add questions manually. Build quizzes in seconds.' },
              { step: '03', title: 'Learn & Improve', desc: 'Students take quizzes, get AI explanations, and receive adaptive practice on weak topics.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary-200">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-10 sm:p-14 text-center text-white shadow-xl">
          <GraduationCap className="w-12 h-12 mx-auto mb-5 opacity-90" />
          <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-primary-100 mb-8 max-w-md mx-auto">Create your first course and let AI help you build better assessments.</p>
          <Link to="/login?mode=register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 rounded-xl font-semibold text-base hover:bg-primary-50 shadow-lg transition-all hover:-translate-y-0.5">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <GraduationCap className="w-4 h-4 text-primary-600" />
            <span>RBU Platform</span>
          </div>
          <p className="text-xs text-neutral-400">AI-Powered Educational Assessment</p>
        </div>
      </footer>
    </div>
  );
}
