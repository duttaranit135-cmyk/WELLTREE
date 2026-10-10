import React, { useState, useEffect } from 'react';
import { Activity, Plus, Heart, AlertTriangle, User, Stethoscope, Calendar, Trash2, Edit3 } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { healthService } from '../lib/services/healthService';
import type { HealthRecord, HealthRecordCreate } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const HealthRecordsPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

  const [formData, setFormData] = useState<HealthRecordCreate>({
    family_member_id: '',
    blood_group: 'O+',
    allergies: '',
    chronic_conditions: '',
    medical_history: '',
    current_conditions: '',
    doctor_name: '',
    doctor_contact: '',
    notes: '',
  });

  const memberId = activeMember?.id || '';

  const fetchRecords = async () => {
    if (!memberId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await healthService.getRecords(memberId);
      setRecords(data || []);
    } catch (err: any) {
      console.warn('Failed to load health records:', err);
      toast.error('Failed to load health records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [memberId]);

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData({
      family_member_id: memberId,
      blood_group: 'O+',
      allergies: '',
      chronic_conditions: '',
      medical_history: '',
      current_conditions: '',
      doctor_name: '',
      doctor_contact: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: HealthRecord) => {
    setEditingRecord(rec);
    setFormData({
      family_member_id: rec.family_member_id,
      blood_group: rec.blood_group || 'O+',
      allergies: rec.allergies || '',
      chronic_conditions: rec.chronic_conditions || '',
      medical_history: rec.medical_history || '',
      current_conditions: rec.current_conditions || '',
      doctor_name: rec.doctor_name || '',
      doctor_contact: rec.doctor_contact || '',
      notes: rec.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.family_member_id) {
      toast.error('Please select an active family member first');
      return;
    }

    try {
      if (editingRecord) {
        await healthService.updateRecord(editingRecord.id, formData);
        toast.success('Health record updated successfully');
      } else {
        await healthService.createRecord(formData);
        toast.success('Health record registered successfully');
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this health record?')) return;
    try {
      await healthService.deleteRecord(id);
      toast.success('Record deleted');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const latestRecord = records[0];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Activity className="w-4 h-4" />
            <span>Clinical Summary & Vitals</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Health Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Comprehensive medical history, chronic conditions, and vital stats for your family.
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

          <Button onClick={handleOpenCreate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={Activity}
            title="No health records found"
            description="Start by registering the first clinical record, blood type, or chronic conditions for this member."
            actionLabel="Create Health Record"
            onAction={handleOpenCreate}
          />
        </Card>
      ) : (
        <>
          {latestRecord && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5 bg-gradient-to-br from-teal-500/10 via-white to-white border-teal-200/60 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-teal-700 tracking-wider">Blood Group</span>
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    <Heart className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">
                  {latestRecord.blood_group || 'Not set'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Confirmed laboratory profile</p>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-rose-500/10 via-white to-white border-rose-200/60 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-rose-700 tracking-wider">Allergies</span>
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-800 line-clamp-2">
                  {latestRecord.allergies || 'None reported'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Allergen sensitivity warning</p>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-white to-white border-amber-200/60 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-amber-700 tracking-wider">Chronic Conditions</span>
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-800 line-clamp-2">
                  {latestRecord.chronic_conditions || 'None diagnosed'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ongoing clinical management</p>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-cyan-500/10 via-white to-white border-cyan-200/60 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-cyan-700 tracking-wider">Attending Physician</span>
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-base font-bold text-slate-900 truncate">
                  {latestRecord.doctor_name || 'Not assigned'}
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {latestRecord.doctor_contact || 'No contact on file'}
                </p>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Clinical History Timeline</h2>
            <div className="grid grid-cols-1 gap-4">
              {records.map((rec) => (
                <Card key={rec.id} className="p-6 bg-white border border-slate-200/80 hover:border-teal-300 transition-all shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="teal">
                          {rec.blood_group || 'Blood Group N/A'}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Updated: {new Date(rec.updated_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-sm">
                        {rec.allergies && (
                          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                            <span className="text-xs font-semibold text-rose-700 uppercase block">Allergies</span>
                            <span className="text-slate-800 font-medium">{rec.allergies}</span>
                          </div>
                        )}
                        {rec.chronic_conditions && (
                          <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                            <span className="text-xs font-semibold text-amber-700 uppercase block">Chronic Conditions</span>
                            <span className="text-slate-800 font-medium">{rec.chronic_conditions}</span>
                          </div>
                        )}
                        {rec.medical_history && (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-xs font-semibold text-slate-500 uppercase block">Past History</span>
                            <span className="text-slate-800 font-medium">{rec.medical_history}</span>
                          </div>
                        )}
                      </div>

                      {rec.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <strong className="text-slate-700">Physician Notes:</strong> {rec.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit record"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Edit Health Record' : 'Add New Health Record'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={formData.blood_group || ''}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Name</label>
              <Input
                placeholder="Dr. Sarah Johnson"
                value={formData.doctor_name || ''}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Contact / Clinic</label>
            <Input
              placeholder="+1 (555) 234-5678 / St. Jude Medical"
              value={formData.doctor_contact || ''}
              onChange={(e) => setFormData({ ...formData, doctor_contact: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Allergies (comma-separated)</label>
            <Input
              placeholder="Penicillin, Peanuts, Latex"
              value={formData.allergies || ''}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Chronic Conditions</label>
            <Input
              placeholder="Type 2 Diabetes, Hypertension, Asthma"
              value={formData.chronic_conditions || ''}
              onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Past Medical History</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="Appendectomy in 2021, Fractured tibia in 2018..."
              value={formData.medical_history || ''}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Clinical Notes</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="Patient is monitoring blood sugar twice daily..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              {editingRecord ? 'Save Changes' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HealthRecordsPage;
