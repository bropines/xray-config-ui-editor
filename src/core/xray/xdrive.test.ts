import { describe, expect, it } from 'bun:test';
import { captureGroups, lineHasXDrive, xdriveProblems, xdriveSettingsProblems, XDRIVE_SERVICES } from './xdrive';
import { runFullDiagnostics } from '../diagnostics';
import { featureStatus } from './versions/features';

/**
 * xdrive's refusals, read from v26.10.10: XDriveConfig.Build()
 * (infra/conf/transport_method.go:985-998) fails the config; building the
 * store (transport/internet/xdrive/storage.go:29-48 and the three stores)
 * stops an inbound or fails an outbound's every connection. v26.9.30 has the
 * same package and the same struct (v26.9.30:infra/conf/transport_method.go:876-889),
 * so what holds on 26.10 holds there.
 */

const at = 'streamSettings.xdriveSettings';
const kinds = (settings: unknown, side: 'inbound' | 'outbound' = 'outbound', runs = true) =>
    xdriveSettingsProblems(settings, { side, runs, version: '26.10' }).map(problem => `${problem.kind} ${problem.field}`);

const TEMPLATE = {
    flatten: true,
    auth: { type: 'basic', username: '{secret0}', password: '{secret1}' },
    put: { method: 'PUT', url: 'https://dav.example/{folder}/{name}' },
    get: { method: 'GET', url: 'https://dav.example/{folder}/{name}' },
    delete: { method: 'DELETE', url: 'https://dav.example/{folder}/{name}' },
    list: { method: 'PROPFIND', url: 'https://dav.example/{folder}/', namesRegex: '<d:href>/folder/([^<]+)</d:href>' },
};

describe('which lines have xdrive', () => {
    it('are v26.9.30 and 26.10, and nothing is said on the others', () => {
        expect(lineHasXDrive('26.10')).toBe(true);
        expect(lineHasXDrive('26.9.30')).toBe(true);
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            expect(lineHasXDrive(version)).toBe(false);
            expect(xdriveSettingsProblems({ service: 'Dropbox' }, { side: 'outbound', version })).toEqual([]);
        }
    });

    it('refuses the same things on v26.9.30 as on 26.10', () => {
        const run = (settings: unknown, version: '26.9.30' | '26.10', side: 'inbound' | 'outbound' = 'outbound') =>
            xdriveSettingsProblems(settings, { side, runs: true, version }).map(problem => `${problem.kind} ${problem.field}`);
        for (const settings of [
            { service: 'Dropbox' },
            { service: 'local' },
            { service: 'Google Drive', remoteFolder: '1', secrets: ['a', 'b'] },
            { service: 'template', remoteFolder: 'x', template: {} },
            { remoteFolder: '/x', service: 'local', segmentBytes: -1 },
        ]) {
            for (const side of ['inbound', 'outbound'] as const) {
                expect(run(settings, '26.9.30', side)).toEqual(run(settings, '26.10', side));
            }
        }
        expect(run({ service: 'Dropbox' }, '26.9.30')).toHaveLength(1);
        const stream = { protocol: 'vless', streamSettings: { network: 'xdrive' } };
        expect(xdriveProblems(stream, 'outbound', '26.9.30').map(problem => problem.kind)).toEqual(['settings.missing']);
    });

    it('has a row for every field, covered by the key on the lines that drop it', () => {
        for (const key of ['remoteFolder', 'service', 'secrets', 'segmentBytes', 'template', 'holeTimeoutMs']) {
            expect(featureStatus('26.9', `outbound.xdriveSettings.${key}`)).toBe('absent');
            expect(featureStatus('26.9.30', `outbound.xdriveSettings.${key}`)).toBe('accepted');
            expect(featureStatus('26.10', `inbound.xdriveSettings.${key}`)).toBe('accepted');
        }
    });
});

