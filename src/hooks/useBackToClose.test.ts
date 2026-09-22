import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { __resetBackLayers, backLayerCount, pushBackLayer } from './useBackToClose';

/**
 * `popstate` reaches every listener at once, so the ordering rules are the
 * whole point: one Back closes exactly one layer, the topmost, and a sheet
 * closed by its own button must not take the sheet underneath with it.
 */
const listeners = new Set<(event: any) => void>();
const entries: unknown[] = [];

const fireBack = () => {
    entries.pop();
    for (const listener of listeners) listener({ type: 'popstate' });
};

// The real window is a configurable accessor on the global once there is a
// DOM, so it can be shadowed but not assigned to — and deleting it would take
// it away from every test that runs after this file, not just this one.
let realWindow: PropertyDescriptor | undefined;

beforeEach(() => {
    __resetBackLayers();
    listeners.clear();
    entries.length = 0;
    realWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {
        addEventListener: (type: string, listener: any) => {
            if (type === 'popstate') listeners.add(listener);
        },
        removeEventListener: (type: string, listener: any) => {
            if (type === 'popstate') listeners.delete(listener);
        },
        history: {
            pushState: (state: unknown) => entries.push(state),
            back: () => fireBack(),
        },
    } });
});

afterEach(() => {
    if (realWindow) Object.defineProperty(globalThis, 'window', realWindow);
    else delete (globalThis as any).window;
});

describe('back layers', () => {
    it('closes the topmost layer and only that one', () => {
        const closed: string[] = [];
        pushBackLayer(() => closed.push('first'));
        pushBackLayer(() => closed.push('second'));
        expect(backLayerCount()).toBe(2);

        fireBack();
        expect(closed).toEqual(['second']);
        expect(backLayerCount()).toBe(1);

        fireBack();
        expect(closed).toEqual(['second', 'first']);
        expect(backLayerCount()).toBe(0);
    });

    it('pushes one history entry per layer', () => {
        pushBackLayer(() => {});
        pushBackLayer(() => {});
        expect(entries).toHaveLength(2);
    });

    it('closing by its own button does not close the layer underneath', () => {
        // The history entry still has to go, and the popstate that removing it
        // causes must not be read as a Back gesture.
        const closed: string[] = [];
        pushBackLayer(() => closed.push('first'));
        const removeSecond = pushBackLayer(() => closed.push('second'));

        removeSecond();
        expect(closed).toEqual([]);
        expect(backLayerCount()).toBe(1);
        expect(entries).toHaveLength(1);

        fireBack();
        expect(closed).toEqual(['first']);
    });

    it('a layer already taken by Back does not pop history again', () => {
        // Otherwise unmounting after a Back gesture would navigate out of the
        // app entirely.
        const remove = pushBackLayer(() => {});
        fireBack();
        expect(backLayerCount()).toBe(0);

        remove();
        expect(entries).toHaveLength(0);
        expect(backLayerCount()).toBe(0);
    });

    it('survives being asked to remove the same layer twice', () => {
        const remove = pushBackLayer(() => {});
        remove();
        remove();
        expect(backLayerCount()).toBe(0);
    });
});
