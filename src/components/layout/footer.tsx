import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface FooterProps {
  className?: string;
}

const GITHUB_URL = 'https://github.com/kdoddy36615/reddit-guess-top-comment';

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        'mx-auto w-full max-w-content px-4 md:px-6 py-6 text-text-faint text-sm',
        className,
      )}
    >
      <nav aria-label="Legal and source" className="flex items-center justify-center gap-3">
        <FooterLink href="/legal/terms">Terms</FooterLink>
        <span aria-hidden="true">·</span>
        <FooterLink href="/legal/privacy">Privacy</FooterLink>
        <span aria-hidden="true">·</span>
        <FooterLink href={GITHUB_URL} external>
          GitHub
        </FooterLink>
      </nav>
    </footer>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const className =
    'rounded-sm outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
