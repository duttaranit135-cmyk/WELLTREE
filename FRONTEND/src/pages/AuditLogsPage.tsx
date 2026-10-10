import React, { useState, useEffect } from 'react';
import { Shield, Eye, FileCheck2 } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { auditService } from '../lib/services/auditService';
import type { AuditLog } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const AuditLogsPage: React.FC = () => {
  const { activeFamily } = useFamily();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const familyId = activeFamily?.id;

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await auditService.getLogs(familyId);
      setLogs(data || []);
    } catch (err: any) {
      console.warn('Failed to load audit logs:', err);
      toast.error('Failed to load tamper-evident audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [familyId]);

  const filteredLogs = logs.filter((l) => {
    if (actionFilter === 'ALL') return true;
    return l.action.toUpperCase().includes(actionFilter);
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('INSERT')) {
      return <Badge variant="emerald">CREATE</Badge>;
    }
    if (act.includes('UPDATE') || act.includes('MODIFY')) {
      return <Badge variant="amber">UPDATE</Badge>;
    }
    if (act.includes('DELETE') || act.includes('REVOKE')) {
      return <Badge variant="red">DELETE</Badge>;
    }
    if (act.includes('PREDICTION') || act.includes('EVAL')) {
      return <Badge variant="teal">ML INFERENCE</Badge>;
    }
    return <Badge variant="gray">READ</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Shield className="w-4 h-4" />
            <span>Immutable Ledger</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Tamper-Evident Audit Trail
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cryptographically sealed, chronological audit history for all clinical records, consents, and AI inferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'PREDICTION'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                actionFilter === act
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={FileCheck2}
            title="No audit entries found"
            description="All platform interactions will be chronologically indexed here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.resource_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-2xs truncate max-w-[120px]">
                      {log.actor_user_id}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-teal-700 hover:bg-teal-50 py-1 px-2.5 h-auto"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Event Inspection"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block uppercase font-bold">Action:</span>
                <span className="font-semibold text-slate-800">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Resource Type:</span>
                <span className="font-semibold text-slate-800">{selectedLog.resource_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Actor User ID:</span>
                <span className="font-mono text-slate-800 truncate block">{selectedLog.actor_user_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Timestamp:</span>
                <span className="text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Metadata Payload
              </span>
              <pre className="p-3 bg-slate-900 text-teal-300 rounded-lg text-2xs font-mono overflow-x-auto max-h-[220px]">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogsPage;
