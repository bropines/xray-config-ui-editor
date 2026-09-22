/**
 * A DOM for `bun test`.
 *
 * Everything under core/ is plain functions and needs none of this, which is
 * why there was no DOM here at all — and why nothing that renders had a test.
 * Registered globally rather than per file so a test only has to import what
 * it is testing.
 */
import { mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { installMockIndexedDB } from './src/utils/indexedDbStorage.mock';

/**
 * `geo.worker?worker` is a Vite import form; bun cannot resolve it, so any
 * test that touches the geo path dies on the import rather than on anything
 * it meant to check. The wrapper around it is stubbed instead — a worker that
 * never answers, which is what a test without geo data would see anyway.
 */
const stubWorker = () => ({
    postMessage: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    terminate: () => {},
    onmessage: null,
    onerror: null,
});

mock.module('./src/utils/proto-worker.ts', () => ({
    getSharedProtoWorker: stubWorker,
    createProtoWorker: stubWorker,
}));

GlobalRegistrator.register({ width: 1280, height: 800, url: 'http://localhost/' });

// The config store persists through IndexedDB, which happy-dom does not
// implement; without a stand-in every mount logs a wall of storage errors.
installMockIndexedDB();

// `useIsDesktop` decides placement from a media query, so a test that wants a
// phone has to be able to say so. happy-dom answers `matchMedia` from the
// window size, but resizing it after the fact does not notify listeners, so
// the width is set here and the listeners are driven directly.
const listeners = new Set<() => void>();

const nativeMatchMedia = window.matchMedia.bind(window);
let currentWidth = 1280;

window.matchMedia = ((query: string) => {
    const list = nativeMatchMedia(query);
    const match = /\(min-width:\s*(\d+)px\)/.exec(query);
    if (!match) return list;
    const threshold = Number(match[1]);
    return {
        ...list,
        get matches() { return currentWidth >= threshold; },
        media: query,
        addEventListener: (_: string, listener: () => void) => { listeners.add(listener); },
        removeEventListener: (_: string, listener: () => void) => { listeners.delete(listener); },
        addListener: (listener: () => void) => { listeners.add(listener); },
        removeListener: (listener: () => void) => { listeners.delete(listener); },
        dispatchEvent: () => true,
        onchange: null,
    } as unknown as MediaQueryList;
}) as typeof window.matchMedia;

globalThis.setViewportWidth = (width: number) => {
    currentWidth = width;
    for (const listener of [...listeners]) listener();
};
