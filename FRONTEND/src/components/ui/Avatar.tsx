import React, { useState } from 'react';
import { getInitials, cn } from '../../lib/utils';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
    sm: { container: 'w-7 h-7', text: 'text-xs' },
    md: { container: 'w-9 h-9', text: 'text-sm' },
    lg: { container: 'w-12 h-12', text: 'text-base' },
    xl: { container: 'w-16 h-16', text: 'text-xl' },
  };

  const showImage = Boolean(src && !imageError);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none border border-slate-200/80 bg-slate-100 font-semibold text-slate-700 shadow-2xs',
        sizeStyles[size].container,
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src || ''}
          alt={name || 'User avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className={cn('tracking-wider text-primary font-bold', sizeStyles[size].text)}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};
