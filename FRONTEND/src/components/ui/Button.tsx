import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon | React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      fullWidth = false,
      icon: Icon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-white hover:bg-[#0c615a] active:bg-[#0a4f49] focus:ring-primary/40 shadow-sm hover:shadow shadow-primary/20',
      secondary:
        'bg-secondary text-white hover:bg-[#4338ca] active:bg-[#3730a3] focus:ring-secondary/40 shadow-sm hover:shadow shadow-secondary/20',
      danger:
        'bg-danger text-white hover:bg-[#c7173e] active:bg-[#a61334] focus:ring-danger/40 shadow-sm hover:shadow shadow-danger/20',
      outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-primary/30 shadow-xs',
      ghost:
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
    };

    const renderIcon = () => {
      if (loading) {
        return (
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        );
      }
      if (!Icon) return null;
      if (React.isValidElement(Icon)) {
        return Icon;
      }
      const IconComponent = Icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />;
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {renderIcon()}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
