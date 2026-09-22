import React from 'react';

/**
 * Subscribes to a media query.
 *
 * Nearly everything responsive here is CSS, which is where it belongs. This
 * is for the cases where the same element has to live in a different *place*
 * at different widths — rendering it twice and hiding one copy would duplicate
 * the DOM and any state inside it.
 */
export const useMediaQuery = (query: string): boolean => {
    const subscribe = React.useCallback((notify: () => void) => {
        if (typeof window === 'undefined' || !window.matchMedia) return () => {};
        const list = window.matchMedia(query);
        list.addEventListener('change', notify);
        return () => list.removeEventListener('change', notify);
    }, [query]);

    return React.useSyncExternalStore(
        subscribe,
        () => (typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia(query).matches
            : false),
        () => false,
    );
};

/** Tailwind's `md` breakpoint — the line the whole app already splits on. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 768px)');
