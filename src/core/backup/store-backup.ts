// ============================================================
// Everything the editor remembers, in one file
// ============================================================

import { idbStorage } from '../../utils/indexedDbStorage';

/**
 * The editor keeps profiles, version history, panel credentials, snippet
 * libraries and spiderX paths in IndexedDB. `downloadConfig` exports the
 * *active* config and nothing else, so none of that has ever been portable.
 *
 * That is survivable in a browser tab. It stops being survivable the moment
 * the app is installable: on iOS a home-screen app gets a storage container
 * separate from Safari's, so someone who installs after months of work opens
 * the icon and finds an empty editor — with their configs still in Safari,
 * invisible and unreachable from the app. Safari also evicts script-writable
 * storage after seven days without use.
 *
 * So: a file the user can hold. Export before installing, import after.
 */

/** The key zustand's persist middleware writes under. */
export const STORE_KEY = 'xray-config-storage';

const FORMAT = 'xray-config-ui-editor/backup';
const FORMAT_VERSION = 1;

export interface Backup {
    format: typeof FORMAT;
    version: number;
    exportedAt: string;
    /** The app build that wrote it — for diagnosing an import that misbehaves. */
    app: string;
    /** The persisted store, verbatim. */
    state: unknown;
}

export interface BackupSummary {
    profiles: number;
    snapshots: number;
    hasConfig: boolean;
    panelConnected: boolean;
    spiderPaths: number;
}

const appVersion = (): string =>
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';

/**
 * Reads what is actually on disk rather than the live store, so the file
 * matches what a reload would restore — including anything `partialize`
 * deliberately leaves out of the persisted slice.
 */
export const exportBackup = async (): Promise<Backup> => {
    const raw = await idbStorage.getItem(STORE_KEY);
    if (!raw) {
        throw new Error('nothing-stored');
    }
    return {
        format: FORMAT,
        version: FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        app: appVersion(),
        state: JSON.parse(raw),
    };
};

/** What a backup holds, for a confirmation step that says more than "ok". */
export const summarise = (backup: Backup): BackupSummary => {
    const state = (backup.state as any)?.state ?? {};
    const histories = state.histories ?? {};
    return {
        profiles: Array.isArray(state.profiles) ? state.profiles.length : 0,
        snapshots: Object.values(histories)
            .reduce((sum: number, list: any) => sum + (Array.isArray(list) ? list.length : 0), 0),
        hasConfig: !!state.config,
        panelConnected: !!state.remnawave?.connected,
        spiderPaths: Array.isArray(state.spiderPaths) ? state.spiderPaths.length : 0,
    };
};

export type BackupProblem = 'not-json' | 'not-a-backup' | 'from-the-future' | 'empty';

/**
 * Parses and checks a pasted or picked file without writing anything.
 *
 * Refusing early matters more than usual here: `restoreBackup` replaces the
 * whole store, so a file that turns out to be half-valid would take the user's
 * existing work with it.
 */
export const readBackup = (text: string): { backup: Backup } | { problem: BackupProblem } => {
    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { problem: 'not-json' };
    }
    if (!parsed || typeof parsed !== 'object' || parsed.format !== FORMAT) {
        return { problem: 'not-a-backup' };
    }
    if (typeof parsed.version !== 'number' || parsed.version > FORMAT_VERSION) {
        return { problem: 'from-the-future' };
    }
    if (!parsed.state || typeof parsed.state !== 'object') {
        return { problem: 'empty' };
    }
    return { backup: parsed as Backup };
};

/**
 * Replaces the stored state. The caller is expected to reload afterwards:
 * zustand reads IndexedDB once, at startup, so a live store would keep
 * showing — and then re-persist — what was there before.
 */
export const restoreBackup = async (backup: Backup): Promise<void> => {
    await idbStorage.setItem(STORE_KEY, JSON.stringify(backup.state));
};

/** A filename that sorts by date and says what it is. */
export const backupFilename = (now = new Date()): string => {
    const stamp = now.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
    return `xray-editor-backup-${stamp}.json`;
};
