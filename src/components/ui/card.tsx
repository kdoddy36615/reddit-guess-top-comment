import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const cardVariants = cva('bg-surface-2 rounded-lg p-5', {
  variants: {
    variant: {
      default: 'border border-border',
      elevated: 'border border-border shadow-md',
      dashed: 'border border-dashed border-border-strong',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />;
});

export { cardVariants };
