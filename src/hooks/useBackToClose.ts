import React from 'react';

/**
 * Makes the system Back gesture close the thing on top instead of leaving the
 * app.
 *
 * On a phone every editor here is a full-screen sheet, and a full-screen view
 * that swallows Back is the single most disorienting thing a web app does:
 * the gesture that means "out of this" instead means "out of everything you
 * were doing". A router would give the same behaviour, at the cost of a URL
 * scheme and a rewrite of every call site; one history entry per layer gives
 * it today.
 *
 * Layers are kept in a module-level stack rather than per-component listeners,
 * because a `popstate` reaches every listener at once and only the topmost
 * layer should act on it.
 */
interface Layer {
    close: () => void;
}

const layers: Layer[] = [];

/**
 * Entries we are removing ourselves. The `popstate` those cause must not be
 * read as a Back gesture, or closing one sheet would close the one under it.
 */
let selfPops = 0;
let listening = false;

const onPopState = (): void => {
    if (selfPops > 0) {
        selfPops -= 1;
        return;
    }
    layers.pop()?.close();
};

const startListening = (): void => {
    if (listening || typeof window === 'undefined') return;
    window.addEventListener('popstate', onPopState);
    listening = true;
};

/**
 * Adds a layer and returns the function that removes it.
 *
 * Exported for the rare caller that manages a layer outside React's lifecycle;
 * everything else should use the hook.
 */
export const pushBackLayer = (close: () => void): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    startListening();

    const layer: Layer = { close };
    layers.push(layer);
    window.history.pushState({ backLayer: layers.length }, '');

    return () => {
        const index = layers.indexOf(layer);
        // Already gone: the Back gesture removed it, and its history entry
        // with it. Calling back() again would leave the app.
        if (index === -1) return;
        layers.splice(index, 1);
        selfPops += 1;
        window.history.back();
    };
};

/**
 * Registers a layer for as long as `active` is true.
 *
 * `onClose` is read through a ref so a caller passing an inline arrow does not
 * tear the layer down and rebuild it on every render — which would push a
 * history entry per render.
 */
export const useBackToClose = (active: boolean, onClose: () => void): void => {
    const latest = React.useRef(onClose);
    // Assigned in an effect rather than during render: a ref written while
    // rendering is not a safe read for anything that renders concurrently.
    React.useEffect(() => {
        latest.current = onClose;
    });

    React.useEffect(() => {
        if (!active) return;
        return pushBackLayer(() => latest.current());
    }, [active]);
};

/** Test seam: the stack is module state and survives between tests. */
export const __resetBackLayers = (): void => {
    if (listening && typeof window !== 'undefined') {
        window.removeEventListener('popstate', onPopState);
    }
    layers.length = 0;
    selfPops = 0;
    listening = false;
};

/** How many layers are registered — for tests and diagnostics. */
export const backLayerCount = (): number => layers.length;
