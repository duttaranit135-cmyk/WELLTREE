import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-surface-light flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-primary flex items-center justify-center mx-auto mb-6 shadow-2xs">
          <FileQuestion className="w-8 h-8 text-primary" />
        </div>

        <p className="text-5xl sm:text-6xl font-black text-primary tracking-tight mb-2">
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to={homePath} className="inline-block w-full">
          <Button variant="primary" icon={ArrowLeft} fullWidth size="lg">
            {isAuthenticated ? 'Go to Dashboard' : 'Go Home'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