describe('what the core accepts', () => {
    it('takes the three services as the source tests write them', () => {
        // v26.10.10:infra/conf/transport_test.go:295-356
        expect(kinds({ remoteFolder: '/tmp/xdrive', service: 'local' })).toEqual([]);
        expect(kinds({ remoteFolder: 'xdrive-root', service: 'template', secrets: ['user', 'pass'], template: TEMPLATE })).toEqual([]);
        expect(kinds({ remoteFolder: '1AbC', service: 'Google Drive', secrets: ['id', 'secret', 'token'] })).toEqual([]);
    });

    it('takes the tuning numbers as whole numbers, 0 included', () => {
        expect(kinds({ service: 'local', remoteFolder: '/x', segmentBytes: 0, concurrency: 64, holeTimeoutMs: 4294967295 })).toEqual([]);
    });
});

describe('what Build() refuses', () => {
    it('is any service but the three, compared exactly', () => {
        expect(kinds({ remoteFolder: '/x', service: 'Dropbox' })).toEqual([`service ${at}.service`]);
        expect(kinds({ remoteFolder: '/x', service: 'google drive', secrets: ['a', 'b', 'c'] })).toEqual([`service ${at}.service`]);
        expect(kinds({ remoteFolder: '/x', service: 'Local' })).toEqual([`service ${at}.service`]);
        expect(kinds({ remoteFolder: '/x' })).toEqual([`service ${at}.service`]);
        expect(kinds({ remoteFolder: '/x', service: '' })).toEqual([`service ${at}.service`]);
    });

    it('points at the spelling that was meant', () => {
        const [problem] = xdriveSettingsProblems({ service: 'googledrive' }, { side: 'outbound', version: '26.10' });
        expect(problem!.suggestion).toContain('"Google Drive"');
        expect(problem!.message).toContain('v26.10.10');
        const [unknown] = xdriveSettingsProblems({ service: 'Dropbox' }, { side: 'outbound', version: '26.10' });
        expect(unknown!.suggestion).toBeUndefined();
    });

    it('is Google Drive without exactly three secrets', () => {
        expect(kinds({ remoteFolder: 'f', service: 'Google Drive' })).toEqual([`secrets.count ${at}.secrets`]);
        expect(kinds({ remoteFolder: 'f', service: 'Google Drive', secrets: ['a', 'b'] })).toEqual([`secrets.count ${at}.secrets`]);
        expect(kinds({ remoteFolder: 'f', service: 'Google Drive', secrets: ['a', 'b', 'c', 'd'] })).toEqual([`secrets.count ${at}.secrets`]);
    });

    it('is template without a template, though null passes it (and the store refuses that)', () => {
        expect(kinds({ remoteFolder: 'f', service: 'template' })).toEqual([`template.missing ${at}.template`]);
        expect(kinds({ remoteFolder: 'f', service: 'template', template: null })).toEqual([`template.type ${at}.template`]);
        expect(kinds({ remoteFolder: 'f', service: 'template', template: null }, 'outbound', false)).toEqual([]);
    });

    it('is checked on a leftover too, since Build() runs whenever the key is there', () => {
        expect(kinds({ service: 'Dropbox' }, 'outbound', false)).toEqual([`service ${at}.service`]);
        // …but a leftover never builds a store.
        expect(kinds({ service: 'local' }, 'outbound', false)).toEqual([]);
    });
});

describe('what the decode refuses', () => {
    it('is a wrong JSON type anywhere in the struct', () => {
        expect(kinds('local')).toEqual([`type ${at}`]);
        expect(kinds(['local'])).toEqual([`type ${at}`]);
        expect(kinds({ service: 5, remoteFolder: '/x' })).toEqual([`type ${at}.service`]);
        expect(kinds({ service: 'local', remoteFolder: ['/x'] })).toEqual([`type ${at}.remoteFolder`]);
        expect(kinds({ service: 'Google Drive', secrets: 'a,b,c' })).toEqual([`type ${at}.secrets`]);
        expect(kinds({ service: 'Google Drive', secrets: ['a', 2, 'c'] })).toEqual([`type ${at}.secrets`]);
        for (const bad of [-1, 1.5, '100', 4294967296, true]) {
            expect(kinds({ service: 'local', remoteFolder: '/x', segmentBytes: bad })).toEqual([`type ${at}.segmentBytes`]);
        }
    });

    it('lets null through, as encoding/json does', () => {
        expect(kinds({ service: 'local', remoteFolder: '/x', secrets: null, concurrency: null })).toEqual([]);
    });
});

