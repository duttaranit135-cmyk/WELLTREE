import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShieldCheck,
  Shield,
  Plus,
  CheckCircle,
  Clock,
  Ban,
  XCircle,
  Copy,
  Check,
  ArrowRightLeft,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  Eye,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import {
  useConsents,
  useCreateConsent,
  useUpdateConsent,
} from '../hooks/useConsents';
import { useFamilies } from '../hooks/useFamilies';
import { formatDate } from '../lib/utils';
import type { ConsentStatus, ConsentPermission } from '../types';

// RFC 4122 UUID Regex
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createConsentSchema = z.object({
  family_id: z.string().min(1, 'Please select a family'),
  grantee_id: z
    .string()
    .min(1, 'Grantee User ID is required')
    .regex(uuidRegex, 'Must be a valid UUID format (e.g. 123e4567-e89b-12d3-a456-426614174000)'),
  permission_level: z.enum(['READ_ONLY', 'FULL_ACCESS']),
  notes: z.string().max(255, 'Notes cannot exceed 255 characters').optional(),
});

type CreateConsentFormData = z.infer<typeof createConsentSchema>;

interface ConfirmActionState {
  consentId: string;
  status: 'DENIED' | 'REVOKED';
  title: string;
  message: string;
}

export const ConsentsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: consents, isLoading, isError, error, refetch } = useConsents();
  const { data: families } = useFamilies();

  const createConsentMutation = useCreateConsent();
  const updateConsentMutation = useUpdateConsent();

  // Active Tab: 'granted_by_me' | 'granted_to_me'
  const [activeTab, setActiveTab] = useState<'granted_by_me' | 'granted_to_me'>('granted_by_me');

  // Modal and Confirmation Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateConsentFormData>({
    resolver: zodResolver(createConsentSchema),
    defaultValues: {
      family_id: '',
      grantee_id: '',
      permission_level: 'READ_ONLY',
      notes: '',
    },
  });

  const selectedPermission = watch('permission_level');

  // Family dropdown options
  const familyOptions = useMemo(() => {
    if (!families) return [];
    return families.map((f) => ({
      value: f.id,
      label: f.name,
    }));
  }, [families]);

  // Family name lookup map
  const familyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (families) {
      families.forEach((f) => map.set(f.id, f.name));
    }
    return map;
  }, [families]);

  // Summary statistics calculation
  const stats = useMemo(() => {
    const list = consents || [];
    return {
      active: list.filter((c) => c.status === 'ACTIVE').length,
      pending: list.filter((c) => c.status === 'PENDING').length,
      revoked: list.filter((c) => c.status === 'REVOKED').length,
      denied: list.filter((c) => c.status === 'DENIED').length,
    };
  }, [consents]);

  // Filtered consents for each tab
  const filteredConsents = useMemo(() => {
    if (!consents || !user) return [];
    if (activeTab === 'granted_by_me') {
      return consents.filter((c) => c.granter_id === user.id);
    }
    return consents.filter((c) => c.grantee_id === user.id);
  }, [consents, user, activeTab]);

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('User ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (data: CreateConsentFormData) => {
    try {
      await createConsentMutation.mutateAsync({
        family_id: data.family_id,
        grantee_id: data.grantee_id.trim(),
        permission_level: data.permission_level as ConsentPermission,
        notes: data.notes?.trim() || undefined,
      });
      reset();
      setIsCreateModalOpen(false);
    } catch {
      // Handled via toast in hook
    }
  };

  const handleAcceptPending = async (consentId: string) => {
    try {
      await updateConsentMutation.mutateAsync({
        consentId,
        data: { status: 'ACTIVE' },
      });
    } catch {
      // Handled via toast in hook
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      await updateConsentMutation.mutateAsync({
        consentId: confirmAction.consentId,
        data: { status: confirmAction.status },
      });
      setConfirmAction(null);
    } catch {
      // Handled via toast in hook
    }
  };

  const getStatusBadgeVariant = (status: ConsentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'emerald' as const;
      case 'PENDING':
        return 'amber' as const;
      case 'REVOKED':
        return 'red' as const;
      case 'DENIED':
      default:
        return 'gray' as const;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Consent Management"
        description="Control who can access your health records and manage guardian permissions with complete transparency."
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              reset({
                family_id: familyOptions[0]?.value ? String(familyOptions[0].value) : '',
                grantee_id: '',
                permission_level: 'READ_ONLY',
                notes: '',
              });
              setIsCreateModalOpen(true);
            }}
          >
            Grant Access
          </Button>
        }
      />

      {/* 5. SUMMARY STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="flex items-center gap-4 p-5 border-emerald-100 bg-white">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Active
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.active}
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 border-amber-100 bg-white">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-warning flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Requests
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.pending}
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 border-rose-100 bg-white">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-danger flex items-center justify-center shrink-0">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Revoked
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.revoked}
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 border-slate-200 bg-white">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Denied
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.denied}
            </h3>
          </div>
        </Card>
      </div>

      {/* 2. TABS WITH ACTIVE INDICATOR */}
      <div className="bg-slate-100/90 p-1.5 rounded-xl inline-flex flex-wrap gap-1.5 border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('granted_by_me')}
          className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'granted_by_me'
              ? 'bg-white text-primary shadow-xs ring-1 ring-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Shield
            className={`w-4 h-4 ${
              activeTab === 'granted_by_me' ? 'text-primary' : 'text-slate-400'
            }`}
          />
          <span>Consents I Granted</span>
          <span
            className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
              activeTab === 'granted_by_me'
                ? 'bg-teal-50 text-primary border border-teal-200'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {consents ? consents.filter((c) => c.granter_id === user?.id).length : 0}
          </span>
          {activeTab === 'granted_by_me' && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('granted_to_me')}
          className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'granted_to_me'
              ? 'bg-white text-primary shadow-xs ring-1 ring-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <ArrowRightLeft
            className={`w-4 h-4 ${
              activeTab === 'granted_to_me' ? 'text-primary' : 'text-slate-400'
            }`}
          />
          <span>Access Granted to Me</span>
          <span
            className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
              activeTab === 'granted_to_me'
                ? 'bg-teal-50 text-primary border border-teal-200'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {consents ? consents.filter((c) => c.grantee_id === user?.id).length : 0}
          </span>
          {activeTab === 'granted_to_me' && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </div>

      {/* 3. CONSENT LIST */}
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-32 h-5 bg-slate-200 rounded" />
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </div>
              <div className="w-48 h-4 bg-slate-100 rounded" />
              <div className="w-full h-12 bg-slate-50 rounded" />
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-20 h-8 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card className="flex flex-col items-center justify-center text-center p-12 border-rose-200 bg-rose-50/20 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-danger flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Failed to Load Consents
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {error?.message || 'Unable to load mutual health consent permissions.'}
          </p>
          <Button variant="primary" icon={RefreshCw} onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredConsents.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={
            activeTab === 'granted_by_me'
              ? "You haven't granted access to anyone yet"
              : 'No one has granted you access yet'
          }
          description={
            activeTab === 'granted_by_me'
              ? 'Authorize trusted family members or guardians to access your medical logs, prescriptions, and alerts.'
              : 'When family members designate you as a guardian and grant consent, their health authorizations will appear here.'
          }
          actionLabel={activeTab === 'granted_by_me' ? 'Grant Access' : undefined}
          onAction={activeTab === 'granted_by_me' ? () => setIsCreateModalOpen(true) : undefined}
        />
      )}

      {/* Consents Cards Grid */}
      {!isLoading && !isError && filteredConsents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredConsents.map((consent) => {
            const isGrantedByMe = activeTab === 'granted_by_me';
            const targetId = isGrantedByMe ? consent.grantee_id : consent.granter_id;
            const targetLabel = isGrantedByMe ? 'To Guardian' : 'From Member';
            const familyName = familyNameMap.get(consent.family_id);

            return (
              <Card
                key={consent.id}
                className="flex flex-col justify-between p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Top Row: Target User & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {targetLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {targetId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(targetId)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy UUID"
                        >
                          {copiedId === targetId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Badge variant={getStatusBadgeVariant(consent.status)} size="sm">
                      {consent.status}
                    </Badge>
                  </div>

                  {/* Middle Row: Family & Permission Badge */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs text-slate-500 font-medium">Family:</span>
                    <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                      {familyName || `ID: ${consent.family_id.slice(0, 8)}...`}
                    </span>

                    <Badge
                      variant={consent.permission_level === 'FULL_ACCESS' ? 'indigo' : 'teal'}
                      size="sm"
                    >
                      {consent.permission_level === 'FULL_ACCESS' ? (
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> Full Access
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View Only
                        </span>
                      )}
                    </Badge>
                  </div>

                  {/* Notes snippet */}
                  {consent.notes && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-600 italic flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>"{consent.notes}"</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Dates & Contextual Actions */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5 text-[11px] text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created: {formatDate(consent.created_at)}</span>
                    </p>
                    {consent.updated_at && consent.updated_at !== consent.created_at && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Updated: {formatDate(consent.updated_at)}</span>
                      </p>
                    )}
                  </div>

                  {/* Action buttons (Tab 1 only) */}
                  {isGrantedByMe && (
                    <div className="flex items-center gap-2 shrink-0">
                      {consent.status === 'PENDING' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAcceptPending(consent.id)}
                            loading={updateConsentMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                consentId: consent.id,
                                status: 'DENIED',
                                title: 'Deny Consent Request',
                                message:
                                  'Are you sure you want to deny this health record access request?',
                              })
                            }
                          >
                            Deny
                          </Button>
                        </>
                      )}

                      {consent.status === 'ACTIVE' && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Ban}
                          onClick={() =>
                            setConfirmAction({
                              consentId: consent.id,
                              status: 'REVOKED',
                              title: 'Revoke Health Access',
                              message:
                                'Are you sure you want to revoke this consent? The guardian will immediately lose access to your medical records.',
                            })
                          }
                        >
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. CREATE CONSENT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          reset();
          setIsCreateModalOpen(false);
        }}
        title="Grant Health Record Access"
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-5" noValidate>
          {/* Family selection */}
          <Select
            label="Family Hub *"
            options={familyOptions}
            placeholder="Select a family"
            error={errors.family_id?.message}
            {...register('family_id')}
          />

          {/* Grantee User ID */}
          <Input
            label="Grantee User ID (UUID) *"
            placeholder="e.g. a3bb189e-8bf9-3888-9912-ace4e6543002"
            helperText="Enter the User ID of the person you want to grant access to"
            error={errors.grantee_id?.message}
            {...register('grantee_id')}
          />

          {/* Permission Level Selector */}
          <div className="w-full flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold tracking-wide text-slate-700">
              Permission Level *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  selectedPermission === 'READ_ONLY'
                    ? 'border-primary bg-teal-50/50 ring-1 ring-primary'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                  <input
                    type="radio"
                    value="READ_ONLY"
                    className="text-primary focus:ring-primary"
                    {...register('permission_level')}
                  />
                  <span>View Only</span>
                </div>
                <p className="text-xs text-slate-500 pl-5">
                  Can only view health records and vitals.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  selectedPermission === 'FULL_ACCESS'
                    ? 'border-secondary bg-indigo-50/50 ring-1 ring-secondary'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                  <input
                    type="radio"
                    value="FULL_ACCESS"
                    className="text-secondary focus:ring-secondary"
                    {...register('permission_level')}
                  />
                  <span>Full Access</span>
                </div>
                <p className="text-xs text-slate-500 pl-5">
                  Can view, manage, and edit health records/appointments.
                </p>
              </label>
            </div>
            {errors.permission_level && (
              <p className="text-xs text-danger font-medium">
                {errors.permission_level.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="w-full flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold tracking-wide text-slate-700">
              Notes (Optional, max 255 chars)
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Parental monitoring for medical alerts"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-slate-400"
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-xs text-danger font-medium">{errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                reset();
                setIsCreateModalOpen(false);
              }}
              disabled={createConsentMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={ShieldCheck}
              loading={createConsentMutation.isPending}
            >
              Grant Access
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DIALOG (FOR DENY / REVOKE) */}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.title || 'Confirm Action'}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.status === 'DENIED' ? 'Deny Request' : 'Revoke Access'}
        variant="danger"
        isLoading={updateConsentMutation.isPending}
      />
    </div>
  );
};

export default ConsentsPage;
