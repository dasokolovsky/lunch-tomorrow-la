import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'badge-default',
      secondary: 'badge-secondary',
      outline: 'badge-outline',
      success: 'border-transparent bg-success-500 text-white hover:bg-success-600',
      warning: 'border-transparent bg-warning-500 text-white hover:bg-warning-600',
      error: 'border-transparent bg-error-500 text-white hover:bg-error-600',
    };

    return (
      <div
        ref={ref}
        className={cn('badge', variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