describe('what building the store refuses', () => {
    it('is a local or Google Drive store without a folder', () => {
        expect(kinds({ service: 'local' })).toEqual([`remoteFolder ${at}.remoteFolder`]);
        expect(kinds({ service: 'Google Drive', secrets: ['a', 'b', 'c'] })).toEqual([`remoteFolder ${at}.remoteFolder`]);
    });

    it('is an empty Google Drive secret, each named', () => {
        expect(kinds({ service: 'Google Drive', remoteFolder: 'f', secrets: ['a', '', null] }))
            .toEqual([`secrets.empty ${at}.secrets[1]`, `secrets.empty ${at}.secrets[2]`]);
    });

    it('says which side pays', () => {
        const [inbound] = xdriveSettingsProblems({ service: 'local' }, { side: 'inbound', version: '26.10' });
        const [outbound] = xdriveSettingsProblems({ service: 'local' }, { side: 'outbound', version: '26.10' });
        expect(inbound!.message).toContain('does not start');
        expect(outbound!.message).toContain('Every connection');
    });

    it('is a template that is not an object, or holds a key of the wrong type', () => {
        const run = (template: unknown) => kinds({ service: 'template', remoteFolder: 'f', template });
        expect(run('{"put": {}}')).toEqual([`template.type ${at}.template`]);
        expect(run([TEMPLATE])).toEqual([`template.type ${at}.template`]);
        expect(run({ ...TEMPLATE, flatten: 'yes' })).toEqual([`template.type ${at}.template.flatten`]);
        expect(run({ ...TEMPLATE, concurrency: 1.5 })).toEqual([`template.type ${at}.template.concurrency`]);
        expect(run({ ...TEMPLATE, put: { ...TEMPLATE.put, headers: { A: 1 } } })).toEqual([`template.type ${at}.template.put.headers`]);
        expect(run({ ...TEMPLATE, retry: { status: ['429'] } })).toEqual([`template.type ${at}.template.retry.status`]);
        expect(run({ ...TEMPLATE, auth: 'basic' })).toEqual([`template.type ${at}.template.auth`]);
        // Keys the struct does not have are skipped, as the decoder skips them.
        expect(run({ ...TEMPLATE, comment: 5 })).toEqual([]);
    });

    it('is a template without the four operations', () => {
        const { put: _put, delete: _delete, ...rest } = TEMPLATE;
        expect(kinds({ service: 'template', remoteFolder: 'f', template: rest }))
            .toEqual([`template.operation ${at}.template.put.url`, `template.operation ${at}.template.delete.url`]);
        expect(kinds({ service: 'template', remoteFolder: 'f', template: { ...TEMPLATE, get: { method: 'GET', url: '' } } }))
            .toEqual([`template.operation ${at}.template.get.url`]);
    });

    it('is a list without a names pattern, or with one that captures nothing', () => {
        const run = (namesRegex?: string) =>
            kinds({ service: 'template', remoteFolder: 'f', template: { ...TEMPLATE, list: { ...TEMPLATE.list, namesRegex } } });
        expect(run(undefined)).toEqual([`template.namesRegex ${at}.template.list.namesRegex`]);
        expect(run('')).toEqual([`template.namesRegex ${at}.template.list.namesRegex`]);
        expect(run('<d:href>[^<]+</d:href>')).toEqual([`template.namesRegex ${at}.template.list.namesRegex`]);
        expect(run('(?:a)b')).toEqual([`template.namesRegex ${at}.template.list.namesRegex`]);
        expect(run('"name":"(?<name>[^"]+)"')).toEqual([]);
        // RE2 syntax JavaScript cannot compile is not judged.
        expect(run('(?i)<href>')).toEqual([]);
    });

    it('is an auth type the template does not know, on every request', () => {
        const run = (type: string) => kinds({ service: 'template', remoteFolder: 'f', template: { ...TEMPLATE, auth: { type } } });
        for (const type of ['', 'none', 'static', 'oauth2', 'basic']) expect(run(type)).toEqual([]);
        expect(run('bearer')).toEqual([`template.auth ${at}.template.auth.type`]);
        expect(run('Basic')).toEqual([`template.auth ${at}.template.auth.type`]);
    });

    it('does not need a folder for a template, which only fills {folder} with it', () => {
        expect(kinds({ service: 'template', template: TEMPLATE })).toEqual([]);
    });
});

