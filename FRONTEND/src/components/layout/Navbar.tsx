import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, ShieldCheck, User as UserIcon, LogOut, Menu, X, ChevronDown, Activity, Pill, FileText, AlertTriangle, Sparkles, Bell, Clock, Heart, TrendingUp, History, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../context/FamilyContext';
import { useNotifications } from '../../context/NotificationContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { families, activeFamily, setActiveFamily } = useFamily();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFamilyMenuOpen, setIsFamilyMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const familyMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (familyMenuRef.current && !familyMenuRef.current.contains(event.target as Node)) {
        setIsFamilyMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifMenuOpen(false);
      }
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setIsAIDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Health Records', path: '/health-records', icon: FileText },
    { name: 'Medicines', path: '/medicine-schedules', icon: Pill },
    { name: 'Reports', path: '/medical-reports', icon: FileText },
    { name: 'Families', path: '/families', icon: Users },
  ];

  const aiLinks = [
    { name: 'Symptom Checker', path: '/predictions/symptom-checker', icon: Sparkles },
    { name: 'Diabetes AI', path: '/predictions/diabetes', icon: Activity },
    { name: 'Hypertension AI', path: '/predictions/hypertension', icon: Heart },
    { name: 'Risk Trends', path: '/predictions/trends', icon: TrendingUp },
    { name: 'Archive', path: '/predictions/history', icon: History },
  ];

  const isAIActive = location.pathname.startsWith('/predictions');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Family Switcher */}
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 text-primary font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-100 shadow-2xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="bg-gradient-to-r from-teal-700 to-slate-900 bg-clip-text text-transparent font-extrabold hidden sm:inline">
                WellTree
              </span>
            </Link>

            {/* Family Switcher Dropdown */}
            {families.length > 0 && (
              <div className="relative" ref={familyMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFamilyMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span className="max-w-[120px] truncate">{activeFamily?.name || 'Select Family'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isFamilyMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in divide-y divide-slate-100">
                    <div className="px-3 py-2 text-2xs uppercase tracking-wider font-bold text-slate-400">
                      Switch Active Family
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {families.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setActiveFamily(f);
                            setIsFamilyMenuOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50 transition-colors',
                            activeFamily?.id === f.id ? 'font-bold text-teal-800 bg-teal-50/50' : 'text-slate-700'
                          )}
                        >
                          <span className="truncate">{f.name}</span>
                          {activeFamily?.id === f.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                        </button>
                      ))}
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/families/create"
                        onClick={() => setIsFamilyMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      >
                        + Create New Family
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'text-teal-800 bg-teal-50 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-teal-600' : 'text-slate-400')} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              {/* AI Diagnostics Dropdown */}
              <div className="relative" ref={aiMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAIDropdownOpen((prev) => !prev)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                    isAIActive
                      ? 'text-teal-800 bg-teal-50 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <Sparkles className={cn('w-4 h-4', isAIActive ? 'text-teal-600' : 'text-slate-400')} />
                  <span>AI Diagnostics</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isAIDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in">
                    {aiLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsAIDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-medium transition-colors"
                        >
                          <Icon className="w-4 h-4 text-teal-600" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Emergency SOS, Notifications & User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Emergency SOS Button */}
            <Link
              to="/emergency/sos"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95 animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS</span>
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotifMenuOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-3xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in divide-y divide-slate-100">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="red" className="text-3xs">
                        {unreadCount} Unread
                      </Badge>
                    )}
                  </div>

                  <div className="py-1 max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No recent alerts</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'p-3 text-xs space-y-1 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2',
                            n.status === 'UNREAD' ? 'bg-teal-50/20' : ''
                          )}
                        >
                          <div className="space-y-0.5 flex-1">
                            <span className="font-bold text-slate-900 block truncate">{n.title}</span>
                            <span className="text-2xs text-slate-500 line-clamp-2">{n.message}</span>
                          </div>
                          {n.status === 'UNREAD' && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="p-1 text-teal-600 hover:bg-teal-100 rounded"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifMenuOpen(false)}
                      className="text-xs text-teal-700 hover:underline font-semibold"
                    >
                      View All Alerts →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors focus:outline-none"
              >
                <Avatar src={profile?.avatar_url} name={displayName} size="sm" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in divide-y divide-slate-100">
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                    <p className="text-2xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/consents"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      <span>Data Consents</span>
                    </Link>
                    <Link
                      to="/audit-logs"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Audit Trail</span>
                    </Link>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-100 space-y-1 animate-fade-in text-xs">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                <link.icon className="w-4 h-4 text-slate-400" />
                <span>{link.name}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <span className="px-3 text-2xs uppercase font-bold text-slate-400">AI Diagnostics</span>
              {aiLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="w-4 h-4 text-teal-600" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/emergency/sos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-rose-600 font-bold"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Emergency SOS Portal</span>
              </Link>
              <Link
                to="/audit-logs"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600"
              >
                <Clock className="w-4 h-4" />
                <span>Audit Trail</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
