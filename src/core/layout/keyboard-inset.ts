// ============================================================
// How much of the screen the on-screen keyboard is covering
// ============================================================

/**
 * Chrome on Android shrinks the page when the keyboard opens, because
 * `index.html` asks it to with `interactive-widget=resizes-content`. Safari
 * ignores that: the layout viewport keeps its full height and the keyboard is
 * drawn over the top of it. A full-screen sheet therefore still believes it
 * has the whole screen, and its footer — Close, Save — sits underneath the
 * keyboard, along with whatever field is being typed into.
 *
 * The visual viewport does know. The difference between it and the layout
 * viewport is the keyboard, published as `--keyboard-inset` for the sheet to
 * subtract from its height. Where the browser already resized the page the
 * difference is zero, so this changes nothing on Android and nothing on a
 * desktop.
 */

export interface ViewportLike {
    height: number;
    offsetTop: number;
}

/** Rounded so a fractional pixel does not churn the CSS variable. */
export const keyboardInset = (innerHeight: number, viewport: ViewportLike | null | undefined): number => {
    if (!viewport) return 0;
    const covered = innerHeight - (viewport.height + viewport.offsetTop);
    // Small differences are the URL bar collapsing, not a keyboard; anything
    // under a finger's width is noise.
    if (!Number.isFinite(covered) || covered < 80) return 0;
    return Math.round(covered);
};

/**
 * Keeps `--keyboard-inset` on the document in step with the keyboard.
 *
 * Returns a function that stops watching and clears the variable.
 */
export const watchKeyboardInset = (): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    const viewport = window.visualViewport;
    if (!viewport) return () => {};

    let last = -1;
    const apply = () => {
        const inset = keyboardInset(window.innerHeight, viewport);
        if (inset === last) return;
        last = inset;
        document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    };

    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    apply();

    return () => {
        viewport.removeEventListener('resize', apply);
        viewport.removeEventListener('scroll', apply);
        document.documentElement.style.removeProperty('--keyboard-inset');
    };
};
