import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

// Zod schema
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password', '');

  // Calculate Password Strength:
  // Weak (red): < 8 chars
  // Fair (amber): 8+ chars
  // Good (teal): 8+ chars + has number
  // Strong (green): 8+ chars + number + special char + uppercase
  const getPasswordStrength = (pass: string) => {
    if (!pass) {
      return { label: '', color: 'bg-slate-200', textColor: 'text-slate-400', width: 'w-0' };
    }
    if (pass.length < 8) {
      return { label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500', width: 'w-1/4' };
    }

    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);

    if (hasNumber && hasSpecial && hasUpper) {
      return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600', width: 'w-full' };
    }
    if (hasNumber) {
      return { label: 'Good', color: 'bg-teal-500', textColor: 'text-teal-600', width: 'w-3/4' };
    }
    return { label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/4' };
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await signUp(data.email, data.password, data.fullName);

      if (result.error) {
        toast.error(result.error.message || 'Failed to create account.');
        return;
      }

      toast.success('Account created! Please check your email for confirmation.');
      navigate('/login');
    } catch (err: unknown) {
      const errorMessage =
        (err as Error)?.message || 'An unexpected error occurred during registration.';
      toast.error(errorMessage);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Family Health Guardian to manage care circles securely"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          icon={User}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="jane@example.com"
          autoComplete="email"
          icon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password Strength Indicator */}
          {passwordValue && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-500">Password strength:</span>
                <span className={strength.textColor}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${strength.color} ${strength.width}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          icon={Lock}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            icon={UserPlus}
          >
            Create Account
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
