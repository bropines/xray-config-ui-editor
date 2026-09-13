import { describe, it, expect } from 'bun:test';
import {
    hostToDraft,
    emptyHostDraft,
    buildHostPatch,
    buildHostCreate,
    hostDraftMissing,
    normaliseHostTag,
} from './host-payload';

const apiHost = (over: any = {}) => ({
    uuid: 'host-1',
    remark: '🇳🇱 ⚡ Нидерланды',
    address: '203.0.113.10',
    port: 443,
    sni: null,
    host: null,
    path: null,
    alpn: null,
    fingerprint: 'firefox',
    securityLayer: 'DEFAULT',
    tag: 'NLMAIN',
    isDisabled: false,
    isHidden: false,
    allowInsecure: false,
    inbound: { configProfileUuid: 'profile-1', configProfileInboundUuid: 'inbound-1' },
    xrayJsonTemplateUuid: null,
    // Fields this editor does not know about — they must survive untouched.
    internalSquads: { mode: 'ALL', squads: [] },
    mapper: { something: true },
    ...over,
});

describe('hostToDraft', () => {
    it('flattens the API shape into form fields', () => {
        expect(hostToDraft(apiHost())).toEqual({
            uuid: 'host-1',
            remark: '🇳🇱 ⚡ Нидерланды',
            address: '203.0.113.10',
            port: 443,
            sni: '',
            host: '',
            path: '',
            alpn: '',
            fingerprint: 'firefox',
            securityLayer: 'DEFAULT',
            tag: 'NLMAIN',
            isDisabled: false,
            isHidden: false,
            allowInsecure: false,
            inboundUuid: 'inbound-1',
            profileUuid: 'profile-1',
            xrayJsonTemplateUuid: '',
        });
    });

    it('reads a tag from either the singular or the array field', () => {
        expect(hostToDraft(apiHost({ tag: undefined, tags: ['FIMAIN'] })).tag).toBe('FIMAIN');
    });
});

describe('buildHostPatch — only what changed', () => {
    const original = hostToDraft(apiHost());

    it('returns null when nothing changed', () => {
        expect(buildHostPatch({ ...original }, original)).toBeNull();
    });

    it('sends one field, plus the uuid, for a one-field edit', () => {
        const patch = buildHostPatch({ ...original, address: '198.51.100.5' }, original);
        expect(patch).toEqual({ uuid: 'host-1', address: '198.51.100.5' });
    });

    it('never sends fields this editor does not manage', () => {
        const patch = buildHostPatch({ ...original, remark: 'renamed' }, original)!;
        expect(Object.keys(patch).sort()).toEqual(['remark', 'uuid']);
        expect(JSON.stringify(patch)).not.toContain('internalSquads');
        expect(JSON.stringify(patch)).not.toContain('mapper');
    });

    it('clears an optional field with an explicit null, not by omitting it', () => {
        const withSni = hostToDraft(apiHost({ sni: 'cdn.example.net' }));
        const patch = buildHostPatch({ ...withSni, sni: '' }, withSni);
        expect(patch).toEqual({ uuid: 'host-1', sni: null });
    });

    it('writes a tag under both names, normalised', () => {
        const patch = buildHostPatch({ ...original, tag: 'fi main' }, original);
        expect(patch).toEqual({ uuid: 'host-1', tag: 'FIMAIN', tags: ['FIMAIN'] });
    });

    it('clears a tag with null and an empty array', () => {
        const patch = buildHostPatch({ ...original, tag: '' }, original);
        expect(patch).toEqual({ uuid: 'host-1', tag: null, tags: [] });
    });

    it('sends the inbound as a pair, and only when it actually moved', () => {
        expect(buildHostPatch({ ...original, inboundUuid: 'inbound-2' }, original)).toEqual({
            uuid: 'host-1',
            inbound: { configProfileUuid: 'profile-1', configProfileInboundUuid: 'inbound-2' },
        });
        // A half-filled inbound is not a move — it would unbind the host.
        expect(buildHostPatch({ ...original, inboundUuid: '' }, original)).toBeNull();
    });

    it('attaches and detaches a template', () => {
        expect(buildHostPatch({ ...original, xrayJsonTemplateUuid: 'tpl-1' }, original))
            .toEqual({ uuid: 'host-1', xrayJsonTemplateUuid: 'tpl-1' });

        const attached = hostToDraft(apiHost({ xrayJsonTemplateUuid: 'tpl-1' }));
        expect(buildHostPatch({ ...attached, xrayJsonTemplateUuid: '' }, attached))
            .toEqual({ uuid: 'host-1', xrayJsonTemplateUuid: null });
    });

    it('carries the toggles', () => {
        const patch = buildHostPatch({ ...original, isHidden: true, isDisabled: true }, original);
        expect(patch).toEqual({ uuid: 'host-1', isHidden: true, isDisabled: true });
    });
});

describe('buildHostCreate', () => {
    it('builds a complete body with nulls for the fields left empty', () => {
        const draft = {
            ...emptyHostDraft(),
            remark: ' Amsterdam ',
            address: ' 203.0.113.10 ',
            port: 8443,
            fingerprint: 'chrome',
            tag: 'nl main',
            profileUuid: 'profile-1',
            inboundUuid: 'inbound-1',
        };
        expect(buildHostCreate(draft)).toEqual({
            inbound: { configProfileUuid: 'profile-1', configProfileInboundUuid: 'inbound-1' },
            remark: 'Amsterdam',
            address: '203.0.113.10',
            port: 8443,
            sni: null,
            host: null,
            path: null,
            alpn: null,
            fingerprint: 'chrome',
            securityLayer: 'DEFAULT',
            isDisabled: false,
            isHidden: false,
            allowInsecure: false,
            tag: 'NLMAIN',
            tags: ['NLMAIN'],
        });
    });

    it('omits the tag and the template when they are not set', () => {
        const body = buildHostCreate({ ...emptyHostDraft(), remark: 'x', address: 'a', profileUuid: 'p', inboundUuid: 'i' });
        expect('tag' in body).toBe(false);
        expect('xrayJsonTemplateUuid' in body).toBe(false);
    });
});

describe('validation helpers', () => {
    it('names every field the panel would reject the host for', () => {
        expect(hostDraftMissing(emptyHostDraft())).toEqual(['remark', 'address', 'inbound']);
        expect(hostDraftMissing({ ...emptyHostDraft(), remark: 'r', address: 'a', profileUuid: 'p', inboundUuid: 'i' })).toEqual([]);
    });

    it('normalises a tag to what the panel accepts', () => {
        expect(normaliseHostTag('nl main')).toBe('NLMAIN');
        expect(normaliseHostTag('ru:exit-1')).toBe('RU:EXIT1');
        expect(normaliseHostTag('  ')).toBe('');
        expect(normaliseHostTag('x'.repeat(50)).length).toBe(36);
    });
});
