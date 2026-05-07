import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('bg-surface-2 rounded-md animate-pulse', className)}
      {...props}
    />
  );
});
