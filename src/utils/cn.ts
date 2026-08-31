import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional classNames (clsx) and resolve conflicting Tailwind
 * utility classes so the last one wins (twMerge) — e.g. cn('p-2', 'p-4')
 * resolves to 'p-4' instead of leaving both in the DOM. Both `clsx` and
 * `tailwind-merge` were already dependencies but, before this, nothing in
 * the codebase actually combined them: components built their className
 * strings by hand with template literals, which meant a caller's own
 * `className` prop could not reliably override a primitive's default
 * styling (both classes just end up in the string, and whichever Tailwind
 * generated later in the stylesheet wins — not whichever the caller meant).
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
