import { afterEach, describe, expect, it } from 'bun:test';
import { keyboardInset, watchKeyboardInset } from './keyboard-inset';

describe('keyboardInset', () => {
    it('is the part of the layout viewport the visual one no longer covers', () => {
        // An iPhone 14: 844pt tall, roughly 336pt of keyboard.
        expect(keyboardInset(844, { height: 508, offsetTop: 0 })).toBe(336);
    });

    it('counts the page being scrolled under the keyboard', () => {
        expect(keyboardInset(844, { height: 508, offsetTop: 100 })).toBe(236);
    });

    it('is nothing when the browser already resized the page', () => {
        // Android with interactive-widget=resizes-content.
        expect(keyboardInset(508, { height: 508, offsetTop: 0 })).toBe(0);
    });

    it('ignores the difference a collapsing URL bar makes', () => {
        expect(keyboardInset(844, { height: 800, offsetTop: 0 })).toBe(0);
    });

    it('is nothing without a visual viewport to ask', () => {
        expect(keyboardInset(844, null)).toBe(0);
        expect(keyboardInset(844, undefined)).toBe(0);
    });

    it('never goes negative', () => {
        expect(keyboardInset(500, { height: 800, offsetTop: 0 })).toBe(0);
    });
});

describe('watchKeyboardInset', () => {
    const listeners = new Map<string, () => void>();
    let original: unknown;

    const install = (height: number) => {
        original = (window as any).visualViewport;
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: {
                height,
                offsetTop: 0,
                addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
                removeEventListener: (type: string) => listeners.delete(type),
            },
        });
    };

    afterEach(() => {
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: original });
        listeners.clear();
        document.documentElement.style.removeProperty('--keyboard-inset');
    });

    it('publishes the inset and takes it back', () => {
        install(window.innerHeight - 300);
        const stop = watchKeyboardInset();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('300px');
        stop();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('');
    });

    it('follows the viewport as the keyboard opens and closes', () => {
        install(window.innerHeight);
        const stop = watchKeyboardInset();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px');

        (window as any).visualViewport.height = window.innerHeight - 336;
        listeners.get('resize')?.();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('336px');

        (window as any).visualViewport.height = window.innerHeight;
        listeners.get('resize')?.();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px');
        stop();
    });

    it('does nothing at all where there is no visual viewport', () => {
        original = (window as any).visualViewport;
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
        const stop = watchKeyboardInset();
        expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('');
        stop();
    });
});
