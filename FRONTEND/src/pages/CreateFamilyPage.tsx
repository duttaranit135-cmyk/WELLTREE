import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Users, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCreateFamily } from '../hooks/useFamilies';

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

export const CreateFamilyPage: React.FC = () => {
  const navigate = useNavigate();
  const createFamilyMutation = useCreateFamily();

  const {
    register,
    handleSubmit,
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
      navigate('/families');
    } catch {
      // Error handled with toast in mutation hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Create New Family"
        description="Establish a new health management hub where you serve as the primary Admin."
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/families')}
          >
            Back to Families
          </Button>
        }
      />

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Family Group Details
              </h3>
              <p className="text-xs text-slate-500">
                You will be automatically designated as the family Administrator.
              </p>
            </div>
          </div>

          <Input
            label="Family Name *"
            placeholder="e.g. Miller Family Care Circle"
            error={errors.name?.message}
            helperText="A recognizable name for your healthcare group"
            {...register('name')}
          />

          <div className="w-full flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold tracking-wide text-slate-700">
              Description (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Provide context on health monitoring priorities or member notes..."
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-slate-400"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-danger font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/families')}
              disabled={createFamilyMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Plus}
              loading={createFamilyMutation.isPending}
            >
              Create Family
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateFamilyPage;