describe('an inbound or outbound', () => {
    const outbound = (stream: unknown) => ({ protocol: 'vless', streamSettings: stream });

    it('on network xdrive with no settings has no service', () => {
        const problems = xdriveProblems(outbound({ network: 'xdrive' }), 'outbound', '26.10');
        expect(problems.map(problem => problem.kind)).toEqual(['settings.missing']);
        // `method` decides the transport on 26.10 too.
        expect(xdriveProblems(outbound({ network: 'ws', method: 'xdrive' }), 'outbound', '26.10')).toHaveLength(1);
    });

    it('on another network is held only to what Build() checks', () => {
        expect(xdriveProblems(outbound({ network: 'ws', xdriveSettings: { service: 'local' } }), 'outbound', '26.10')).toEqual([]);
        expect(xdriveProblems(outbound({ network: 'ws', xdriveSettings: { service: 'x' } }), 'outbound', '26.10')).toHaveLength(1);
        expect(xdriveProblems(outbound({ network: 'ws' }), 'outbound', '26.10')).toEqual([]);
    });

    it('is not asked of a line without xdrive, or of anything that is not an endpoint', () => {
        expect(xdriveProblems(outbound({ network: 'xdrive' }), 'outbound', '26.9')).toEqual([]);
        expect(xdriveProblems(null, 'outbound', '26.10')).toEqual([]);
        expect(xdriveProblems({ protocol: 'freedom' }, 'outbound', '26.10')).toEqual([]);
    });

    it('reaches the diagnostics as critical, on v26.9.30 and 26.10', () => {
        const config = {
            inbounds: [{ tag: 'in', protocol: 'vless', port: 443, settings: { clients: [] }, streamSettings: { network: 'xdrive', xdriveSettings: { service: 'local' } } }],
            outbounds: [{ tag: 'out', protocol: 'vless', streamSettings: { network: 'xdrive', xdriveSettings: { service: 'Dropbox', remoteFolder: '/x' } } }],
        };
        const found = (version: '26.9' | '26.10') =>
            runFullDiagnostics(config as any, [], version).filter(d => d.field?.startsWith('streamSettings.xdriveSettings.'));
        expect(found('26.10').map(d => [d.section, d.itemIndex, d.field, d.severity])).toEqual([
            ['inbounds', 0, `${at}.remoteFolder`, 'critical'],
            ['outbounds', 0, `${at}.service`, 'critical'],
        ]);
        expect(found('26.9').filter(d => d.severity === 'critical')).toEqual([]);
        const same = (version: '26.9.30') => runFullDiagnostics(config as any, [], version).filter(d => d.field?.startsWith('streamSettings.xdriveSettings.'));
        expect(same('26.9.30').map(d => [d.section, d.itemIndex, d.field, d.severity])).toEqual(found('26.10').map(d => [d.section, d.itemIndex, d.field, d.severity]));
    });
});

describe('the service list', () => {
    it('is spelled as Build() compares it', () => {
        expect([...XDRIVE_SERVICES]).toEqual(['local', 'Google Drive', 'template']);
    });

    it('counts capture groups only where JavaScript can say', () => {
        expect(captureGroups('a(b)(c)')).toBe(2);
        expect(captureGroups('a(?:b)')).toBe(0);
        expect(captureGroups('(?P<n>x)')).toBeNull();
    });
});
