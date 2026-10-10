import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  User,
  Pill,
  FileText,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../context/FamilyContext';
import { useConsents } from '../hooks/useConsents';
import { useNotifications } from '../context/NotificationContext';
import type { Consent } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { families, activeFamily } = useFamily();
  const { data: consents } = useConsents();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const activeConsentsCount = consents?.filter((c: Consent) => c.status === 'ACTIVE').length || 0;

  const calculateProfileCompletion = () => {
    let completed = 1;
    let total = 5;
    if (profile?.full_name) completed++;
    if (profile?.gender) completed++;
    if (profile?.date_of_birth) completed++;
    if (profile?.phone_number) completed++;
    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-lg border border-teal-800/40">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Family Health Guardian v4.0.0</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {activeFamily ? (
              <>
                Active Family: <strong className="text-teal-300 font-bold">{activeFamily.name}</strong> •{' '}
                {activeFamily.members?.length || 1} member(s) protected.
              </>
            ) : (
              'Monitor clinical vitals, manage prescriptions, and protect your loved ones in a single unified health portal.'
            )}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/predictions/symptom-checker">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold border-0 shadow-md">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Check Symptoms AI
              </Button>
            </Link>
            <Link to="/emergency/sos">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-0 shadow-md">
                <Radio className="w-4 h-4 mr-1.5" />
                Emergency SOS
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => navigate('/families')}
          className="p-5 flex items-center justify-between border-slate-200/80 hover:border-teal-300 bg-white shadow-xs transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
              Family Circles
            </p>
            <h3 className="text-2xl font-black text-slate-900">{families.length}</h3>
            <p className="text-xs text-slate-500">Connected groups</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card
          onClick={() => navigate('/consents')}
          className="p-5 flex items-center justify-between border-slate-200/80 hover:border-emerald-300 bg-white shadow-xs transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
              Active Consents
            </p>
            <h3 className="text-2xl font-black text-slate-900">{activeConsentsCount}</h3>
            <p className="text-xs text-slate-500">Verified permissions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>

        <Card
          onClick={() => navigate('/notifications')}
          className="p-5 flex items-center justify-between border-slate-200/80 hover:border-amber-300 bg-white shadow-xs transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
              System Alerts
            </p>
            <h3 className="text-2xl font-black text-slate-900">{unreadCount}</h3>
            <p className="text-xs text-slate-500">Unread notifications</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card
          onClick={() => navigate('/profile')}
          className="p-5 flex items-center justify-between border-slate-200/80 hover:border-teal-300 bg-white shadow-xs transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
              Profile Setup
            </p>
            <h3 className="text-2xl font-black text-slate-900">{profileCompletion}%</h3>
            <p className="text-xs text-slate-500">Health credential score</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Feature Navigation Tiles */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Guardian Core Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/health-records" className="group">
            <Card className="p-5 bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all h-full">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Health Records</h3>
              <p className="text-xs text-slate-500 mt-1">
                Medical history, allergies, chronic conditions & vitals tracking.
              </p>
            </Card>
          </Link>

          <Link to="/medicine-schedules" className="group">
            <Card className="p-5 bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all h-full">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Medicines & Doses</h3>
              <p className="text-xs text-slate-500 mt-1">
                Daily dosage timeline, reminders & intake adherence rates.
              </p>
            </Card>
          </Link>

          <Link to="/medical-reports" className="group">
            <Card className="p-5 bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all h-full">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Document Vault</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload and inspect encrypted lab reports, X-rays & prescriptions.
              </p>
            </Card>
          </Link>

          <Link to="/emergency/sos" className="group">
            <Card className="p-5 bg-white border border-slate-200/80 hover:border-rose-300 hover:shadow-md transition-all h-full">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Emergency SOS</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hold-to-activate 3-second SOS with GPS coordinates & guardian alerts.
              </p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Machine Learning & Diagnostics Quick Access */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Tri-Engine Machine Learning Suite</h2>
          </div>
          <Link to="/predictions/trends" className="text-xs font-semibold text-teal-700 hover:underline">
            View Risk Trajectory →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-teal-500/10 via-white to-white border border-teal-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-teal-800">Engine 1</span>
              <Badge variant="teal">97.52% ROC-AUC</Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Diabetes Stacking Super Learner</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Random Forest + HistGB ensemble with local feature attribution & auto-prefill.
              </p>
            </div>
            <Link to="/predictions/diabetes" className="block pt-2">
              <Button size="sm" fullWidth className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
                Run Assessment →
              </Button>
            </Link>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-rose-500/10 via-white to-white border border-rose-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-rose-800">Engine 2</span>
              <Badge variant="red">13 Factors</Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hypertension Soft-Voting Ensemble</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Blended ensemble analyzing hemodynamic markers, age, and cardiac history.
              </p>
            </div>
            <Link to="/predictions/hypertension" className="block pt-2">
              <Button size="sm" fullWidth className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                Run Assessment →
              </Button>
            </Link>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-cyan-500/10 via-white to-white border border-cyan-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-cyan-800">Engine 3 [NEW]</span>
              <Badge variant="indigo">41 Diseases</Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Symptom Diagnostic Checker</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Multiclass triage matching 131 clinical symptoms to evidence-based candidate diseases.
              </p>
            </div>
            <Link to="/predictions/symptom-checker" className="block pt-2">
              <Button size="sm" fullWidth className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs">
                Check Symptoms →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
