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
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Package,
  RefreshCw,
  Minus,
  Info,
  Bell,
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../hooks/useAuth';
import { medicineService } from '../lib/services/medicineService';
import type { Medicine, MedicineCreate, MedicineStockUpdate } from '../types';
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

export interface MedicineStockAndDurationInfo {
  // Treatment Duration
  durationDays: number;
  treatmentDaysRemaining: number;
  treatmentDaysElapsed: number;
  treatmentPercentElapsed: number;
  finishDateStr: string;
  isTreatmentFinished: boolean;

  // Stock Details
  totalQuantity: number;
  remainingQuantity: number;
  dailyUsage: number;
  unit: string;
  stockDaysRemaining: number;
  stockPercentRemaining: number;
  depletionDateStr: string;
  refillReminderDateStr: string;
  isRefillApproaching: boolean;
  stockStatus: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

  // Cross-Analysis / Shortage Warning
  willStockRunOutBeforeTreatment: boolean;
  stockShortageDays: number;
}

export function computeMedicineStockAndDuration(
  m: Partial<Medicine>
): MedicineStockAndDurationInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Treatment Duration & Finish Date
  const start = m.start_date ? new Date(m.start_date) : new Date();
  start.setHours(0, 0, 0, 0);

  let durationDays = Number(m.duration_days) || 0;
  let end: Date;

  if (m.end_date) {
    end = new Date(m.end_date);
    end.setHours(0, 0, 0, 0);
    const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    if (!durationDays) durationDays = diff;
  } else if (durationDays > 0) {
    end = new Date(start);
    end.setDate(end.getDate() + durationDays);
  } else {
    durationDays = 30;
    end = new Date(start);
    end.setDate(end.getDate() + 30);
  }

  const treatmentDaysRemaining = Math.max(
    0,
    Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const treatmentDaysElapsed = Math.max(
    0,
    Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const treatmentPercentElapsed = Math.min(
    100,
    Math.max(0, Math.round((treatmentDaysElapsed / Math.max(1, durationDays)) * 100))
  );
  const finishDateStr = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isTreatmentFinished = today > end;

  // 2. Stock Metrics
  const unit = m.dosage_unit || 'tablets';
  const dailyUsage = m.daily_usage && Number(m.daily_usage) > 0 ? Number(m.daily_usage) : 1;
  const remainingQuantity =
    m.remaining_quantity !== null && m.remaining_quantity !== undefined
      ? Math.max(0, Number(m.remaining_quantity))
      : (m.total_quantity !== null && m.total_quantity !== undefined ? Math.max(0, Number(m.total_quantity)) : 0);
  const totalQuantity =
    m.total_quantity !== null && m.total_quantity !== undefined
      ? Math.max(remainingQuantity, Number(m.total_quantity))
      : remainingQuantity;

  const stockDaysRemaining = dailyUsage > 0 ? Math.floor(remainingQuantity / dailyUsage) : 0;
  const stockPercentRemaining =
    totalQuantity > 0 ? Math.min(100, Math.max(0, Math.round((remainingQuantity / totalQuantity) * 100))) : 0;

  const depletionDate = new Date(today);
  depletionDate.setDate(depletionDate.getDate() + stockDaysRemaining);
  const depletionDateStr = depletionDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const refillThreshold = Number(m.refill_reminder_days_before) || 3;
  const refillDate = new Date(depletionDate);
  refillDate.setDate(refillDate.getDate() - refillThreshold);
  const refillReminderDateStr = (refillDate < today ? today : refillDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // 3. Stock Status Determination
  let stockStatus: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'AVAILABLE';
  if (remainingQuantity <= 0) {
    stockStatus = 'OUT_OF_STOCK';
  } else if (stockDaysRemaining <= refillThreshold) {
    stockStatus = 'LOW_STOCK';
  } else {
    stockStatus = 'AVAILABLE';
  }

  const isRefillApproaching = remainingQuantity > 0 && stockDaysRemaining <= refillThreshold;

  // 4. Discrepancy warning: will stock run out before user-defined treatment duration completes?
  const willStockRunOutBeforeTreatment =
    !isTreatmentFinished && treatmentDaysRemaining > 0 && remainingQuantity > 0 && stockDaysRemaining < treatmentDaysRemaining;
  const stockShortageDays = willStockRunOutBeforeTreatment
    ? treatmentDaysRemaining - stockDaysRemaining
    : 0;

  return {
    durationDays,
    treatmentDaysRemaining,
    treatmentDaysElapsed,
    treatmentPercentElapsed,
    finishDateStr,
    isTreatmentFinished,
    totalQuantity,
    remainingQuantity,
    dailyUsage,
    unit,
    stockDaysRemaining,
    stockPercentRemaining,
    depletionDateStr,
    refillReminderDateStr,
    isRefillApproaching,
    stockStatus,
    willStockRunOutBeforeTreatment,
    stockShortageDays,
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

  // Quick Stock Update Modal State
  const [stockModalMedicine, setStockModalMedicine] = useState<Medicine | null>(null);
  const [stockActionType, setStockActionType] = useState<'RESTOCK' | 'DOSE' | 'SET'>('RESTOCK');
  const [stockActionAmount, setStockActionAmount] = useState<number>(30);
  const [stockActionNote, setStockActionNote] = useState<string>('');
  const [isUpdatingStock, setIsUpdatingStock] = useState<boolean>(false);

  // Filter Tabs
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW_STOCK' | 'ACTIVE_ONLY' | 'COMPLETED'>('ALL');

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

  // Add / Edit Form State
  const [formData, setFormData] = useState<MedicineCreate & { duration_days: number }>({
    family_member_id: memberId,
    medicine_name: '',
    dosage: '',
    dosage_unit: 'tablets',
    frequency: 'Once daily',
    route: 'Oral',
    start_date: new Date().toISOString().split('T')[0],
    end_date: calculateEndDateFromDays(new Date().toISOString().split('T')[0], 30),
    duration_days: 30,
    total_quantity: 30,
    remaining_quantity: 30,
    daily_usage: 1,
    refill_reminder_days_before: 3,
    status: 'ACTIVE',
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
      // Augment each medicine with locally stored duration if present as fallback
      const augmented = (data || []).map((m) => {
        try {
          const storedDays = localStorage.getItem(`wt_medicine_duration_${m.id}`);
          if (storedDays && (!m.duration_days || m.duration_days <= 0)) {
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
      dosage_unit: 'tablets',
      frequency: 'Once daily',
      route: 'Oral',
      start_date: todayStr,
      end_date: calculateEndDateFromDays(todayStr, initialDays),
      duration_days: initialDays,
      total_quantity: 30,
      remaining_quantity: 30,
      daily_usage: 1,
      refill_reminder_days_before: 3,
      status: 'ACTIVE',
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

    const totalQty = m.total_quantity ?? m.remaining_quantity ?? 30;
    const remQty = m.remaining_quantity ?? totalQty;

    setFormData({
      family_member_id: m.family_member_id,
      medicine_name: m.medicine_name,
      dosage: m.dosage || '',
      dosage_unit: m.dosage_unit || 'tablets',
      frequency: m.frequency || 'Once daily',
      route: m.route || 'Oral',
      start_date: startStr,
      end_date: m.end_date || calculateEndDateFromDays(startStr, days || 30),
      duration_days: days || 30,
      total_quantity: totalQty,
      remaining_quantity: remQty,
      daily_usage: m.daily_usage ?? 1,
      refill_reminder_days_before: m.refill_reminder_days_before ?? 3,
      status: m.status ?? (m.is_active ? 'ACTIVE' : 'DISCONTINUED'),
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
    if ((formData.duration_days || 0) <= 0) {
      toast.error('Duration in days must be a positive number');
      return;
    }
    if ((formData.total_quantity || 0) < 0 || (formData.remaining_quantity || 0) < 0) {
      toast.error('Quantities cannot be negative');
      return;
    }
    if ((formData.daily_usage || 0) <= 0) {
      toast.error('Quantity consumed per day must be greater than zero');
      return;
    }

    try {
      const payload: MedicineCreate = {
        family_member_id: formData.family_member_id,
        medicine_name: formData.medicine_name.trim(),
        dosage: formData.dosage || undefined,
        dosage_unit: formData.dosage_unit || 'tablets',
        frequency: formData.frequency || undefined,
        route: formData.route || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        duration_days: formData.duration_days,
        total_quantity: formData.total_quantity,
        remaining_quantity: formData.remaining_quantity,
        daily_usage: formData.daily_usage,
        refill_reminder_days_before: formData.refill_reminder_days_before || 3,
        status: formData.status || 'ACTIVE',
        prescribed_by: formData.prescribed_by || undefined,
        instructions: formData.instructions || undefined,
        is_active: formData.status === 'ACTIVE' && formData.is_active,
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
        toast.success(`Added ${formData.medicine_name} with stock & finish date tracking`);
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  // Open Quick Stock Modal
  const handleOpenStockModal = (m: Medicine, defaultAction: 'RESTOCK' | 'DOSE' | 'SET' = 'RESTOCK') => {
    setStockModalMedicine(m);
    setStockActionType(defaultAction);
    setStockActionAmount(defaultAction === 'DOSE' ? (m.daily_usage || 1) : 30);
    setStockActionNote('');
  };

  // Handle Quick Stock Update
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalMedicine) return;

    if (stockActionAmount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    try {
      setIsUpdatingStock(true);
      const updatePayload: MedicineStockUpdate = {
        note: stockActionNote || undefined,
      };

      if (stockActionType === 'RESTOCK') {
        updatePayload.restock_amount = Number(stockActionAmount);
      } else if (stockActionType === 'DOSE') {
        updatePayload.quantity_consumed = Number(stockActionAmount);
      } else {
        updatePayload.remaining_quantity = Math.max(0, Number(stockActionAmount));
      }

      await medicineService.updateStock(stockModalMedicine.id, updatePayload);
      toast.success(
        stockActionType === 'RESTOCK'
          ? `Added +${stockActionAmount} ${stockModalMedicine.dosage_unit || 'units'} to stock!`
          : stockActionType === 'DOSE'
          ? `Recorded ${stockActionAmount} dose(s) taken.`
          : `Stock adjusted to ${stockActionAmount} ${stockModalMedicine.dosage_unit || 'units'}.`
      );
      setStockModalMedicine(null);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Quick Inline Refill Top-up
  const handleQuickRestock = async (m: Medicine, amount: number) => {
    try {
      await medicineService.updateStock(m.id, {
        restock_amount: amount,
        note: `Quick restock +${amount}`,
      });
      toast.success(`Restocked ${m.medicine_name} (+${amount} ${m.dosage_unit || 'units'})`);
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to restock');
    }
  };

  // Quick Inline Dose Consumed
  const handleQuickTakeDose = async (m: Medicine) => {
    const dose = m.daily_usage || 1;
    try {
      await medicineService.updateStock(m.id, {
        quantity_consumed: dose,
        note: 'Dose taken',
      });
      toast.success(`Dose taken for ${m.medicine_name} (-${dose} ${m.dosage_unit || 'units'})`);
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to record dose');
    }
  };

  // Toggle Discontinue / Complete Status
  const handleToggleStatus = async (m: Medicine, newStatus: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED') => {
    try {
      await medicineService.updateMedicine(m.id, {
        status: newStatus,
        is_active: newStatus === 'ACTIVE',
      });
      toast.success(`Medication marked as ${newStatus.toLowerCase()}`);
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to update status');
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

  // Aggregate Stats
  const dashboardStats = useMemo(() => {
    let activeCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let refillSoonCount = 0;
    let shortageWarningCount = 0;

    medicines.forEach((m) => {
      const info = computeMedicineStockAndDuration(m);
      if (m.is_active && m.status !== 'DISCONTINUED' && m.status !== 'COMPLETED') {
        activeCount++;
        if (info.stockStatus === 'OUT_OF_STOCK') {
          outOfStockCount++;
        } else if (info.stockStatus === 'LOW_STOCK') {
          lowStockCount++;
        }
        if (info.isRefillApproaching) {
          refillSoonCount++;
        }
        if (info.willStockRunOutBeforeTreatment) {
          shortageWarningCount++;
        }
      }
    });

    return { activeCount, lowStockCount, outOfStockCount, refillSoonCount, shortageWarningCount };
  }, [medicines]);

  // Filter and sort medicines
  const filteredMedicines = useMemo(() => {
    let list = [...medicines];

    if (filterMode === 'ACTIVE_ONLY') {
      list = list.filter((m) => m.is_active && m.status !== 'DISCONTINUED' && m.status !== 'COMPLETED');
    } else if (filterMode === 'LOW_STOCK') {
      list = list.filter((m) => {
        const info = computeMedicineStockAndDuration(m);
        return info.stockStatus === 'LOW_STOCK' || info.stockStatus === 'OUT_OF_STOCK' || info.willStockRunOutBeforeTreatment;
      });
    } else if (filterMode === 'COMPLETED') {
      list = list.filter((m) => !m.is_active || m.status === 'COMPLETED' || m.status === 'DISCONTINUED');
    }

    // Sort by stock days remaining (lowest stock first)
    list.sort((a, b) => {
      const infoA = computeMedicineStockAndDuration(a);
      const infoB = computeMedicineStockAndDuration(b);
      return infoA.stockDaysRemaining - infoB.stockDaysRemaining;
    });

    return list;
  }, [medicines, filterMode]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header & Context Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Pill className="w-4 h-4" />
            <span>Prescription Inventory & Course Tracker</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Medicine Stock & Duration Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control treatment duration in days, track remaining pill counts, and receive smart finish & refill alerts.
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

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-teal-500/10 via-white to-white border-teal-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-700">Active Regimens</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{dashboardStats.activeCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Currently being taken</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
            <Pill className="w-5 h-5" />
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br transition-all border shadow-2xs flex items-center justify-between ${
          dashboardStats.lowStockCount > 0
            ? 'from-amber-500/15 via-white to-white border-amber-300'
            : 'from-slate-50 via-white to-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-800">Low Stock Supply</span>
              {dashboardStats.lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{dashboardStats.lowStockCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Running out in ≤ 3 days</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br transition-all border shadow-2xs flex items-center justify-between ${
          dashboardStats.outOfStockCount > 0
            ? 'from-rose-500/15 via-white to-white border-rose-300'
            : 'from-slate-50 via-white to-white border-slate-200'
        }`}>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-rose-700">Out of Stock</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{dashboardStats.outOfStockCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Immediate refill required</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br transition-all border shadow-2xs flex items-center justify-between ${
          dashboardStats.shortageWarningCount > 0
            ? 'from-orange-500/15 via-white to-white border-orange-300'
            : 'from-slate-50 via-white to-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-bold tracking-wider text-orange-800">Duration Shortages</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{dashboardStats.shortageWarningCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Stock finishes before course</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Refill Reminder Alert Banner if any stock is low */}
      {(dashboardStats.lowStockCount > 0 || dashboardStats.outOfStockCount > 0 || dashboardStats.shortageWarningCount > 0) && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Medicine Stock Reminders Pending
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You have {dashboardStats.lowStockCount + dashboardStats.outOfStockCount} medicine(s) needing replenishment soon. Use the <strong>Update Stock</strong> button on each card to record purchases or intake.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterMode('LOW_STOCK')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors self-end sm:self-center"
          >
            View Low Stock ({dashboardStats.lowStockCount + dashboardStats.outOfStockCount})
          </button>
        </div>
      )}

      {/* Filter Tabs & Sorting Header */}
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
            onClick={() => setFilterMode('LOW_STOCK')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              filterMode === 'LOW_STOCK'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Low Stock / Refill Needed ({dashboardStats.lowStockCount + dashboardStats.outOfStockCount + dashboardStats.shortageWarningCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('ACTIVE_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === 'ACTIVE_ONLY'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Regimens ({dashboardStats.activeCount})
          </button>
          <button
            onClick={() => setFilterMode('COMPLETED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterMode === 'COMPLETED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed / Discontinued
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Sorted by: <strong>Remaining stock days (least first)</strong>
        </span>
      </div>

      {/* Main Grid Content */}
      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredMedicines.length === 0 ? (
        <Card className="p-8 bg-white">
          <EmptyState
            icon={Pill}
            title={filterMode === 'LOW_STOCK' ? 'No low stock alerts!' : 'No medications recorded yet'}
            description={
              filterMode === 'LOW_STOCK'
                ? 'All your active medications currently have sufficient stock.'
                : 'Add medications to monitor daily dosages, course durations, and remaining supplies.'
            }
            actionLabel="Add Medication"
            onAction={handleOpenCreate}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedicines.map((m) => {
            const metrics = computeMedicineStockAndDuration(m);
            const memberObj = familyMembers.find((mem) => mem.id === m.family_member_id);
            const memberName = memberObj ? getMemberDisplayName(memberObj, user?.id, profile?.full_name) : 'Family Member';

            return (
              <Card
                key={m.id}
                className="p-5 bg-white border border-slate-200 hover:border-teal-400 transition-all shadow-xs flex flex-col justify-between group rounded-2xl"
              >
                <div className="space-y-4">
                  {/* Card Header: Medicine Name, Member, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-105 transition-transform">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {m.medicine_name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="font-medium text-slate-700">{memberName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {metrics.stockStatus === 'OUT_OF_STOCK' ? (
                        <Badge variant="red">Out of Stock</Badge>
                      ) : metrics.stockStatus === 'LOW_STOCK' ? (
                        <Badge variant="amber">Low Stock</Badge>
                      ) : (
                        <Badge variant="emerald">Available</Badge>
                      )}
                      {m.status && m.status !== 'ACTIVE' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {m.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity Gauge Card */}
                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold uppercase text-[11px] flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-teal-600" />
                        Remaining Stock
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {metrics.remainingQuantity} / {metrics.totalQuantity}{' '}
                        <span className="text-xs font-normal text-slate-500">{metrics.unit}</span>
                      </span>
                    </div>

                    {/* Stock Remaining Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          metrics.stockStatus === 'OUT_OF_STOCK'
                            ? 'bg-rose-500'
                            : metrics.stockStatus === 'LOW_STOCK'
                            ? 'bg-amber-500'
                            : 'bg-teal-500'
                        }`}
                        style={{ width: `${metrics.stockPercentRemaining}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Daily: <strong>{metrics.dailyUsage} {metrics.unit}/day</strong></span>
                      <span className={`font-semibold ${
                        metrics.stockDaysRemaining <= 3 ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                        Estimated stock: <strong>{metrics.stockDaysRemaining} days</strong>
                      </span>
                    </div>
                  </div>

                  {/* Dual Comparison Warning: Stock Runs Out Before Treatment Ends */}
                  {metrics.willStockRunOutBeforeTreatment && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Stock Shortage Alert:</strong>
                        <span>
                          Current stock will run out in <strong>{metrics.stockDaysRemaining} days</strong>, but your treatment period lasts for <strong>{metrics.treatmentDaysRemaining} days</strong>. Refill needed {metrics.stockShortageDays} days earlier!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Treatment Duration & Finish Date Card */}
                  <div className="bg-teal-50/40 rounded-xl p-3 border border-teal-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-teal-900 font-bold uppercase text-[11px] flex items-center gap-1">
                        <Hourglass className="w-3.5 h-3.5 text-teal-700" />
                        Treatment Duration (User Set)
                      </span>
                      <span className="font-semibold text-teal-800">
                        {metrics.durationDays} Days Course
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-100/70">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold">Treatment Days Left</span>
                        <span className={`font-bold ${
                          metrics.treatmentDaysRemaining <= 3 ? 'text-amber-700' : 'text-slate-800'
                        }`}>
                          {metrics.isTreatmentFinished ? 'Completed' : `${metrics.treatmentDaysRemaining} days remaining`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-semibold">Expected Finish Date</span>
                        <span className="font-bold text-teal-800">{metrics.finishDateStr}</span>
                      </div>
                    </div>

                    {/* Refill Reminder Date */}
                    <div className="pt-1.5 border-t border-teal-100/70 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-600" />
                        Refill Reminder Date:
                      </span>
                      <span className={`font-semibold ${metrics.isRefillApproaching ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
                        {metrics.refillReminderDateStr}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons: Dose Taken & Restock */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickTakeDose(m)}
                        disabled={metrics.remainingQuantity <= 0}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Log taken dose and deduct from stock"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>Take Dose (-{metrics.dailyUsage})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStockModal(m, 'RESTOCK')}
                        className="flex-1 py-1.5 px-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        title="Restock or adjust quantity"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Update Stock</span>
                      </button>
                    </div>

                    {/* Quick +10 & +30 Top-up buttons */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Quick Refill:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(m, 10)}
                          className="px-2 py-0.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded text-[11px] font-semibold text-teal-800 shadow-2xs transition-colors"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(m, 30)}
                          className="px-2 py-0.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded text-[11px] font-semibold text-teal-800 shadow-2xs transition-colors"
                        >
                          +30
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Metadata, Edit & Status Actions */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs">
                    {m.status === 'ACTIVE' && m.is_active ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(m, 'COMPLETED')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-teal-700 underline"
                      >
                        Mark Completed
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(m, 'ACTIVE')}
                        className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 underline"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Edit medicine details and duration"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove medicine record"
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

      {/* Quick Stock Update Modal */}
      {stockModalMedicine && (
        <Modal
          isOpen={Boolean(stockModalMedicine)}
          onClose={() => setStockModalMedicine(null)}
          title={`Update Stock: ${stockModalMedicine.medicine_name}`}
        >
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Current On Hand</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {stockModalMedicine.remaining_quantity ?? stockModalMedicine.total_quantity ?? 0}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    {stockModalMedicine.dosage_unit || 'units'}
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span>Daily Usage: <strong>{stockModalMedicine.daily_usage || 1} / day</strong></span>
              </div>
            </div>

            {/* Action Type Toggle */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setStockActionType('RESTOCK');
                  setStockActionAmount(30);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  stockActionType === 'RESTOCK'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Restock
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockActionType('DOSE');
                  setStockActionAmount(stockModalMedicine.daily_usage || 1);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  stockActionType === 'DOSE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                - Log Taken Dose
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockActionType('SET');
                  setStockActionAmount(stockModalMedicine.remaining_quantity || 0);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  stockActionType === 'SET'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                = Set Exact Count
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {stockActionType === 'RESTOCK'
                  ? 'Quantity to Add (Restock) *'
                  : stockActionType === 'DOSE'
                  ? 'Quantity Consumed (Dose) *'
                  : 'New Exact Remaining Quantity *'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 font-semibold"
                value={stockActionAmount}
                onChange={(e) => setStockActionAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            {/* Preset shortcuts for restock */}
            {stockActionType === 'RESTOCK' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Quick Add:</span>
                {[10, 20, 30, 60, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStockActionAmount(amt)}
                    className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-md hover:border-teal-400 font-semibold text-slate-700"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            )}

            {/* Note / Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Optional Note / Reason
              </label>
              <Input
                placeholder="e.g. Bought from pharmacy, Doctor adjusted dosage"
                value={stockActionNote}
                onChange={(e) => setStockActionNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setStockModalMedicine(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingStock} className="bg-teal-600 hover:bg-teal-700 text-white">
                {isUpdatingStock ? 'Saving...' : 'Save Stock Update'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Medication Modal with Full Stock & Duration Controls */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Edit Medication & Stock' : 'Add Medication & Supply Tracking'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
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

          {/* USER-CONTROLLED DURATION & FINISH DATE SECTION */}
          <div className="bg-gradient-to-br from-teal-50 via-teal-50/40 to-white border border-teal-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs uppercase tracking-wider">
                <Hourglass className="w-4 h-4 text-teal-600" />
                <span>Treatment Duration & Finish Date (User-Defined)</span>
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
                  max="730"
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

            {/* Live Treatment Notice */}
            <div className="bg-white/90 rounded-lg p-2.5 border border-teal-100 flex items-center gap-2 text-xs text-teal-800">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Treatment course is set for <strong>{formData.duration_days} days</strong> and will conclude on{' '}
                <strong>{formData.end_date || 'calculated finish date'}</strong>.
              </span>
            </div>
          </div>

          {/* MEDICINE STOCK & USAGE SECTION */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white border border-indigo-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Medicine Stock & Consumption Details</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Total Quantity Available *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  value={formData.total_quantity || 0}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      total_quantity: total,
                      // If adding new, sync remaining
                      remaining_quantity: !editingMedicine ? total : prev.remaining_quantity,
                    }));
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Current Remaining Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  value={formData.remaining_quantity || 0}
                  onChange={(e) => setFormData({ ...formData, remaining_quantity: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Consumed Per Day *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  value={formData.daily_usage || 1}
                  onChange={(e) => setFormData({ ...formData, daily_usage: parseFloat(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Unit Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  value={formData.dosage_unit || 'tablets'}
                  onChange={(e) => setFormData({ ...formData, dosage_unit: e.target.value })}
                >
                  {['tablets', 'capsules', 'ml', 'drops', 'pills', 'puffs', 'sachets', 'units', 'mg'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Refill Reminder (Days Before Depletion) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  value={formData.refill_reminder_days_before || 3}
                  onChange={(e) => setFormData({ ...formData, refill_reminder_days_before: parseInt(e.target.value, 10) || 3 })}
                  required
                />
              </div>
            </div>

            {/* Calculated Stock Duration Preview & Discrepancy Alert */}
            {(() => {
              const rem = formData.remaining_quantity || 0;
              const daily = formData.daily_usage || 1;
              const stockDays = daily > 0 ? Math.floor(rem / daily) : 0;
              const isShortage = stockDays < (formData.duration_days || 30);

              return (
                <div className={`rounded-lg p-2.5 border text-xs flex items-start gap-2 ${
                  isShortage ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-indigo-100 text-slate-700'
                }`}>
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span>
                      Estimated stock duration: <strong>{stockDays} days of supply</strong> remaining (at {daily} {formData.dosage_unit || 'tablets'}/day).
                    </span>
                    {isShortage && (
                      <span className="block font-semibold text-amber-800 mt-0.5">
                        ⚠️ Note: Current supply will end {formData.duration_days - stockDays} days before the {formData.duration_days}-day treatment course is complete.
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Dosage & Route Fields */}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={formData.status || 'ACTIVE'}
                onChange={(e) => setFormData({
                  ...formData,
                  status: e.target.value as any,
                  is_active: e.target.value === 'ACTIVE',
                })}
              >
                <option value="ACTIVE">Active Treatment</option>
                <option value="COMPLETED">Course Completed</option>
                <option value="DISCONTINUED">Discontinued</option>
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

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
              {editingMedicine ? 'Save Medicine & Stock' : 'Add Medication & Track Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicinesPage;
