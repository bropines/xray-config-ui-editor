// ============================================================
// Host payloads — src/core/generators/host-payload.ts
// ============================================================
//
// Turns a Remnawave host row into the flat set of fields a form edits, and
// back into the payload its API expects.
//
// Two things this exists to get right. First, PATCH is a partial update:
// sending the whole object back means every field this editor does not know
// about (squad assignments, mappers, per-node overrides someone set in the
// panel) would be rewritten with whatever we happened to read. So a patch
// carries only what actually changed. Second, cleared optional fields have to
// travel as explicit `null` rather than be omitted, or clearing an SNI would
// silently do nothing.
// ============================================================

import { HOST_SECURITY_LAYERS } from '../presets/host-fields';

/** The host fields this editor exposes, flattened out of the API shape. */
export interface HostDraft {
    uuid: string;
    remark: string;
    address: string;
    port: number | undefined;
    sni: string;
    host: string;
    path: string;
    alpn: string;
    fingerprint: string;
    securityLayer: string;
    tag: string;
    isDisabled: boolean;
    isHidden: boolean;
    allowInsecure: boolean;
    /** Config-profile inbound this host serves. */
    inboundUuid: string;
    profileUuid: string;
    /** XRAY_JSON template rendered for subscribers, if any. */
    xrayJsonTemplateUuid: string;
}

/** Panel tags: uppercase letters, digits, underscore and colon. */
export const normaliseHostTag = (tag: string): string =>
    (tag || '').trim().toUpperCase().replace(/[^A-Z0-9_:]/g, '').slice(0, 36);

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Read an API host row into the editable draft. */
export const hostToDraft = (host: any): HostDraft => ({
    uuid: str(host?.uuid),
    remark: str(host?.remark),
    address: str(host?.address),
    port: typeof host?.port === 'number' ? host.port : undefined,
    sni: str(host?.sni),
    host: str(host?.host),
    path: str(host?.path),
    alpn: str(host?.alpn),
    fingerprint: str(host?.fingerprint),
    securityLayer: str(host?.securityLayer) || HOST_SECURITY_LAYERS[0]!,
    // Older panels expose a single `tag`, newer ones an array; the editor
    // works with one tag either way.
    tag: str(host?.tag) || (Array.isArray(host?.tags) ? str(host.tags[0]) : ''),
    isDisabled: !!host?.isDisabled,
    isHidden: !!host?.isHidden,
    allowInsecure: !!host?.allowInsecure,
    inboundUuid: str(host?.inbound?.configProfileInboundUuid),
    profileUuid: str(host?.inbound?.configProfileUuid),
    xrayJsonTemplateUuid: str(host?.xrayJsonTemplateUuid),
});

/** An empty draft for the "create a host" form. */
export const emptyHostDraft = (): HostDraft => ({
    uuid: '',
    remark: '',
    address: '',
    port: 443,
    sni: '',
    host: '',
    path: '',
    alpn: '',
    fingerprint: '',
    securityLayer: HOST_SECURITY_LAYERS[0]!,
    tag: '',
    isDisabled: false,
    isHidden: false,
    allowInsecure: false,
    inboundUuid: '',
    profileUuid: '',
    xrayJsonTemplateUuid: '',
});

/** Fields a draft must fill before the panel will accept it. */
export const hostDraftMissing = (draft: HostDraft): string[] => {
    const missing: string[] = [];
    if (!draft.remark.trim()) missing.push('remark');
    if (!draft.address.trim()) missing.push('address');
    if (!draft.port) missing.push('port');
    if (!draft.inboundUuid || !draft.profileUuid) missing.push('inbound');
    return missing;
};

/** Optional text fields: empty means "clear it", which the API spells `null`. */
const optional = (value: string): string | null => (value.trim() === '' ? null : value.trim());

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * The PATCH body for the fields that differ between `draft` and `original`.
 * Returns null when nothing changed, so a caller can skip the request rather
 * than write an empty update.
 */
export const buildHostPatch = (draft: HostDraft, original: HostDraft): Record<string, unknown> | null => {
    const patch: Record<string, unknown> = {};

    if (draft.remark.trim() !== original.remark.trim()) patch.remark = draft.remark.trim();
    if (draft.address.trim() !== original.address.trim()) patch.address = draft.address.trim();
    if (draft.port !== original.port && draft.port) patch.port = draft.port;

    (['sni', 'host', 'path', 'alpn', 'fingerprint'] as const).forEach(field => {
        if (draft[field].trim() !== original[field].trim()) patch[field] = optional(draft[field]);
    });

    if (draft.securityLayer !== original.securityLayer) patch.securityLayer = draft.securityLayer;
    if (draft.isDisabled !== original.isDisabled) patch.isDisabled = draft.isDisabled;
    if (draft.isHidden !== original.isHidden) patch.isHidden = draft.isHidden;
    if (draft.allowInsecure !== original.allowInsecure) patch.allowInsecure = draft.allowInsecure;

    const tag = normaliseHostTag(draft.tag);
    if (tag !== normaliseHostTag(original.tag)) {
        // Sent under both names: panel versions disagree on which they read,
        // and each ignores the one it does not know.
        patch.tag = tag || null;
        patch.tags = tag ? [tag] : [];
    }

    if (draft.xrayJsonTemplateUuid !== original.xrayJsonTemplateUuid) {
        patch.xrayJsonTemplateUuid = draft.xrayJsonTemplateUuid || null;
    }

    const inbound = { configProfileUuid: draft.profileUuid, configProfileInboundUuid: draft.inboundUuid };
    const originalInbound = { configProfileUuid: original.profileUuid, configProfileInboundUuid: original.inboundUuid };
    if (draft.inboundUuid && draft.profileUuid && !sameValue(inbound, originalInbound)) {
        patch.inbound = inbound;
    }

    if (Object.keys(patch).length === 0) return null;
    return { uuid: draft.uuid, ...patch };
};

/** The POST body for a new host. */
export const buildHostCreate = (draft: HostDraft): Record<string, unknown> => {
    const tag = normaliseHostTag(draft.tag);
    return {
        inbound: {
            configProfileUuid: draft.profileUuid,
            configProfileInboundUuid: draft.inboundUuid,
        },
        remark: draft.remark.trim(),
        address: draft.address.trim(),
        port: draft.port,
        sni: optional(draft.sni),
        host: optional(draft.host),
        path: optional(draft.path),
        alpn: optional(draft.alpn),
        fingerprint: optional(draft.fingerprint),
        securityLayer: draft.securityLayer,
        isDisabled: draft.isDisabled,
        isHidden: draft.isHidden,
        allowInsecure: draft.allowInsecure,
        ...(tag ? { tag, tags: [tag] } : {}),
        ...(draft.xrayJsonTemplateUuid ? { xrayJsonTemplateUuid: draft.xrayJsonTemplateUuid } : {}),
    };
};
