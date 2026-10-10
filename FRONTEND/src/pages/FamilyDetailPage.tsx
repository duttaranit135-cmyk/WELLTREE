import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Shield,
  Calendar,
  Users,
  Trash2,
  AlertCircle,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import {
  useFamily,
  useAddFamilyMember,
  useRemoveFamilyMember,
} from '../hooks/useFamilies';
import { formatDate } from '../lib/utils';
import type { FamilyMember, FamilyRole } from '../types';

// UUID validation regex (RFC 4122)
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const addMemberSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required')
    .regex(uuidRegex, 'Must be a valid UUID format (e.g. 123e4567-e89b-12d3-a456-426614174000)'),
  role: z.enum(['ADMIN', 'GUARDIAN', 'MEMBER']),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

const roleOptions = [
  { value: 'MEMBER', label: 'MEMBER (Standard family member)' },
  { value: 'GUARDIAN', label: 'GUARDIAN (Health record manager)' },
  { value: 'ADMIN', label: 'ADMIN (Full family control)' },
];

export const FamilyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const familyId = id || '';
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: family, isLoading, isError, error } = useFamily(familyId);
  const addMemberMutation = useAddFamilyMember(familyId);
  const removeMemberMutation = useRemoveFamilyMember(familyId);

  // Modal and Confirmation Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form for Adding Member
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: '',
      role: 'MEMBER',
    },
  });

  // Determine current user's role in this family
  const currentUserRole: FamilyRole = useMemo(() => {
    if (!family || !user) return 'MEMBER';
    const currentMember = family.members?.find((m) => m.user_id === user.id);
    if (currentMember) return currentMember.role;
    if (family.created_by === user.id) return 'ADMIN';
    return 'MEMBER';
  }, [family, user]);

  const isAdmin = currentUserRole === 'ADMIN';

  // Check if removing self and if user is the sole admin
  const isRemovingSelf = memberToRemove?.user_id === user?.id;
  const isSoleAdmin = useMemo(() => {
    if (!family?.members) return false;
    const adminCount = family.members.filter((m) => m.role === 'ADMIN').length;
    return isRemovingSelf && adminCount <= 1;
  }, [family, isRemovingSelf]);

  // Copy UUID helper
  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('User ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddMemberSubmit = async (data: AddMemberFormData) => {
    try {
      await addMemberMutation.mutateAsync({
        user_id: data.userId.trim(),
        role: data.role,
      });
      reset();
      setIsAddModalOpen(false);
    } catch {
      // Error handled with toast in mutation hook
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync(memberToRemove.user_id);
      setMemberToRemove(null);
      if (memberToRemove.user_id === user?.id) {
        // If current user left the family, navigate back to families list
        navigate('/families');
      }
    } catch {
      // Error handled with toast in mutation hook
    }
  };

  const getRoleBadgeVariant = (role: FamilyRole) => {
    switch (role) {
      case 'ADMIN':
        return 'indigo' as const;
      case 'GUARDIAN':
        return 'amber' as const;
      case 'MEMBER':
      default:
        return 'emerald' as const;
    }
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse max-w-7xl mx-auto">
        <div className="h-6 bg-slate-200 rounded w-36" />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="flex gap-4 pt-4">
            <div className="h-6 bg-slate-200 rounded w-28" />
            <div className="h-6 bg-slate-200 rounded w-28" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (isError || !family) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="text-center p-12 border-rose-200 bg-rose-50/20">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-danger flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Family not found or access denied
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {error?.message ||
              'The requested family group does not exist, or your account does not have permission to view it.'}
          </p>
          <Button
            variant="primary"
            icon={ArrowLeft}
            onClick={() => navigate('/families')}
          >
            Back to Families
          </Button>
        </Card>
      </div>
    );
  }

  const memberList = family.members || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/families"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Families Directory</span>
        </Link>
      </div>

      {/* A. FAMILY HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {family.name}
              </h1>
              <Badge variant={getRoleBadgeVariant(currentUserRole)} size="md">
                Your Role: {currentUserRole}
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
              {family.description || 'No description provided for this family health hub.'}
            </p>
          </div>
        </div>

        {/* Info Row Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-xs sm:text-sm text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Created</p>
              <p className="font-medium text-slate-800">{formatDate(family.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-secondary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">Roster</p>
              <p className="font-medium text-slate-800">
                {memberList.length} {memberList.length === 1 ? 'Member' : 'Members'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-warning">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Family ID</p>
              <p className="font-mono text-xs text-slate-700 truncate">{family.id}</p>
            </div>
          </div>
        </div>

        {/* B. ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="primary"
                icon={UserPlus}
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Member
              </Button>
            )}

            <Link to="/consents">
              <Button variant="outline" icon={ShieldCheck}>
                Request Consent
              </Button>
            </Link>
          </div>

          {!isAdmin && (
            <p className="text-xs text-slate-400 italic">
              * Only family ADMINs can add or invite new members.
            </p>
          )}
        </div>
      </div>

      {/* C. MEMBERS ROSTER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Family Members
            </h2>
            <Badge variant="teal" size="sm">
              {memberList.length}
            </Badge>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Member ID</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Joined Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {memberList.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const canRemove = isAdmin || isCurrentUser;

                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isCurrentUser ? 'bg-teal-50/20' : ''
                    }`}
                  >
                    {/* Member Column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <Avatar
                          name={isCurrentUser ? 'You' : member.user_id.slice(0, 4)}
                          size="md"
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700">
                            {member.user_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(member.user_id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy User UUID"
                          >
                            {copiedId === member.user_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isCurrentUser && (
                            <span className="text-[11px] font-bold text-primary bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role Column */}
                    <td className="py-4 px-6">
                      <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                        {member.role}
                      </Badge>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {formatDate(member.joined_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      {canRemove ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setMemberToRemove(member)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          {isCurrentUser ? 'Leave' : 'Remove'}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {memberList.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const canRemove = isAdmin || isCurrentUser;

            return (
              <Card
                key={member.id}
                className={`p-5 space-y-4 ${
                  isCurrentUser ? 'border-primary/40 bg-teal-50/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={isCurrentUser ? 'You' : member.user_id.slice(0, 4)}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-800 font-semibold truncate max-w-[140px]">
                          {member.user_id}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-primary bg-teal-50 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Joined {formatDate(member.joined_at)}
                      </p>
                    </div>
                  </div>

                  <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                    {member.role}
                  </Badge>
                </div>

                {canRemove && (
                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setMemberToRemove(member)}
                      className="text-rose-600 hover:bg-rose-50 text-xs"
                    >
                      {isCurrentUser ? 'Leave Family' : 'Remove Member'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* D. ADD MEMBER MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          reset();
          setIsAddModalOpen(false);
        }}
        title="Add New Member"
        size="md"
      >
        <form onSubmit={handleSubmit(handleAddMemberSubmit)} className="space-y-5" noValidate>
          <Input
            label="User ID (UUID) *"
            placeholder="e.g. a3bb189e-8bf9-3888-9912-ace4e6543002"
            helperText="Enter the UUID of the registered user you want to add"
            error={errors.userId?.message}
            {...register('userId')}
          />

          <Select
            label="Role Assignment *"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role')}
          />

          {/* Role Explanations */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Role Permissions Breakdown</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 pl-5 list-disc">
              <li>
                <strong className="text-indigo-700">ADMIN:</strong> Full control over family settings, member invites, removals, and consent policies.
              </li>
              <li>
                <strong className="text-amber-700">GUARDIAN:</strong> Can view/manage health records of designated family members under active consent permissions.
              </li>
              <li>
                <strong className="text-teal-700">MEMBER:</strong> Standard family member. Controls their own health data consents and views the member roster.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                reset();
                setIsAddModalOpen(false);
              }}
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={UserPlus}
              loading={addMemberMutation.isPending}
            >
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DIALOG FOR REMOVING / LEAVING */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        title={isRemovingSelf ? 'Leave Family Group' : 'Remove Family Member'}
        message={
          isSoleAdmin
            ? '⚠️ You are the last ADMIN in this family group. Removing yourself may leave this family without an administrator to manage members or settings.'
            : isRemovingSelf
            ? 'Are you sure you want to leave this family? You will forfeit access to shared family health records and active guardian consents.'
            : `Are you sure you want to remove member ${memberToRemove?.user_id} from this family group?`
        }
        confirmLabel={isRemovingSelf ? 'Leave Family' : 'Remove Member'}
        variant={isSoleAdmin ? 'warning' : 'danger'}
        isLoading={removeMemberMutation.isPending}
      />
    </div>
  );
};

export default FamilyDetailPage;
