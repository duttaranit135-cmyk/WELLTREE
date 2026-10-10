import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Plus,
  Calendar,
  Shield,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useFamilies, useCreateFamily } from '../hooks/useFamilies';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';
import type { Family, FamilyRole } from '../types';

// Zod validation schema for creating a family
const familySchema = z.object({
  name: z
    .string()
    .min(1, 'Family name is required')
    .max(100, 'Family name cannot exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

type FamilyFormData = z.infer<typeof familySchema>;

export const FamiliesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: families, isLoading, isError, error, refetch } = useFamilies();
  const createFamilyMutation = useCreateFamily();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: FamilyFormData) => {
    try {
      await createFamilyMutation.mutateAsync({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
      });
      reset();
      setIsModalOpen(false);
    } catch {
      // Error handled with toast in mutation hook
    }
  };

  const handleCloseModal = () => {
    reset();
    setIsModalOpen(false);
  };

  // Helper to determine the current user's role in a family
  const getUserRole = (family: Family): FamilyRole => {
    if (family.created_by === user?.id) {
      return 'ADMIN';
    }
    const currentMember = family.members?.find((m) => m.user_id === user?.id);
    return currentMember ? currentMember.role : 'MEMBER';
  };

  const getRoleBadgeVariant = (role: FamilyRole) => {
    switch (role) {
      case 'ADMIN':
        return 'indigo' as const;
      case 'GUARDIAN':
        return 'amber' as const;
      case 'MEMBER':
      default:
        return 'teal' as const;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="My Families"
        description="Manage your family health groups, designate trusted guardians, and invite members."
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Create Family
          </Button>
        }
      />

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="w-16 h-5 rounded-full bg-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-4/5" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
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
            Failed to Load Families
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {error?.message || 'Unable to retrieve your family circles at this time.'}
          </p>
          <Button variant="primary" icon={RefreshCw} onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && (!families || families.length === 0) && (
        <EmptyState
          icon={Users}
          title="No families yet"
          description="Create your first family group to invite members, share health vitals, and grant guardian consents."
          actionLabel="Create Family"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* Family Cards Grid */}
      {!isLoading && !isError && families && families.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {families.map((family) => {
            const role = getUserRole(family);
            const badgeVariant = getRoleBadgeVariant(role);
            const memberCount = family.members?.length ?? 1;

            return (
              <Card
                key={family.id}
                onClick={() => navigate(`/families/${family.id}`)}
                className="group relative flex flex-col justify-between hover:border-teal-300 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  {/* Card Top: Icon & Role Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant={badgeVariant} size="sm">
                      {role}
                    </Badge>
                  </div>

                  {/* Family Name */}
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors mb-1.5">
                    {family.name}
                  </h3>

                  {/* Description (Truncated) */}
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {family.description || 'No description provided.'}
                  </p>
                </div>

                {/* Card Footer: Metadata */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(family.created_at)}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Family Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Family"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Family Name *"
            placeholder="e.g. Miller Family Care Circle"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="w-full flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold tracking-wide text-slate-700">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of health monitoring priorities or member notes..."
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-slate-400"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-danger font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={handleCloseModal}
              disabled={createFamilyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={createFamilyMutation.isPending}
            >
              Create Family
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FamiliesPage;
