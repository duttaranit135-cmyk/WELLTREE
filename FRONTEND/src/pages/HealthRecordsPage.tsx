import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Plus, Heart, AlertTriangle, User, Users, Stethoscope, Calendar, Trash2, Edit3, FileText } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../hooks/useAuth';
import { healthService } from '../lib/services/healthService';
import {
  getAllFamilyMembers,
  getMemberDisplayName,
  getDefaultHealthRecordsForMember,
} from '../lib/utils';
import type { HealthRecord, HealthRecordCreate, FamilyMember } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const HealthRecordsPage: React.FC = () => {
  const { families, activeFamily, setActiveFamily, activeMember, setActiveMember } = useFamily();
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

  const handleFamilyChange = (famId: string) => {
    const selected = families.find((f) => f.id === famId);
    if (selected) {
      setActiveFamily(selected);
    }
  };

  // Compute all available members for the family: Admin + Sarah Jenkins + Aarav Dutta + Kavita Dutta + Custom
  const familyMembers = useMemo(() => {
    return getAllFamilyMembers(activeFamily, user, profile?.full_name);
  }, [activeFamily, user, profile]);

  const getMemberName = (m: FamilyMember) => {
    return getMemberDisplayName(m, user?.id, profile?.full_name);
  };

  // Auto-select first member if none selected
  useEffect(() => {
    if ((!activeMember || !familyMembers.some((m) => m.id === activeMember.id)) && familyMembers.length > 0) {
      setActiveMember(familyMembers[0]);
    }
  }, [activeMember, familyMembers, setActiveMember]);

  const memberId = activeMember?.id || familyMembers[0]?.id || '';

  const [formData, setFormData] = useState<HealthRecordCreate>({
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

  const fetchRecords = async () => {
    if (!memberId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      let data: HealthRecord[] = [];
      try {
        data = await healthService.getRecords(memberId);
      } catch (err) {
        console.warn('Backend getRecords failed, checking local:', err);
      }
      // Merge with local records and pre-seeded clinical defaults
      const saved = localStorage.getItem(`wt_health_records_${memberId}`);
      const locals: HealthRecord[] = saved ? JSON.parse(saved) : [];
      const defaults = getDefaultHealthRecordsForMember(memberId);

      const merged = [...(data || [])];
      locals.forEach((lr) => {
        if (!merged.some((m) => m.id === lr.id)) {
          merged.push(lr);
        }
      });
      defaults.forEach((dr) => {
        if (!merged.some((m) => m.id === dr.id)) {
          merged.push(dr);
        }
      });
      setRecords(merged);
    } catch (err: any) {
      console.warn('Failed to load health records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [memberId]);

  const handleOpenCreate = () => {
    setEditingRecord(null);
    const targetMemberId = memberId || familyMembers[0]?.id || '';
    setFormData({
      family_member_id: targetMemberId,
      blood_group: 'O+',
      allergies: '',
      chronic_conditions: '',
      medical_history: '',
      current_conditions: '',
      doctor_name: '',
      doctor_contact: '',
      notes: '',
    });
    if (!activeMember && familyMembers[0]) {
      setActiveMember(familyMembers[0]);
    }
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
    const targetMemberId = formData.family_member_id || memberId || familyMembers[0]?.id;
    if (!targetMemberId) {
      toast.error('Please select an active family member first');
      return;
    }

    const payload = {
      ...formData,
      family_member_id: targetMemberId,
    };

    try {
      if (editingRecord) {
        try {
          await healthService.updateRecord(editingRecord.id, payload);
        } catch (e) {
          console.warn('Backend updateRecord failed, saving locally:', e);
        }
        const updated = records.map((r) =>
          r.id === editingRecord.id ? { ...r, ...payload, updated_at: new Date().toISOString() } : r
        );
        setRecords(updated);
        try {
          localStorage.setItem(`wt_health_records_${targetMemberId}`, JSON.stringify(updated));
        } catch {}
        toast.success('Health record updated successfully');
      } else {
        const newRecord: HealthRecord = {
          id: `rec-${Date.now()}`,
          family_member_id: targetMemberId,
          blood_group: payload.blood_group,
          allergies: payload.allergies || null,
          chronic_conditions: payload.chronic_conditions || null,
          medical_history: payload.medical_history || null,
          current_conditions: payload.current_conditions || null,
          doctor_name: payload.doctor_name || null,
          doctor_contact: payload.doctor_contact || null,
          notes: payload.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          const serverRec = await healthService.createRecord(payload);
          if (serverRec) {
            newRecord.id = serverRec.id || newRecord.id;
          }
        } catch (e) {
          console.warn('Backend createRecord failed, saving locally:', e);
        }

        const updated = [newRecord, ...records];
        setRecords(updated);
        try {
          localStorage.setItem(`wt_health_records_${targetMemberId}`, JSON.stringify(updated));
        } catch {}
        toast.success('Health record registered successfully');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this health record?')) return;
    try {
      try {
        await healthService.deleteRecord(id);
      } catch (err) {
        console.warn('Backend delete failed, removing locally:', err);
      }
      const updated = records.filter((r) => r.id !== id);
      setRecords(updated);
      try {
        localStorage.setItem(`wt_health_records_${memberId}`, JSON.stringify(updated));
      } catch {}
      toast.success('Record deleted');
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
          {families.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:border-teal-300 transition-colors">
              <Users className="w-4 h-4 text-teal-600 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">Family</span>
                <select
                  className="text-sm font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                  value={activeFamily?.id || ''}
                  onChange={(e) => handleFamilyChange(e.target.value)}
                >
                  {families.map((fam) => (
                    <option key={fam.id} value={fam.id}>
                      {fam.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {familyMembers.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:border-teal-300 transition-colors">
              <User className="w-4 h-4 text-teal-600 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">Family Member</span>
                <select
                  className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
                  value={activeMember?.id || familyMembers[0]?.id || ''}
                  onChange={(e) => {
                    const m = familyMembers.find((mem) => mem.id === e.target.value);
                    if (m) setActiveMember(m);
                  }}
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {getMemberName(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Link to="/medical-reports">
            <Button variant="outline" className="flex items-center gap-2 border-teal-200 text-teal-700 hover:bg-teal-50">
              <FileText className="w-4 h-4" />
              <span>Upload Documents / Reports</span>
            </Button>
          </Link>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Select Family *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
                value={activeFamily?.id || ''}
                onChange={(e) => handleFamilyChange(e.target.value)}
              >
                {families.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Select Family Member *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
                value={formData.family_member_id}
                onChange={(e) => {
                  const chosenId = e.target.value;
                  setFormData((prev) => ({ ...prev, family_member_id: chosenId }));
                  const chosen = familyMembers.find((m) => m.id === chosenId);
                  if (chosen) setActiveMember(chosen);
                }}
                required
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMemberName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
