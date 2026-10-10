import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, User, Eye, CheckCircle } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { predictionService } from '../lib/services/predictionService';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const PredictionHistoryPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const memberId = activeMember?.id || '';

  const fetchHistory = async () => {
    if (!memberId) {
      setHistory([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await predictionService.getHistory(memberId);
      setHistory(data || []);
    } catch (err: any) {
      console.warn('Failed to load assessment history:', err);
      toast.error('Failed to load past assessments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [memberId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this assessment record?')) return;
    try {
      await predictionService.deleteHistoryRecord(id);
      toast.success('Record deleted');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Date', 'Type', 'Risk Label', 'Risk %', 'Confidence'];
    const rows = history.map((h) => [
      h.id || h.record_id,
      h.assessed_at || h.created_at,
      h.prediction_type,
      h.risk_label,
      h.risk_percentage,
      h.confidence_level,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prediction_history_${memberId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <FileText className="w-4 h-4" />
            <span>Audited Historical Assessments</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Prediction Records Archive
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Searchable historical records of all completed ML risk evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          {history.length > 0 && (
            <Button onClick={exportCSV} variant="outline" className="border-slate-200">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : history.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={FileText}
            title="No past assessment records stored"
            description="Evaluations with 'Save to records' will be listed in this table."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Evaluation Type</th>
                  <th className="py-3 px-4">Risk Classification</th>
                  <th className="py-3 px-4">Risk %</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((rec) => (
                  <tr key={rec.id || rec.record_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(rec.assessed_at || rec.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {rec.prediction_type}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={rec.risk_label === 'High Risk' ? 'red' : 'emerald'}>
                        {rec.risk_label}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {rec.risk_percentage?.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {rec.confidence_level}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRecord(rec)}
                          className="text-xs text-teal-700 hover:bg-teal-50 py-1 px-2.5 h-auto"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <button
                          onClick={() => handleDelete(rec.id || rec.record_id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Clinical Assessment Detail"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 uppercase font-bold block">Type:</span>
                <span className="font-semibold text-slate-800">{selectedRecord.prediction_type}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block">Risk Label:</span>
                <span className="font-semibold text-slate-800">{selectedRecord.risk_label}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block">Probability:</span>
                <span className="font-bold text-slate-800">{selectedRecord.risk_percentage?.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block">Assessed At:</span>
                <span className="text-slate-800">{new Date(selectedRecord.assessed_at || selectedRecord.created_at).toLocaleString()}</span>
              </div>
            </div>

            {selectedRecord.recommendations && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-700 block">Guidelines</span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {selectedRecord.recommendations.map((r: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PredictionHistoryPage;
