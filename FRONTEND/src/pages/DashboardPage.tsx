import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  User,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFamilies } from '../hooks/useFamilies';
import { useConsents } from '../hooks/useConsents';
import { formatDate } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: families, isLoading: isFamiliesLoading } = useFamilies();
  const { data: consents, isLoading: isConsentsLoading } = useConsents();

  const isLoading = isProfileLoading || isFamiliesLoading || isConsentsLoading;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const activeConsentsCount = consents?.filter((c) => c.status === 'ACTIVE').length || 0;
  const pendingConsentsCount = consents?.filter((c) => c.status === 'PENDING').length || 0;
  const familiesCount = families?.length || 0;

  // Profile completion calculation
  const profileFields = [
    Boolean(profile?.full_name?.trim()),
    Boolean(profile?.date_of_birth?.trim()),
    Boolean(profile?.gender?.trim()),
    Boolean(profile?.phone_number?.trim()),
    Boolean(profile?.avatar_url?.trim()),
  ];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description="Monitor your family health groups, guardian consents, and access permissions in real time."
        action={
          <div className="flex items-center gap-3">
            <Link to="/families/create">
              <Button variant="outline" icon={Plus}>
                Create Family
              </Button>
            </Link>
            <Link to="/consents">
              <Button variant="primary" icon={ShieldCheck}>
                Grant Consent
              </Button>
            </Link>
          </div>
        }
      />

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Families */}
        <Card
          onClick={() => navigate('/families')}
          className="p-5 flex items-center justify-between border-teal-100 bg-white hover:border-teal-300 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Family Circles
            </p>
            {isLoading ? (
              <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black text-slate-900">
                {familiesCount}
              </h3>
            )}
            <p className="text-xs text-slate-500">Active health hubs</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        {/* Active Consents */}
        <Card
          onClick={() => navigate('/consents')}
          className="p-5 flex items-center justify-between border-emerald-100 bg-white hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Consents
            </p>
            {isLoading ? (
              <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black text-slate-900">
                {activeConsentsCount}
              </h3>
            )}
            <p className="text-xs text-slate-500">Authorized guardians</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Pending Requests */}
        <Card
          onClick={() => navigate('/consents')}
          className="p-5 flex items-center justify-between border-amber-100 bg-white hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Requests
            </p>
            {isLoading ? (
              <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black text-slate-900">
                {pendingConsentsCount}
              </h3>
            )}
            <p className="text-xs text-slate-500">Awaiting confirmation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-warning flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        {/* Profile Completion */}
        <Card
          onClick={() => navigate('/profile')}
          className="p-5 flex items-center justify-between border-indigo-100 bg-white hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="space-y-1 flex-1 pr-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Profile Setup
            </p>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black text-slate-900">
                {profileCompletion}%
              </h3>
            )}
            <p className="text-xs text-slate-500">Health credential meter</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-secondary flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Families Overview (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-900">
                My Family Health Groups
              </h2>
            </div>
            <Link
              to="/families"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 p-4" />
              ))}
            </div>
          ) : !families || families.length === 0 ? (
            <Card className="p-8 text-center space-y-3 border-dashed">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No family groups created yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a family circle to invite loved ones, assign guardians, and share health logs safely.
              </p>
              <Link to="/families/create" className="inline-block pt-2">
                <Button variant="primary" size="sm" icon={Plus}>
                  Create Family
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {families.slice(0, 3).map((f) => (
                <Card
                  key={f.id}
                  onClick={() => navigate(`/families/${f.id}`)}
                  className="p-5 flex items-center justify-between hover:border-teal-300 transition-all cursor-pointer"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-base">{f.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {f.description || 'No description provided.'}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created {formatDate(f.created_at)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="teal" size="sm">
                      {f.members?.length || 1} members
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Consents & Guardian Alerts (1 span) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-bold text-slate-900">
                Consent Overview
              </h2>
            </div>
            <Link
              to="/consents"
              className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Consents I Granted</span>
                <span className="font-bold text-slate-800">
                  {consents?.filter((c) => c.granter_id === user?.id).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Access Granted to Me</span>
                <span className="font-bold text-slate-800">
                  {consents?.filter((c) => c.grantee_id === user?.id).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Pending Requests</span>
                <Badge variant={pendingConsentsCount > 0 ? 'amber' : 'gray'} size="sm">
                  {pendingConsentsCount} Action Needed
                </Badge>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/consents" className="block">
                <Button variant="outline" size="sm" fullWidth icon={Activity}>
                  Open Consent Hub
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Notice Card */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3 text-xs text-teal-900">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Privacy Reminder</p>
              <p className="text-teal-700 mt-0.5 leading-relaxed">
                Health records are restricted to active consents. You can immediately revoke access at any time from the Consent Hub.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
