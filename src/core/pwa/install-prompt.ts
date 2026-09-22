// ============================================================
// Holding on to the browser's install offer
// ============================================================

/**
 * `beforeinstallprompt` fires once, early, and is lost unless something keeps
 * it. Catching it at boot means the app can offer an install button later —
 * and, just as usefully, can say whether the browser ever considered the app
 * installable at all.
 *
 * Safari never fires it. That is not a failure state, it is iOS: installing
 * there goes through the Share sheet, which no page can trigger.
 */
interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

const announce = (available: boolean) => {
    for (const listener of listeners) listener(available);
};

export const watchInstallPrompt = (): void => {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', event => {
        // Keeping the default would show the browser's own mini-infobar over
        // the editor; the offer moves into Settings instead.
        event.preventDefault();
        deferred = event as InstallPromptEvent;
        announce(true);
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        announce(false);
    });
};

export const installPromptAvailable = (): boolean => deferred !== null;

export const onInstallPromptChange = (listener: (available: boolean) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** Returns the user's choice, or null when there was nothing to show. */
export const showInstallPrompt = async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferred) return null;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use: the browser fires a fresh one if it still
    // wants to offer an install.
    deferred = null;
    announce(false);
    return outcome;
};
