import { describe, expect, it } from 'bun:test';
import { backupFilename, readBackup, summarise } from './store-backup';

const valid = {
    format: 'xray-config-ui-editor/backup',
    version: 1,
    exportedAt: '2026-09-22T10:00:00.000Z',
    app: 'v1.5.0',
    state: {
        state: {
            config: { outbounds: [] },
            profiles: [{ id: 'a' }, { id: 'b' }],
            histories: { a: [{ id: '1' }, { id: '2' }], b: [{ id: '3' }] },
            remnawave: { connected: true },
            spiderPaths: ['/a', '/b', '/c'],
        },
        version: 0,
    },
};

describe('readBackup', () => {
    it('accepts a backup this app wrote', () => {
        const result = readBackup(JSON.stringify(valid));
        expect('backup' in result).toBe(true);
    });

    it('refuses anything that is not a backup, without writing', () => {
        // restoreBackup replaces the whole store, so a half-valid file would
        // take the user's existing work with it.
        expect(readBackup('not json at all')).toEqual({ problem: 'not-json' });
        expect(readBackup('{"outbounds":[]}')).toEqual({ problem: 'not-a-backup' });
        expect(readBackup(JSON.stringify({ ...valid, state: undefined }))).toEqual({ problem: 'empty' });
    });

    it('refuses a newer format rather than guessing at it', () => {
        expect(readBackup(JSON.stringify({ ...valid, version: 99 })))
            .toEqual({ problem: 'from-the-future' });
        expect(readBackup(JSON.stringify({ ...valid, version: 'one' })))
            .toEqual({ problem: 'from-the-future' });
    });

    it('takes an older format, which is the whole point of the version', () => {
        const result = readBackup(JSON.stringify({ ...valid, version: 0 }));
        expect('backup' in result).toBe(true);
    });
});

describe('summarise', () => {
    it('says what the file holds before anything is replaced', () => {
        expect(summarise(valid as any)).toEqual({
            profiles: 2,
            snapshots: 3,
            hasConfig: true,
            panelConnected: true,
            spiderPaths: 3,
        });
    });

    it('survives a backup with almost nothing in it', () => {
        expect(summarise({ ...valid, state: {} } as any)).toEqual({
            profiles: 0,
            snapshots: 0,
            hasConfig: false,
            panelConnected: false,
            spiderPaths: 0,
        });
    });
});

describe('backupFilename', () => {
    it('sorts by date and says what it is', () => {
        expect(backupFilename(new Date('2026-09-22T10:05:00Z')))
            .toBe('xray-editor-backup-2026-09-22-1005.json');
    });
});
