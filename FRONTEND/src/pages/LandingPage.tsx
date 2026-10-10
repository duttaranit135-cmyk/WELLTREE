import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  HeartPulse,
  UserPlus,
  Users,
  FileCheck2,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-surface-light flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-primary shadow-2xs">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-primary to-teal-800 bg-clip-text text-transparent tracking-tight">
              Family Health Guardian
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          {/* Subtle Background Gradient Accents */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-teal-200/30 via-indigo-200/20 to-teal-100/30 rounded-full blur-3xl -z-10 pointer-events-none"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-primary text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>Next-Gen Healthcare Privacy &amp; Family Hub</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              One Family. One Health Center.{' '}
              <span className="bg-gradient-to-r from-primary via-teal-700 to-secondary bg-clip-text text-transparent block mt-2">
                One Trusted Guardian.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Securely manage your family's health records with role-based access and granular consent controls.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" icon={ArrowRight} className="px-8 shadow-md">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" icon={ArrowRight} className="px-8 shadow-md">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="px-8 bg-white">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Trust highlights banner */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" /> RLS Data Isolation
              </span>
              <span className="hidden sm:inline">&bull;</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Mutual Granular Consent
              </span>
              <span className="hidden sm:inline">&bull;</span>
              <span className="flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-primary" /> Instant Guardian Access
              </span>
            </div>
          </div>
        </section>

        {/* 3. Features Grid */}
        <section className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary">
                Built For Complete Privacy
              </h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Healthcare coordination without compromising privacy
              </p>
              <p className="mt-4 text-base text-slate-500">
                Designed to give family members total autonomy over who can inspect or modify their personal medical documents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-surface-light border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-primary mb-6 shadow-2xs">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                  Role-Based Family Access
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Organize family members as Admins, Guardians, or Members with distinct permissions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-surface-light border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-secondary mb-6 shadow-2xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                  Granular Health Consent
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Grant, review, and revoke access to health records with full transparency.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-surface-light border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-danger mb-6 shadow-2xs">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                  Emergency Guardian Access
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Designate trusted guardians who can access critical health data when it matters most.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works Section */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-surface-light">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-secondary">
                Simple &amp; Secure
              </h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                How Family Health Guardian Works
              </p>
              <p className="mt-4 text-base text-slate-500">
                Three easy steps to establish a trusted circle of care for your loved ones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="relative bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  1
                </div>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-primary flex items-center justify-center mb-5 mt-2">
                  <UserPlus className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Create your account and set up your profile
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Register in seconds with email verification and complete your personal health guardian profile details.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-secondary text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  2
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-secondary flex items-center justify-center mb-5 mt-2">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Create a family group and invite members
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Establish custom family circles and assign role permissions (Admin, Guardian, or Member).
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  3
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-warning flex items-center justify-center mb-5 mt-2">
                  <FileCheck2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Manage consents and control who sees what
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Grant read-only or full access to health records with immediate revocation controls whenever needed.
                </p>
              </div>
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-16 text-center">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <Button size="lg" icon={ArrowRight} className="shadow-md">
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started Now'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p>&copy; 2024 Family Health Guardian. All rights reserved.</p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a
              href="#"
              className="text-slate-500 hover:text-primary transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-primary transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
