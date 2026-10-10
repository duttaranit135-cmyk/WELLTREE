import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle, ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { emergencyService } from '../lib/services/emergencyService';
import type { EmergencySOS } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const SOSHistoryPage: React.FC = () => {
  const { activeMember } = useFamily();
  const [incidents, setIncidents] = useState<EmergencySOS[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resolvingSOS, setResolvingSOS] = useState<EmergencySOS | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const memberId = activeMember?.id || '';

  const fetchIncidents = async () => {
    if (!memberId) {
      setIncidents([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await emergencyService.getSOSHistory(memberId);
      setIncidents(data || []);
    } catch (err: any) {
      console.warn('Failed to load SOS history:', err);
      toast.error('Failed to load incident history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [memberId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingSOS) return;

    try {
      await emergencyService.updateSOSStatus(
        resolvingSOS.id,
        'RESOLVED',
        resolutionNotes || 'Emergency resolved by responder.'
      );
      toast.success('Incident marked as RESOLVED');
      setResolvingSOS(null);
      setResolutionNotes('');
      fetchIncidents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve incident');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>Audit Trail & Response Timeline</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            SOS Incident History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review past emergency alarms, responder notes, and coordinate telemetry.
          </p>
        </div>

        <Link to="/emergency/sos">
          <Button variant="outline" className="border-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to SOS Trigger
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : incidents.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={Clock}
            title="No past emergency incidents"
            description="All family members are safe. No distress beacons have been triggered."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              className="p-6 bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={inc.status === 'ACTIVE' ? 'red' : 'emerald'}>
                      {inc.status}
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(inc.triggered_at).toLocaleString()}
                    </span>
                  </div>

                  {inc.notes && (
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong>Notes:</strong> {inc.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    {inc.latitude && inc.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-teal-700 hover:underline font-semibold"
                      >
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span>Guardians Dispatched: {inc.emergency_contacts_count || 'All'}</span>
                    {inc.resolved_at && (
                      <span>Resolved at: {new Date(inc.resolved_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {inc.status === 'ACTIVE' && (
                  <Button
                    onClick={() => {
                      setResolvingSOS(inc);
                      setResolutionNotes('');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs self-end sm:self-start"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Mark Resolved
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolvingSOS && (
        <Modal
          isOpen={!!resolvingSOS}
          onClose={() => setResolvingSOS(null)}
          title="Resolve Emergency Incident"
        >
          <form onSubmit={handleResolve} className="space-y-4">
            <p className="text-sm text-slate-600">
              Document responder findings and resolution notes before closing this alert.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Resolution Notes *
              </label>
              <textarea
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Paramedics arrived on scene, vitals stabilized, patient resting safely."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setResolvingSOS(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Resolution
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SOSHistoryPage;
