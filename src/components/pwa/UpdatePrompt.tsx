import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { t } from '../../i18n';

/** How often an app left open should look for a new deploy. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Offers the new version instead of taking it.
 *
 * A service worker that activates on its own reloads the page, and this app's
 * main surface is a text editor with unsaved work in it. So the worker waits,
 * and a toast that does not dismiss itself offers the reload — the user picks
 * the moment.
 *
 * The interval matters for an installed app: a standalone window can stay open
 * for days, and without an explicit check it would never notice a deploy.
 */
export const UpdatePrompt = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_url, registration) {
            if (!registration) return;
            setInterval(() => {
                registration.update().catch(() => {
                    // Offline, or the server is having a moment. The next tick
                    // will try again; there is nothing useful to say here.
                });
            }, UPDATE_INTERVAL_MS);
        },
    });

    React.useEffect(() => {
        if (!needRefresh) return;
        toast(t("A new version is ready."), {
            id: 'pwa-update',
            duration: Infinity,
            description: t("Reloading applies it. Anything unsaved in the editor is lost, so finish what you are doing first."),
            action: {
                label: t("Reload"),
                onClick: () => updateServiceWorker(true),
            },
        });
    }, [needRefresh, updateServiceWorker]);

    return null;
};
