/**
 * Navbar — Professional warm navigation.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap, LogOut, Menu, X, User,
  LayoutDashboard, BookOpen, Brain, BarChart3, PieChart,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated, isEducator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const navLinks = isAuthenticated ? [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/courses', label: 'Courses', icon: BookOpen },
    ...(isEducator ? [
      { path: '/analytics', label: 'Analytics', icon: PieChart },
    ] : [
      { path: '/explore', label: 'Explore', icon: Brain },
      { path: '/progress', label: 'Progress', icon: BarChart3 },
    ]),
  ] : [];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900 tracking-tight">
              RBU<span className="text-primary-600"> Platform</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(path) ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100">
                  <div className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-800" />
                  </div>
                  <span className="text-sm font-medium text-neutral-800">{user?.name}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-500 capitalize text-xs">{user?.role}</span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors">Sign In</Link>
                <Link to="/login?mode=register" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-colors">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile */}
          <button className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(path) ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            {isAuthenticated && (
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error-600 hover:bg-error-50">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
