import React, { forwardRef, useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon | React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon: Icon, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const renderIcon = () => {
      if (!Icon) return null;
      if (React.isValidElement(Icon)) {
        return <span className="text-slate-400 pointer-events-none">{Icon}</span>;
      }
      const IconComponent = Icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-4 h-4 text-slate-400 pointer-events-none" />;
    };

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-wide text-slate-700 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 flex items-center justify-center">
              {renderIcon()}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3.5 rounded-lg text-sm bg-white text-slate-900 border transition-all duration-150',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              Icon ? 'pl-10' : 'pl-3.5',
              error
                ? 'border-danger focus:border-danger focus:ring-danger/20 text-danger-900'
                : 'border-slate-300 focus:border-primary focus:ring-primary/20',
              disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200',
              className
            )}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-danger font-medium flex items-center gap-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
