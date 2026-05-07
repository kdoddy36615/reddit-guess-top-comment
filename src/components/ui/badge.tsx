import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border font-mono text-xs',
  {
    variants: {
      variant: {
        default: 'bg-surface text-text-muted border-border-strong',
        accent: 'bg-accent-soft text-accent border-accent',
        gold: 'bg-accent-2-soft text-accent-2 border-accent-2',
        success: 'bg-surface text-success border-success',
        danger: 'bg-surface text-danger border-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, ...props },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

export { badgeVariants };
