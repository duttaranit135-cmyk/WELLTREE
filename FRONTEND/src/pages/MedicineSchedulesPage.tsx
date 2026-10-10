import React, { useState, useEffect } from 'react';
import { Clock, Plus, Pill, User, ShieldCheck, Check } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { medicineService } from '../lib/services/medicineService';
import type { Medicine, MedicineSchedule, MedicineScheduleCreate, MedicineLog, MedicineLogStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const MedicineSchedulesPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [schedules, setSchedules] = useState<MedicineSchedule[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [scheduleForm, setScheduleForm] = useState<MedicineScheduleCreate>({
    medicine_id: '',
    scheduled_time: '08:00',
    frequency_type: 'DAILY',
    reminder_enabled: true,
  });

  const memberId = activeMember?.id || '';

  const fetchData = async () => {
    if (!memberId) {
      setSchedules([]);
      setMedicines([]);
      setLogs([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [schedData, medData, logData] = await Promise.all([
        medicineService.getSchedules(undefined, memberId),
        medicineService.getMedicines(memberId, true),
        medicineService.getLogs(memberId),
      ]);
      setSchedules(schedData || []);
      setMedicines(medData || []);
      setLogs(logData || []);
    } catch (err: any) {
      console.warn('Failed to load medicine schedules:', err);
      toast.error('Failed to load schedule data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const handleLogDose = async (medicineId: string, scheduleId: string | undefined, status: MedicineLogStatus) => {
    try {
      await medicineService.logDose({
        medicine_id: medicineId,
        family_member_id: memberId,
        schedule_id: scheduleId,
        scheduled_at: new Date().toISOString(),
        taken_at: status === 'TAKEN' ? new Date().toISOString() : undefined,
        status,
        notes: `Logged as ${status}`,
      });
      toast.success(`Dose marked as ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log dose');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.medicine_id) {
      toast.error('Please pick a medicine');
      return;
    }
    try {
      await medicineService.createSchedule(scheduleForm);
      toast.success('Schedule created');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create schedule');
    }
  };

  const totalLogs = logs.length;
  const takenCount = logs.filter((l) => l.status === 'TAKEN').length;
  const adherenceRate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 100;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>Adherence & Intake Timeline</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Medicine Schedules
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track daily dosages, log taken medicines, and review clinical adherence.
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

          <Link to="/medicines">
            <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
              <Pill className="w-4 h-4 mr-2" />
              Catalog
            </Button>
          </Link>

          <Button
            onClick={() => {
              if (medicines.length === 0) {
                toast.error('Add a medication to the catalog first');
                return;
              }
              setScheduleForm({
                medicine_id: medicines[0]?.id || '',
                scheduled_time: '08:00',
                frequency_type: 'DAILY',
                reminder_enabled: true,
              });
              setIsModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Weekly Medication Adherence</span>
            </div>
            <div className="text-4xl font-black text-white flex items-baseline gap-2">
              <span>{adherenceRate}%</span>
              <span className="text-sm font-normal text-slate-300">
                ({takenCount} of {totalLogs} logged doses taken)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Consistently taking medications on schedule maintains therapeutic efficacy and lowers clinical risk.
            </p>
          </div>

          <div className="w-full md:w-64 bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${adherenceRate}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Today's Schedule & Dosage Queue</h2>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="p-6 bg-white">
            <EmptyState
              icon={Clock}
              title="No schedules established"
              description="Establish daily intake timings for ongoing medications."
              actionLabel="Set Intake Schedule"
              onAction={() => setIsModalOpen(true)}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {schedules.map((sched) => {
              const currentMed = medicines.find((m) => m.id === sched.medicine_id);
              return (
                <Card
                  key={sched.id}
                  className="p-5 bg-white border border-slate-200 hover:border-teal-200 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                      {sched.scheduled_time}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {currentMed?.medicine_name || 'Prescription Medication'}
                        </h3>
                        <Badge variant="gray" className="text-xs font-semibold">
                          {sched.frequency_type || 'DAILY'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentMed?.dosage ? `${currentMed.dosage} ${currentMed.dosage_unit || ''}` : 'Standard dose'} • {currentMed?.instructions || 'Take as prescribed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleLogDose(sched.medicine_id, sched.id, 'TAKEN')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Take</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLogDose(sched.medicine_id, sched.id, 'SKIPPED')}
                      className="text-amber-700 border-amber-200 hover:bg-amber-50"
                    >
                      <span>Skip</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLogDose(sched.medicine_id, sched.id, 'MISSED')}
                      className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <span>Missed</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Medicine Schedule">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Medicine *
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              value={scheduleForm.medicine_id}
              onChange={(e) => setScheduleForm({ ...scheduleForm, medicine_id: e.target.value })}
              required
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.medicine_name} {m.dosage ? `(${m.dosage} ${m.dosage_unit || ''})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Dosage Time (HH:MM) *
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={scheduleForm.scheduled_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Frequency
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={scheduleForm.frequency_type || 'DAILY'}
                onChange={(e) => setScheduleForm({ ...scheduleForm, frequency_type: e.target.value })}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKDAYS">Weekdays</option>
                <option value="WEEKENDS">Weekends</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="reminderCheck"
              className="rounded text-teal-600 focus:ring-teal-500"
              checked={scheduleForm.reminder_enabled}
              onChange={(e) => setScheduleForm({ ...scheduleForm, reminder_enabled: e.target.checked })}
            />
            <label htmlFor="reminderCheck" className="text-sm font-medium text-slate-700">
              Enable automated notifications and alerts
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Save Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicineSchedulesPage;
