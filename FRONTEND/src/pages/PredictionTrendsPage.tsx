import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, User } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { predictionService } from '../lib/services/predictionService';
import type { PredictionTrendsResponse } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export const PredictionTrendsPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [trends, setTrends] = useState<PredictionTrendsResponse | null>(null);
  const [predictionType, setPredictionType] = useState<string>('DIABETES');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const memberId = activeMember?.id || '';

  const fetchTrends = async () => {
    if (!memberId) {
      setTrends(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await predictionService.getTrends(memberId, predictionType);
      setTrends(data);
    } catch (err: any) {
      console.warn('Failed to load risk trends:', err);
      toast.error('Failed to load longitudinal trends');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [memberId, predictionType]);

  const getTrajectoryBadge = (traj: string) => {
    switch (traj) {
      case 'IMPROVING':
        return (
          <Badge variant="emerald" className="flex items-center gap-1 font-bold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            IMPROVING
          </Badge>
        );
      case 'WORSENING':
        return (
          <Badge variant="red" className="flex items-center gap-1 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            WORSENING
          </Badge>
        );
      case 'STABLE':
        return (
          <Badge variant="teal" className="flex items-center gap-1 font-bold">
            <Minus className="w-3.5 h-3.5" />
            STABLE
          </Badge>
        );
      default:
        return <Badge variant="gray">INSUFFICIENT DATA</Badge>;
    }
  };

  const chartData = (trends?.data_points || []).map((dp) => ({
    date: new Date(dp.assessed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    risk: dp.risk_percentage,
    label: dp.risk_label,
  }));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Longitudinal Health Trajectory</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Prediction Trends & Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track risk progression over time across successive clinical assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeFamily?.members && activeFamily.members.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <User className="w-4 h-4 text-slate-400 mr-2" />
              <select
                className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                value={activeMember?.id || ''}
                onChange={(e) => {
                  const m = activeFamily.members?.find((mem) => mem.id === e.target.value);
                  if (m) setActiveMember(m);
                }}
              >
                {activeFamily.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.profile?.full_name || `Member (${m.role})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setPredictionType('DIABETES')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                predictionType === 'DIABETES'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Diabetes
            </button>
            <button
              onClick={() => setPredictionType('HYPERTENSION')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                predictionType === 'HYPERTENSION'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Hypertension
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : !trends || (trends.data_points && trends.data_points.length === 0) ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={TrendingUp}
            title="Insufficient longitudinal assessment data"
            description="Run at least one or two ML assessments with 'Save to records' checked to view historical trend curves."
            actionLabel="Run Assessment Now"
            onAction={() => window.location.assign('/predictions/diabetes')}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs font-bold uppercase text-slate-400">Trajectory Status</span>
              <div className="mt-2">{getTrajectoryBadge(trends.trajectory)}</div>
              <p className="text-xs text-slate-500 mt-2">{trends.clinical_summary || 'Trajectory monitored over time.'}</p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs font-bold uppercase text-slate-400">Latest Risk Score</span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {trends.latest_risk_percentage !== null ? `${trends.latest_risk_percentage.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Most recent ML evaluation</p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs font-bold uppercase text-slate-400">Baseline Risk Score</span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {trends.baseline_risk_percentage !== null ? `${trends.baseline_risk_percentage.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-1">First registered evaluation</p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs font-bold uppercase text-slate-400">Net Delta Risk</span>
              <div className="mt-2 text-2xl font-black text-slate-900 flex items-center gap-1">
                {trends.delta_percentage !== null ? (
                  <>
                    <span>{trends.delta_percentage > 0 ? `+${trends.delta_percentage.toFixed(1)}%` : `${trends.delta_percentage.toFixed(1)}%`}</span>
                    {trends.delta_percentage > 0 ? (
                      <ArrowUpRight className="w-5 h-5 text-rose-500" />
                    ) : trends.delta_percentage < 0 ? (
                      <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                    ) : null}
                  </>
                ) : '0%'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Progression change from baseline</p>
            </Card>
          </div>

          <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Longitudinal Risk Score Trajectory</h3>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Risk Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke={predictionType === 'DIABETES' ? '#0d9488' : '#e11d48'}
                    strokeWidth={3}
                    dot={{ fill: '#fff', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PredictionTrendsPage;
