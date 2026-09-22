import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';

/**
 * `overscroll-behavior: contain` stops scroll chaining even when the container
 * has nothing to scroll — the wheel is swallowed and the parent never moves.
 *
 * `.custom-scroll` is on about a hundred elements here, most of them not
 * overflowing at any given moment, so putting `contain` on that class turned
 * "scroll anywhere" into "scroll only over the few panes that happen to be
 * full right now". It belongs on one element: the sheet body, which is always
 * a scroll container and is the only place where chaining to the page behind
 * it was ever a problem.
 */
describe('scroll containment', () => {
    it('is not applied to the shared scrollbar class', () => {
        const css = readFileSync('src/index.css', 'utf8');
        const block = css.slice(css.indexOf('.custom-scroll {'), css.indexOf('}', css.indexOf('.custom-scroll {')));
        expect(block).not.toContain('overscroll');
    });

    it('is applied to the modal body, which always scrolls', () => {
        const modal = readFileSync('src/components/ui/Modal.tsx', 'utf8');
        expect(modal).toContain('overscroll-contain');
    });
});
