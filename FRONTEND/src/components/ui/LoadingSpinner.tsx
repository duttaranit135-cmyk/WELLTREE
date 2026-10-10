import React from 'react';
import { cn } from '../../lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'fullPage';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label,
}) => {
  const spinnerSizes: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinnerElement = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-slate-200 border-t-primary animate-spin',
          size === 'fullPage' ? 'w-12 h-12 border-4' : spinnerSizes[size]
        )}
      />
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );

  if (size === 'fullPage') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-light/80 backdrop-blur-xs">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};
