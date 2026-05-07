import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-bg/60 font-mono font-semibold uppercase text-accent-foreground select-none',
  {
    variants: {
      variant: {
        default: '',
        you: 'bg-accent-2',
      },
      size: {
        sm: 'h-7 w-7 text-xs',
        md: 'h-9 w-9 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

const SLOT_PALETTE = [
  '#7aa7c7', // dusk blue
  '#c77a9d', // rose
  '#7ac79a', // mint
  '#c7a47a', // sand
  '#a47ac7', // violet
  '#c7c47a', // citrine
  '#7ac7c7', // teal
  '#c77a7a', // brick
] as const;

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'slot'>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
  alt?: string;
  /** Index into the decorative team palette. Ignored when variant === 'you'. */
  slot?: number;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { className, variant, size, name, src, alt, slot, style, ...props },
  ref,
) {
  const initial = name.trim().charAt(0).toUpperCase();
  const useSlot = variant !== 'you' && typeof slot === 'number';
  const slotColor = useSlot
    ? SLOT_PALETTE[
        (((slot as number) % SLOT_PALETTE.length) + SLOT_PALETTE.length) % SLOT_PALETTE.length
      ]
    : undefined;
  const mergedStyle = slotColor ? { background: slotColor, ...style } : style;
  return (
    <span
      ref={ref}
      role="img"
      aria-label={src ? undefined : name}
      className={cn(avatarVariants({ variant, size }), className)}
      style={mergedStyle}
      {...props}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: avatars accept arbitrary URLs (gravatar, supabase storage, etc.) — next/image's remotePatterns whitelist isn't a fit for a generic primitive
        <img src={src} alt={alt ?? name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  );
});

export { avatarVariants };
