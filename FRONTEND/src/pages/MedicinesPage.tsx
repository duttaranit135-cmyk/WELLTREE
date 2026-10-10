import React, { useState, useEffect } from 'react';
import { Pill, Plus, Calendar, Trash2, Edit3, User } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { medicineService } from '../lib/services/medicineService';
import type { Medicine, MedicineCreate } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const MedicinesPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [formData, setFormData] = useState<MedicineCreate>({
    family_member_id: '',
    medicine_name: '',
    dosage: '',
    dosage_unit: 'mg',
    frequency: 'Once daily',
    route: 'Oral',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    prescribed_by: '',
    instructions: 'Take with food',
    is_active: true,
  });

  const memberId = activeMember?.id || '';

  const fetchMedicines = async () => {
    if (!memberId) {
      setMedicines([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await medicineService.getMedicines(memberId);
      setMedicines(data || []);
    } catch (err: any) {
      console.warn('Failed to load medicines:', err);
      toast.error('Failed to load medicines catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [memberId]);

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setFormData({
      family_member_id: memberId,
      medicine_name: '',
      dosage: '',
      dosage_unit: 'mg',
      frequency: 'Once daily',
      route: 'Oral',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      prescribed_by: '',
      instructions: 'Take with food',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Medicine) => {
    setEditingMedicine(m);
    setFormData({
      family_member_id: m.family_member_id,
      medicine_name: m.medicine_name,
      dosage: m.dosage || '',
      dosage_unit: m.dosage_unit || 'mg',
      frequency: m.frequency || 'Once daily',
      route: m.route || 'Oral',
      start_date: m.start_date || '',
      end_date: m.end_date || '',
      prescribed_by: m.prescribed_by || '',
      instructions: m.instructions || '',
      is_active: m.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.family_member_id) {
      toast.error('Select a family member first');
      return;
    }
    if (!formData.medicine_name.trim()) {
      toast.error('Medicine name is required');
      return;
    }

    try {
      if (editingMedicine) {
        await medicineService.updateMedicine(editingMedicine.id, formData);
        toast.success('Medicine updated successfully');
      } else {
        await medicineService.createMedicine(formData);
        toast.success('Medicine added to catalog');
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this medication?')) return;
    try {
      await medicineService.deleteMedicine(id);
      toast.success('Medication removed');
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete medication');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Pill className="w-4 h-4" />
            <span>Prescriptions & Pharmacopeia</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Medicines Catalog
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage prescribed medicines, dosages, and administration guidelines.
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

          <Link to="/medicine-schedules">
            <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Calendar className="w-4 h-4 mr-2" />
              Intake Timeline
            </Button>
          </Link>

          <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : medicines.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={Pill}
            title="No medications cataloged yet"
            description="Add prescriptions and ongoing medicines for your family members."
            actionLabel="Add First Medicine"
            onAction={handleOpenCreate}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medicines.map((m) => (
            <Card
              key={m.id}
              className="p-6 bg-white border border-slate-200/80 hover:border-teal-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {m.medicine_name}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {m.dosage ? `${m.dosage} ${m.dosage_unit || ''}` : 'Dosage unspecified'} • {m.route || 'Oral'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={m.is_active ? 'emerald' : 'gray'}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Frequency:</span>
                    <span className="font-semibold text-slate-800">{m.frequency || 'Daily'}</span>
                  </div>
                  {m.prescribed_by && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Prescriber:</span>
                      <span className="font-semibold text-slate-800">{m.prescribed_by}</span>
                    </div>
                  )}
                  {m.instructions && (
                    <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-2xs uppercase font-bold">Directions:</span>
                      <span className="text-slate-700">{m.instructions}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(m)}
                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Edit medicine"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Edit Medication' : 'Add Medication'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Medicine Name *
            </label>
            <Input
              placeholder="e.g. Metformin, Amlodipine, Lisinopril"
              value={formData.medicine_name}
              onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dosage Amount</label>
              <Input
                placeholder="500"
                value={formData.dosage || ''}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={formData.dosage_unit || 'mg'}
                onChange={(e) => setFormData({ ...formData, dosage_unit: e.target.value })}
              >
                {['mg', 'mcg', 'g', 'ml', 'drops', 'tablets', 'capsules'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Frequency</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={formData.frequency || 'Once daily'}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                {['Once daily', 'Twice daily', 'Three times daily', 'Every 4 hours', 'As needed (PRN)', 'Weekly'].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Route</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={formData.route || 'Oral'}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              >
                {['Oral', 'Sublingual', 'Topical', 'Inhalation', 'Injection', 'Ophthalmic'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prescribed By</label>
            <Input
              placeholder="Dr. Michael Vance"
              value={formData.prescribed_by || ''}
              onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Instructions</label>
            <Input
              placeholder="Take with meals, avoid grapefruit"
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              className="rounded text-teal-600 focus:ring-teal-500"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700">
              Active medication currently in use
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              {editingMedicine ? 'Save Changes' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicinesPage;
