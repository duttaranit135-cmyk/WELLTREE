import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset link.');
        return;
      }

      setIsSubmitted(true);
      toast.success('Password reset link sent to your email');
    } catch (err: unknown) {
      const message =
        (err as Error)?.message || 'An error occurred while requesting password reset.';
      toast.error(message);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {isSubmitted ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-primary flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Check your inbox
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            We have sent password reset instructions to your email address if an account exists.
          </p>
          <div className="pt-2">
            <Link to="/login" className="inline-block w-full">
              <Button variant="outline" fullWidth icon={ArrowLeft}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Account Email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            icon={Mail}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              icon={Send}
            >
              Send Reset Link
            </Button>
          </div>

          <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
