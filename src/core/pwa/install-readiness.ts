// ============================================================
// Why the browser will or will not install this
// ============================================================

/**
 * Chrome answers "this app cannot be installed" and says nothing more — not
 * in the dialog, not in the console. Everything it checks is observable from
 * the page, so the page can check it too and name the one that failed.
 *
 * This exists because the first cause was invisible from a desktop: the icons
 * were gitignored, so the manifest shipped pointing at 404s. Guessing at that
 * from another machine took a deploy cycle per hypothesis.
 */

import { ensureManifestLink, manifestHref } from './manifest-link';

export type CheckStatus = 'pass' | 'fail' | 'unknown';

export interface Check {
    id: string;
    status: CheckStatus;
    /** What was actually observed, for a check that failed or is unclear. */
    detail?: string;
}

export interface InstallReadiness {
    checks: Check[];
    /** Already running as an installed app — nothing to install. */
    installed: boolean;
    /** The browser offered an install prompt, so it considers us installable. */
    promptAvailable: boolean;
}

const ICON_MIN = 192;

const fetchIcon = async (url: string): Promise<{ ok: boolean; detail: string }> => {
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return { ok: false, detail: `${url.split('/').pop()} → ${response.status}` };
        const type = response.headers.get('content-type') || '';
        if (!type.startsWith('image/')) {
            return { ok: false, detail: `${url.split('/').pop()} → ${type || 'no type'}` };
        }
        return { ok: true, detail: '' };
    } catch (error) {
        return { ok: false, detail: `${url.split('/').pop()} → ${String(error).slice(0, 60)}` };
    }
};

const parseLargest = (sizes: unknown): number => {
    if (typeof sizes !== 'string') return 0;
    return sizes.split(/\s+/)
        .map(size => parseInt(size.split('x')[0] || '0', 10))
        .reduce((max, value) => (Number.isFinite(value) && value > max ? value : max), 0);
};

export const checkInstallReadiness = async (promptAvailable: boolean): Promise<InstallReadiness> => {
    const checks: Check[] = [];
    const add = (id: string, status: CheckStatus, detail?: string) => checks.push({ id, status, detail });

    const installed = typeof matchMedia === 'function'
        && (matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);

    add('secure', isSecureContext ? 'pass' : 'fail', isSecureContext ? undefined : location.protocol);

    // ── Manifest ────────────────────────────────────────────────────────────
    // Restoring it here as well as at boot: a blocker that strips the tag may
    // have done so again since, and a diagnostic that leaves the page broken
    // is half a diagnostic.
    const state = ensureManifestLink();
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
        add('manifest-link', 'fail', 'cannot-add');
        return { checks, installed, promptAvailable };
    }
    if (state === 'restored') {
        // Whether the server sent it decides who to blame: the build, or
        // something in this browser rewriting <head>.
        let servedIt: boolean | null;
        try {
            const html = await fetch(location.href, { cache: 'no-store' }).then(response => response.text());
            servedIt = /rel=["']manifest["']/.test(html.slice(0, html.indexOf('</head>') + 1));
        } catch {
            servedIt = null;
        }
        add('manifest-link', 'unknown',
            servedIt === true ? 'restored:stripped-here'
            : servedIt === false ? 'restored:not-served'
            : 'restored:unknown');
    } else {
        add('manifest-link', 'pass');
    }

    let manifest: any = null;
    try {
        const response = await fetch(link.href || manifestHref(), { cache: 'no-store' });
        if (!response.ok) {
            add('manifest-fetch', 'fail', `${response.status}`);
        } else {
            manifest = await response.json();
            add('manifest-fetch', 'pass');
        }
    } catch (error) {
        add('manifest-fetch', 'fail', String(error).slice(0, 80));
    }

    if (manifest) {
        add('manifest-name', manifest.name || manifest.short_name ? 'pass' : 'fail');

        const display = String(manifest.display || '');
        add(
            'manifest-display',
            ['standalone', 'fullscreen', 'minimal-ui'].includes(display) ? 'pass' : 'fail',
            display || 'not set',
        );

        // start_url has to sit inside scope, or the installed window would
        // open somewhere the service worker does not control.
        try {
            const scope = new URL(manifest.scope ?? './', link.href);
            const start = new URL(manifest.start_url ?? './', link.href);
            add('manifest-scope', start.href.startsWith(scope.href) ? 'pass' : 'fail',
                `${start.pathname} vs ${scope.pathname}`);
        } catch {
            add('manifest-scope', 'unknown');
        }

        const icons: any[] = Array.isArray(manifest.icons) ? manifest.icons : [];
        const anyIcons = icons.filter(icon => !icon.purpose || String(icon.purpose).split(/\s+/).includes('any'));
        const bigEnough = anyIcons.filter(icon => parseLargest(icon.sizes) >= ICON_MIN);
        add('icon-declared', bigEnough.length > 0 ? 'pass' : 'fail',
            bigEnough.length > 0 ? undefined : `${icons.length} declared, none ≥ ${ICON_MIN}px with purpose any`);

        // The check that actually caught the real bug: declared is not served.
        const results = await Promise.all(
            icons.map(icon => fetchIcon(new URL(icon.src, link.href).href)),
        );
        const broken = results.filter(result => !result.ok);
        add('icon-served', broken.length === 0 ? 'pass' : 'fail',
            broken.map(result => result.detail).join(', ').slice(0, 140));
    }

    // ── Service worker ──────────────────────────────────────────────────────
    if (!('serviceWorker' in navigator)) {
        add('sw', 'fail', 'unsupported');
    } else {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                add('sw', 'fail', 'not registered');
            } else if (!registration.active) {
                add('sw', 'unknown', 'installing');
            } else {
                add('sw', 'pass', registration.scope.replace(location.origin, ''));
            }
            add('sw-controlling', navigator.serviceWorker.controller ? 'pass' : 'unknown');
        } catch (error) {
            add('sw', 'fail', String(error).slice(0, 80));
        }
    }

    return { checks, installed, promptAvailable };
};
