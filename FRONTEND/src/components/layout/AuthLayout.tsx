import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-surface-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-primary font-bold text-2xl tracking-tight transition-transform hover:scale-[1.02]"
        >
          <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center text-primary shadow-xs border border-teal-100">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <span>Family Health Guardian</span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
          One Family &bull; One Health Center &bull; One Trusted Guardian
        </p>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      {/* Auth Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {children}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Family Health Guardian. Built for private healthcare management.
      </div>
    </div>
  );
};

export default AuthLayout;
