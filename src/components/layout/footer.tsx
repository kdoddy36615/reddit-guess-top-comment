import { cn } from '@/lib/cn';

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        'mx-auto w-full max-w-content px-4 md:px-6 py-6 text-text-faint text-sm',
        className,
      )}
    />
  );
}
