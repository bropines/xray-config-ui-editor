import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

type Side = 'top' | 'bottom';

interface HelpProps {
    children: React.ReactNode;
    /** Preferred side. Flipped automatically when there is no room. */
    position?: Side;
}

const GAP = 8;
const MARGIN = 8;
const SHOW_DELAY = 120;

/**
 * Hint bubble next to a field label.
 *
 * This used to be the browser's native `title` attribute, because a CSS
 * tooltip gets clipped by the `overflow-y-auto` containers these sit inside.
 * Rendering through a portal with fixed coordinates solves the clipping
 * without inheriting the native tooltip's half-second delay, its OS styling in
 * the middle of a dark UI, and its habit of ignoring keyboard focus entirely.
 */
export const Help = ({ children, position = 'top' }: HelpProps) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [box, setBox] = useState<{ top: number; left: number; side: Side } | null>(null);
    const id = useId();

    const place = useCallback(() => {
        const trigger = triggerRef.current;
        const bubble = bubbleRef.current;
        if (!trigger || !bubble) return;

        const anchor = trigger.getBoundingClientRect();
        const { width, height } = bubble.getBoundingClientRect();

        // Flip to whichever side actually has room, preferring the requested one.
        const roomAbove = anchor.top;
        const roomBelow = window.innerHeight - anchor.bottom;
        const needed = height + GAP + MARGIN;
        let side: Side = position;
        if (side === 'top' && roomAbove < needed && roomBelow >= needed) side = 'bottom';
        else if (side === 'bottom' && roomBelow < needed && roomAbove >= needed) side = 'top';

        const top = side === 'top' ? anchor.top - height - GAP : anchor.bottom + GAP;
        const left = Math.min(
            Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2),
            window.innerWidth - width - MARGIN,
        );
        setBox({ top, left, side });
    }, [position]);

    // Closing forgets where the bubble was, so reopening next to a different
    // trigger cannot paint one frame at the old coordinates.
    const hide = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setOpen(false);
        setBox(null);
    }, []);

    // useLayoutEffect, not useEffect: the bubble has to be measured and moved
    // before the browser paints. Positioning it after a paint puts one frame of
    // it in the top-left corner, and with an enter animation running that frame
    // reads as the tooltip flying in from the corner of the screen.
    useLayoutEffect(() => {
        if (!open) return;
        place();
        // A tooltip anchored to fixed coordinates has to go away rather than
        // float over unrelated content once the page moves under it.
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, [open, place, hide]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const show = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(true), SHOW_DELAY);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label="?"
                aria-describedby={open ? id : undefined}
                aria-expanded={open}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={() => setOpen(true)}
                onBlur={hide}
                onKeyDown={e => e.key === 'Escape' && hide()}
                // Tap to toggle: a phone has no hover, and these hints are
                // often the only explanation a field gets.
                onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(prev => !prev);
                }}
                className="relative inline-flex items-center ml-1.5 align-middle cursor-help bg-transparent border-0 p-0 after:absolute after:content-[''] after:-inset-2.5 md:after:hidden"
            >
                <Icon
                    name="Question"
                    className={`transition-colors text-[14px] ${open ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}`}
                    weight="bold"
                />
            </button>

            {open && createPortal(
                <div
                    ref={bubbleRef}
                    id={id}
                    role="tooltip"
                    style={{
                        top: box ? box.top : 0,
                        // Measured off-screen, then moved into place. The move
                        // must not be animated, hence transition-opacity below
                        // rather than a bare `duration-*`: that sets only
                        // transition-duration, and CSS defaults
                        // transition-property to `all`, so the jump from here
                        // to the anchor became a visible flight across the page.
                        left: box ? box.left : -9999,
                    }}
                    className={`fixed z-[10000] max-w-[min(20rem,calc(100vw-1rem))] px-2.5 py-2 rounded-lg
                        bg-slate-800 border border-slate-600/70 shadow-xl shadow-black/40
                        text-[11px] leading-relaxed text-slate-200 pointer-events-none
                        transition-opacity duration-100 ${box ? 'opacity-100' : 'opacity-0'}`}
                >
                    {children}
                </div>,
                document.body,
            )}
        </>
    );
};
