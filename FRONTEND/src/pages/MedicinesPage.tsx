import React, { useState, useEffect, useMemo } from 'react';
import {
  Pill,
  Plus,
  Calendar,
  Trash2,
  Edit3,
  User,
  Users,
  Clock,
  Hourglass,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../hooks/useAuth';
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
import { getMemberDisplayName, getAllFamilyMembers } from '../lib/utils';

interface MedicineDurationInfo {
  durationDays: number;
  daysRemaining: number;
  daysElapsed: number;
  percentElapsed: number;
  finishDateStr: string;
  status: 'HEALTHY' | 'LOW' | 'CRITICAL' | 'EXPIRED' | 'UNSPECIFIED';
  statusLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  progressColor: string;
}

export function computeMedicineDuration(
  startDateStr?: string | null,
  endDateStr?: string | null,
  customDurationDays?: number | null
): MedicineDurationInfo {
  if (!endDateStr && (!customDurationDays || customDurationDays <= 0)) {
    return {
      durationDays: 0,
      daysRemaining: 0,
      daysElapsed: 0,
      percentElapsed: 0,
      finishDateStr: 'Not set',
      status: 'UNSPECIFIED',
      statusLabel: 'Duration not specified',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      badgeBorder: 'border-slate-200',
      progressColor: 'bg-slate-300',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startDateStr ? new Date(startDateStr) : new Date();
  start.setHours(0, 0, 0, 0);

  let end: Date;
  let totalDays = 0;

  if (endDateStr) {
    end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    if (customDurationDays && customDurationDays > 0) {
      totalDays = customDurationDays;
    }
  } else {
    totalDays = customDurationDays || 30;
    end = new Date(start);
    end.setDate(end.getDate() + totalDays);
  }

  const daysRemaining = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  const finishDateStr = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return {
      durationDays: totalDays,
      daysRemaining,
      daysElapsed,
      percentElapsed: 100,
      finishDateStr,
      status: 'EXPIRED',
      statusLabel: overdue === 1 ? 'Finished yesterday' : `Finished ${overdue} days ago`,
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700 font-bold',
      badgeBorder: 'border-rose-200',
      progressColor: 'bg-rose-500',
    };
  }

  if (daysRemaining === 0) {
    return {
      durationDays: totalDays,
      daysRemaining: 0,
      daysElapsed,
      percentElapsed: 100,
      finishDateStr,
      status: 'CRITICAL',
      statusLabel: 'Finishes Today! (Refill now)',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800 font-bold animate-pulse',
      badgeBorder: 'border-rose-300',
      progressColor: 'bg-rose-500',
    };
  }

  if (daysRemaining <= 3) {
    return {
      durationDays: totalDays,
      daysRemaining,
      daysElapsed,
      percentElapsed,
      finishDateStr,
      status: 'CRITICAL',
      statusLabel: `Finishes in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} (Refill urgently)`,
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800 font-bold',
      badgeBorder: 'border-amber-300',
      progressColor: 'bg-amber-500',
    };
  }

  if (daysRemaining <= 7) {
    return {
      durationDays: totalDays,
      daysRemaining,
      daysElapsed,
      percentElapsed,
      finishDateStr,
      status: 'LOW',
      statusLabel: `Finishes in ${daysRemaining} days (Refill soon)`,
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700 font-semibold',
      badgeBorder: 'border-amber-200',
      progressColor: 'bg-amber-400',
    };
  }

  return {
    durationDays: totalDays,
    daysRemaining,
    daysElapsed,
    percentElapsed,
    finishDateStr,
    status: 'HEALTHY',
    statusLabel: `Finishes in ${daysRemaining} days`,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700 font-semibold',
    badgeBorder: 'border-emerald-200',
    progressColor: 'bg-teal-500',
  };
}

function calculateEndDateFromDays(startDateStr: string, days: number): string {
  if (!startDateStr || days <= 0) return '';
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calculateDiffDays(startDateStr?: string | null, endDateStr?: string | null): number {
  if (!startDateStr || !endDateStr) return 30;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export const MedicinesPage: React.FC = () => {
  const { families, activeFamily, setActiveFamily, activeMember, setActiveMember } = useFamily();
  const { user, profile } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'FINISHING_SOON' | 'ACTIVE_ONLY'>('ALL');

  // Compute all available members including creator/admin
  const familyMembers = useMemo(() => {
    return getAllFamilyMembers(activeFamily, user, profile?.full_name);
  }, [activeFamily, user, profile]);

  // Auto-select first member when family changes
  useEffect(() => {
    if ((!activeMember || !familyMembers.some((m) => m.id === activeMember.id)) && familyMembers.length > 0) {
      setActiveMember(familyMembers[0]);
    }
  }, [activeMember, familyMembers, setActiveMember]);

  const memberId = activeMember?.id || familyMembers[0]?.id || '';

  const handleFamilyChange = (famId: string) => {
    const selected = families.find((f) => f.id === famId);
    if (selected) {
      setActiveFamily(selected);
    }
  };

  const [formData, setFormData] = useState<MedicineCreate & { duration_days: number }>({
    family_member_id: memberId,
    medicine_name: '',
    dosage: '',
    dosage_unit: 'mg',
    frequency: 'Once daily',
    route: 'Oral',
    start_date: new Date().toISOString().split('T')[0],
    end_date: calculateEndDateFromDays(new Date().toISOString().split('T')[0], 30),
    duration_days: 30,
    prescribed_by: '',
    instructions: 'Take with meals',
    is_active: true,
  });

  const fetchMedicines = async () => {
    if (!memberId) {
      setMedicines([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await medicineService.getMedicines(memberId);
      // Augment each medicine with locally stored duration if present
      const augmented = (data || []).map((m) => {
        try {
          const storedDays = localStorage.getItem(`wt_medicine_duration_${m.id}`);
          if (storedDays) {
            return { ...m, duration_days: parseInt(storedDays, 10) };
          }
        } catch {}
        return m;
      });
      setMedicines(augmented);
    } catch (err: any) {
      console.warn('Failed to load medicines:', err);
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [memberId]);

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    const todayStr = new Date().toISOString().split('T')[0];
    const initialDays = 30;
    setFormData({
      family_member_id: memberId,
      medicine_name: '',
      dosage: '',
      dosage_unit: 'mg',
      frequency: 'Once daily',
      route: 'Oral',
      start_date: todayStr,
      end_date: calculateEndDateFromDays(todayStr, initialDays),
      duration_days: initialDays,
      prescribed_by: '',
      instructions: 'Take with meals',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Medicine) => {
    setEditingMedicine(m);
    const startStr = m.start_date || new Date().toISOString().split('T')[0];
    let days = m.duration_days;
    if (!days) {
      try {
        const stored = localStorage.getItem(`wt_medicine_duration_${m.id}`);
        if (stored) days = parseInt(stored, 10);
      } catch {}
    }
    if (!days) {
      days = calculateDiffDays(startStr, m.end_date);
    }

    setFormData({
      family_member_id: m.family_member_id,
      medicine_name: m.medicine_name,
      dosage: m.dosage || '',
      dosage_unit: m.dosage_unit || 'mg',
      frequency: m.frequency || 'Once daily',
      route: m.route || 'Oral',
      start_date: startStr,
      end_date: m.end_date || calculateEndDateFromDays(startStr, days || 30),
      duration_days: days || 30,
      prescribed_by: m.prescribed_by || '',
      instructions: m.instructions || '',
      is_active: m.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDurationDaysChange = (days: number) => {
    const validDays = Math.max(1, days);
    const startStr = formData.start_date || new Date().toISOString().split('T')[0];
    const calculatedEnd = calculateEndDateFromDays(startStr, validDays);
    setFormData((prev) => ({
      ...prev,
      duration_days: validDays,
      end_date: calculatedEnd,
    }));
  };

  const handleStartDateChange = (newStart: string) => {
    const calculatedEnd = calculateEndDateFromDays(newStart, formData.duration_days || 30);
    setFormData((prev) => ({
      ...prev,
      start_date: newStart,
      end_date: calculatedEnd,
    }));
  };

  const handleEndDateChange = (newEnd: string) => {
    const startStr = formData.start_date || new Date().toISOString().split('T')[0];
    const computedDays = calculateDiffDays(startStr, newEnd);
    setFormData((prev) => ({
      ...prev,
      end_date: newEnd,
      duration_days: computedDays,
    }));
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
      const payload: MedicineCreate = {
        family_member_id: formData.family_member_id,
        medicine_name: formData.medicine_name.trim(),
        dosage: formData.dosage || undefined,
        dosage_unit: formData.dosage_unit || undefined,
        frequency: formData.frequency || undefined,
        route: formData.route || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        prescribed_by: formData.prescribed_by || undefined,
        instructions: formData.instructions || undefined,
        is_active: formData.is_active,
        duration_days: formData.duration_days,
      };

      if (editingMedicine) {
        await medicineService.updateMedicine(editingMedicine.id, payload);
        try {
          localStorage.setItem(`wt_medicine_duration_${editingMedicine.id}`, String(formData.duration_days));
        } catch {}
        toast.success(`Updated ${formData.medicine_name} (${formData.duration_days} days course)`);
      } else {
        const created = await medicineService.createMedicine(payload);
        if (created?.id) {
          try {
            localStorage.setItem(`wt_medicine_duration_${created.id}`, String(formData.duration_days));
          } catch {}
        }
        toast.success(`Added ${formData.medicine_name} with ${formData.duration_days}-day finish tracking`);
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleExtendSupply = async (m: Medicine, additionalDays: number) => {
    try {
      const currentEnd = m.end_date ? new Date(m.end_date) : new Date();
      const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
      baseDate.setDate(baseDate.getDate() + additionalDays);
      const newEndDate = baseDate.toISOString().split('T')[0];

      const currentDuration = m.duration_days || calculateDiffDays(m.start_date, m.end_date);
      const newDuration = currentDuration + additionalDays;

      await medicineService.updateMedicine(m.id, {
        end_date: newEndDate,
        is_active: true,
      });

      try {
        localStorage.setItem(`wt_medicine_duration_${m.id}`, String(newDuration));
      } catch {}

      toast.success(`Extended ${m.medicine_name} supply by +${additionalDays} days!`);
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to extend supply duration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this medication from your records?')) return;
    try {
      await medicineService.deleteMedicine(id);
      try {
        localStorage.removeItem(`wt_medicine_duration_${id}`);
      } catch {}
      toast.success('Medication record removed');
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete medication');
    }
  };

  // Compute duration stats across medicines
  const durationStats = useMemo(() => {
    let activeCount = 0;
    let endingSoonCount = 0;
    let expiredCount = 0;

    medicines.forEach((m) => {
      if (m.is_active) {
        activeCount++;
        const info = computeMedicineDuration(m.start_date, m.end_date, m.duration_days);
        if (info.status === 'CRITICAL' || info.status === 'LOW') {
          endingSoonCount++;
        } else if (info.status === 'EXPIRED') {
          expiredCount++;
        }
      }
    });

    return { activeCount, endingSoonCount, expiredCount };
  }, [medicines]);

  // Filter and sort medicines
  const filteredMedicines = useMemo(() => {
    let list = [...medicines];

    if (filterMode === 'ACTIVE_ONLY') {
      list = list.filter((m) => m.is_active);
    } else if (filterMode === 'FINISHING_SOON') {
      list = list.filter((m) => {
        if (!m.is_active) return false;
        const info = computeMedicineDuration(m.start_date, m.end_date, m.duration_days);
        return info.status === 'CRITICAL' || info.status === 'LOW' || info.status === 'EXPIRED';
      });
    }

    // Sort: finishing soonest first
    list.sort((a, b) => {
      const infoA = computeMedicineDuration(a.start_date, a.end_date, a.duration_days);
      const infoB = computeMedicineDuration(b.start_date, b.end_date, b.duration_days);
      return infoA.daysRemaining - infoB.daysRemaining;
    });

    return list;
  }, [medicines, filterMode]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header & Context Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Pill className="w-4 h-4" />
            <span>Prescriptions & Supply Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Medicine & Finish Duration Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor how many days each medicine has left, customize course durations, and receive finish countdown alerts.
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
                      {getMemberDisplayName(m, user?.id, profile?.full_name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Link to="/medicine-schedules">
            <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Calendar className="w-4 h-4 mr-2" />
              Intake Schedule
            </Button>
          </Link>

          <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Medicine</span>
          </Button>
        </div>
      </div>

      {/* Hero Section: Supply Duration & Finish Monitor KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-teal-500/10 via-white to-white border-teal-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-700">Active Regimens</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{durationStats.activeCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Medications with duration tracking</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-100/80 flex items-center justify-center text-teal-700">
            <Pill className="w-6 h-6" />
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br transition-all border shadow-2xs flex items-center justify-between ${
          durationStats.endingSoonCount > 0
            ? 'from-amber-500/15 via-white to-white border-amber-300'
            : 'from-slate-50 via-white to-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-800">Finishing Soon (≤ 7 Days)</span>
              {durationStats.endingSoonCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{durationStats.endingSoonCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Refill required within a week</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br transition-all border shadow-2xs flex items-center justify-between ${
          durationStats.expiredCount > 0
            ? 'from-rose-500/15 via-white to-white border-rose-300'
            : 'from-slate-50 via-white to-white border-slate-200'
        }`}>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-rose-700">Supply Exhausted</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{durationStats.expiredCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Course completed or refill overdue</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Quick Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Medicines ({medicines.length})
          </button>
          <button
            onClick={() => setFilterMode('FINISHING_SOON')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'FINISHING_SOON'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Finishing Soon ({durationStats.endingSoonCount + durationStats.expiredCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('ACTIVE_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === 'ACTIVE_ONLY'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Only ({durationStats.activeCount})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Sorted by: <strong>Finishing soonest first</strong>
        </span>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredMedicines.length === 0 ? (
        <Card className="p-8 bg-white">
          <EmptyState
            icon={Pill}
            title={filterMode === 'FINISHING_SOON' ? 'No medicines ending soon!' : 'No medications recorded yet'}
            description={
              filterMode === 'FINISHING_SOON'
                ? 'All your active medications currently have healthy supply remaining.'
                : 'Add medications to monitor dosages and how many days of supply remain.'
            }
            actionLabel="Add Medication"
            onAction={handleOpenCreate}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedicines.map((m) => {
            const dur = computeMedicineDuration(m.start_date, m.end_date, m.duration_days);

            return (
              <Card
                key={m.id}
                className="p-6 bg-white border border-slate-200/90 hover:border-teal-400 transition-all shadow-xs flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Medicine Title & Active Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
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

                  {/* Core Feature: Days Remaining & Supply Countdown Tracker */}
                  <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <Hourglass className="w-3.5 h-3.5 text-teal-600" />
                        Supply Duration
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${dur.badgeBg} ${dur.badgeText} ${dur.badgeBorder}`}>
                        {dur.statusLabel}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${dur.progressColor}`}
                          style={{ width: `${dur.percentElapsed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Course: {dur.durationDays > 0 ? `${dur.durationDays} days` : 'Open-ended'}</span>
                        <span>{dur.percentElapsed}% elapsed</span>
                      </div>
                    </div>

                    {/* Start Date & Expected Finish Date */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold leading-tight">Start Date</span>
                        <span className="font-medium text-slate-700">{m.start_date || 'Ongoing'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold leading-tight">Finish Date</span>
                        <span className={`font-semibold ${
                          dur.status === 'EXPIRED' || dur.status === 'CRITICAL'
                            ? 'text-rose-600'
                            : dur.status === 'LOW'
                            ? 'text-amber-600'
                            : 'text-teal-700'
                        }`}>
                          {dur.finishDateStr}
                        </span>
                      </div>
                    </div>

                    {/* Quick Extend Supply Buttons */}
                    <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-200/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top-up:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleExtendSupply(m, 7)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 rounded hover:border-teal-400 hover:text-teal-700 transition-colors shadow-2xs"
                          title="Add 7 days of supply"
                        >
                          +7d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtendSupply(m, 14)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 rounded hover:border-teal-400 hover:text-teal-700 transition-colors shadow-2xs"
                          title="Add 14 days of supply"
                        >
                          +14d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtendSupply(m, 30)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 rounded hover:border-teal-400 hover:text-teal-700 transition-colors shadow-2xs"
                          title="Add 30 days of supply"
                        >
                          +30d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Frequency & Prescriber Metadata */}
                  <div className="space-y-1.5 pt-1 text-xs text-slate-600">
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
                      <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Directions:</span>
                        <span className="text-slate-700">{m.instructions}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    ID: {m.id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Edit medicine and duration"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Medication Modal with User-Configured Days Duration */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Edit Medication & Duration' : 'Add Medication & Supply Tracking'}
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
                value={formData.family_member_id || memberId}
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
                    {getMemberDisplayName(m, user?.id, profile?.full_name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Medicine Name *
            </label>
            <Input
              placeholder="e.g. Metformin, Amlodipine, Lisinopril, Atorvastatin"
              value={formData.medicine_name}
              onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
              required
            />
          </div>

          {/* DURATION IN DAYS CONFIGURATION (User sets duration directly) */}
          <div className="bg-gradient-to-br from-teal-50 via-teal-50/40 to-white border border-teal-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs uppercase tracking-wider">
                <Hourglass className="w-4 h-4 text-teal-600" />
                <span>Supply Duration & Finish Date (Days Set By You)</span>
              </div>
              <span className="text-xs font-bold text-teal-700">
                {formData.duration_days} Days Course
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Duration (Number of Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                  value={formData.duration_days}
                  onChange={(e) => handleDurationDaysChange(parseInt(e.target.value, 10) || 1)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                  value={formData.start_date || ''}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Expected Finish Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-teal-50/50 focus:ring-2 focus:ring-teal-500 font-semibold text-teal-900"
                  value={formData.end_date || ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quick Duration Preset Chips */}
            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                Quick Preset Durations:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '7 Days (1 Wk)', days: 7 },
                  { label: '14 Days (2 Wks)', days: 14 },
                  { label: '30 Days (1 Mo)', days: 30 },
                  { label: '60 Days (2 Mos)', days: 60 },
                  { label: '90 Days (3 Mos)', days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleDurationDaysChange(preset.days)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all border ${
                      formData.duration_days === preset.days
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Live Summary Notice */}
            <div className="bg-white/80 rounded-lg p-2.5 border border-teal-100 flex items-center gap-2 text-xs text-teal-800">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Medicine is set to last for <strong>{formData.duration_days} days</strong> and will finish on{' '}
                <strong>{formData.end_date || 'calculated date'}</strong>.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dosage Amount</label>
              <Input
                placeholder="e.g. 500, 10, 2"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Administration Route</label>
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
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Prescribing Doctor</label>
            <Input
              placeholder="Dr. Michael Vance / Primary Care"
              value={formData.prescribed_by || ''}
              onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Usage Directions & Notes</label>
            <Input
              placeholder="Take with meals, avoid grapefruit"
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              className="rounded text-teal-600 focus:ring-teal-500"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active medication currently in use
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
              {editingMedicine ? 'Save Duration & Changes' : 'Add Medication With Tracker'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicinesPage;
