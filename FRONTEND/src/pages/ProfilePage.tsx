import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Calendar,
  Users,
  Phone,
  Link as LinkIcon,
  Pencil,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { formatDate } from '../lib/utils';
import type { ProfileUpdateInput } from '../types';

// Zod schema for profile editing
const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters'),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  phone_number: z
    .string()
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional()
    .nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      gender: '',
      phone_number: '',
      avatar_url: '',
    },
  });

  // Sync form values when profile loads or editing starts
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        phone_number: profile.phone_number || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, reset]);

  // Calculate Profile Completion Percentage
  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [
      Boolean(profile.full_name?.trim()),
      Boolean(profile.date_of_birth?.trim()),
      Boolean(profile.gender?.trim()),
      Boolean(profile.phone_number?.trim()),
      Boolean(profile.avatar_url?.trim()),
    ];
    const filledCount = fields.filter(Boolean).length;
    return Math.round((filledCount / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const getMeterColor = (pct: number) => {
    if (pct < 40) return { bar: 'bg-rose-500', text: 'text-rose-600', badge: 'red' as const };
    if (pct < 70) return { bar: 'bg-amber-500', text: 'text-amber-600', badge: 'amber' as const };
    return { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'emerald' as const };
  };

  const meterStyle = getMeterColor(completionPercentage);

  const onSubmit = async (data: ProfileFormData) => {
    const input: ProfileUpdateInput = {
      full_name: data.full_name,
      date_of_birth: data.date_of_birth ? data.date_of_birth : null,
      gender: data.gender ? data.gender : null,
      phone_number: data.phone_number ? data.phone_number : null,
      avatar_url: data.avatar_url ? data.avatar_url : null,
    };

    try {
      await updateProfileMutation.mutateAsync(input);
      setIsEditing(false);
    } catch {
      // Error toast already triggered by hook
    }
  };

  const handleCancel = () => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        phone_number: profile.phone_number || '',
        avatar_url: profile.avatar_url || '',
      });
    }
    setIsEditing(false);
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <PageHeader
          title="My Profile"
          description="Manage your personal information"
        />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="My Profile"
          description="Manage your personal information"
        />
        <Card className="flex flex-col items-center justify-center text-center p-12 border-rose-200 bg-rose-50/30">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Failed to Load Profile
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            {error?.message || 'Unable to retrieve your profile from the healthcare API.'}
          </p>
          <Button variant="primary" icon={RefreshCw} onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header with Edit Toggle */}
      <PageHeader
        title="My Profile"
        description="Manage your personal information and emergency healthcare credentials"
        action={
          !isEditing ? (
            <Button
              variant="outline"
              size="md"
              icon={Pencil}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="md"
              icon={X}
              onClick={handleCancel}
            >
              Cancel Edit
            </Button>
          )
        }
      />

      {/* Main Profile Container */}
      <Card className="p-6 sm:p-8">
        {!isEditing ? (
          /* ======================================================== */
          /* PROFILE VIEW MODE                                        */
          /* ======================================================== */
          <div className="space-y-8">
            {/* Top User Info & Avatar */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || user?.email}
                size="xl"
                className="w-24 h-24 text-2xl shadow-sm border-2 border-teal-100"
              />

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {profile?.full_name || 'Member Name Not Set'}
                  </h2>
                  <Badge variant="teal" size="sm">
                    Verified Guardian ID
                  </Badge>
                </div>

                <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{user?.email}</span>
                </p>

                <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Member Since: {formatDate(profile?.created_at)}</span>
                </p>
              </div>
            </div>

            {/* Profile Completion Meter */}
            <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-slate-800">
                    Profile Completion Meter
                  </span>
                </div>
                <Badge variant={meterStyle.badge} size="sm">
                  {completionPercentage}% Complete
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${meterStyle.bar}`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              <p className="text-xs text-slate-500">
                {completionPercentage >= 70
                  ? 'Your profile is comprehensive. Guardians and clinicians can quickly verify your data.'
                  : 'Complete all fields (Date of Birth, Phone, Gender, Avatar) to ensure uninterrupted emergency guardian notifications.'}
              </p>
            </div>

            {/* Profile Information Grid */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                Personal Credentials
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-teal-50 text-primary shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Full Name
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {profile?.full_name || 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Account Email (Managed by Auth) */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-secondary shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Email Address
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">Auth Managed</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {user?.email || 'Not available'}
                    </p>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-amber-50 text-warning shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date of Birth
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {profile?.date_of_birth ? formatDate(profile.date_of_birth) : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Gender */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-teal-50 text-primary shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Gender
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {profile?.gender || 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-secondary shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {profile?.phone_number || 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Avatar URL */}
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/70 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-teal-50 text-primary shrink-0">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Avatar URL
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">
                      {profile?.avatar_url || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* PROFILE EDIT MODE                                        */
          /* ======================================================== */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Profile Details</h3>
                <p className="text-xs text-slate-500">
                  Update your personal health record identification.
                </p>
              </div>
              <Badge variant="amber" size="sm">
                Editing
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <Input
                label="Full Name *"
                placeholder="Jane Doe"
                icon={User}
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              {/* Email (Readonly) */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold tracking-wide text-slate-700">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full h-10 pl-10 pr-3.5 rounded-lg text-sm bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Email cannot be modified here (managed by Supabase Auth).
                </p>
              </div>

              {/* Date of Birth */}
              <Input
                label="Date of Birth"
                type="date"
                icon={Calendar}
                error={errors.date_of_birth?.message}
                {...register('date_of_birth')}
              />

              {/* Gender */}
              <Select
                label="Gender"
                options={genderOptions}
                placeholder="Select gender"
                error={errors.gender?.message}
                {...register('gender')}
              />

              {/* Phone Number */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                icon={Phone}
                error={errors.phone_number?.message}
                {...register('phone_number')}
              />

              {/* Avatar URL */}
              <Input
                label="Avatar Image URL"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                icon={LinkIcon}
                error={errors.avatar_url?.message}
                helperText="Direct image URL for your profile avatar"
                {...register('avatar_url')}
              />
            </div>

            {/* Form Action Controls */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                loading={updateProfileMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
