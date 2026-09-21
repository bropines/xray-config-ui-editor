// ============================================================
// Applying one change to many inbounds or outbounds
// ============================================================

import type { Inbound, Outbound } from '../types';
import type { EndpointDirection } from '../generators/endpoint-factory';

/**
 * Editing thirty nodes one modal at a time is how a config ends up with
 * twenty-nine of them on the new transport. This applies one change across a
 * selection — but never blindly: every operation reports what it would change
 * and what it would skip, so the caller can show that before touching
 * anything.
 *
 * Skipping matters as much as changing. Setting `network: ws` on a WireGuard
 * outbound or sniffing on a TUN inbound produces a config the core will not
 * run, so those are refused with a reason rather than written and discovered
 * later.
 */
export type Endpoint = Inbound | Outbound;

export interface BatchPatch {
    /** Transport, e.g. `tcp`, `ws`, `grpc`. */
    network?: string;
    /** Security layer, e.g. `none`, `tls`, `reality`. */
    security?: string;
    /** Prepended to every tag. */
    tagPrefix?: string;
    /** Appended to every tag. */
    tagSuffix?: string;
    /** Inbounds: turn sniffing on or off. */
    sniffing?: boolean;
    /** Inbounds: the first port; subsequent items step up by `portStep`. */
    port?: number;
    portStep?: number;
    /** Outbounds: enable Mux and set its concurrency. */
    mux?: boolean;
    muxConcurrency?: number;
    /** Outbounds: route through another outbound. */
    dialerProxy?: string;
    /** Outbounds: domain resolution strategy. */
    targetStrategy?: string;
    /** Anything else, as a dotted path into the object. */
    set?: { path: string; value: unknown }[];
}

export interface BatchChange {
    index: number;
    tag: string;
    /** Human-readable `field: old → new` lines. */
    fields: string[];
}

export interface BatchSkip {
    index: number;
    tag: string;
    field: string;
    reason: string;
}

export interface BatchResult<T extends Endpoint = Endpoint> {
    /** The full list with the patch applied — the input is never mutated. */
    items: T[];
    changes: BatchChange[];
    skipped: BatchSkip[];
}

/** Protocols that carry no streamSettings at all. */
const NO_TRANSPORT = new Set(['wireguard', 'tun', 'dns', 'blackhole', 'freedom', 'loopback']);

/** Protocols that do not sniff: they have no inbound stream to inspect. */
const NO_SNIFFING = new Set(['tun', 'wireguard']);

/** Protocols with no listening port of their own. */
const NO_PORT = new Set(['tun']);

const clone = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

const setPath = (target: any, path: string, value: unknown): void => {
    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) return;
    let node = target;
    for (const part of parts.slice(0, -1)) {
        if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
        node = node[part];
    }
    const last = parts[parts.length - 1]!;
    if (value === undefined) delete node[last];
    else node[last] = value;
};

const getPath = (target: any, path: string): unknown =>
    path.split('.').filter(Boolean).reduce((node, part) => (node == null ? node : node[part]), target);

const describe = (value: unknown): string => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'object') return Array.isArray(value) ? `[${value.length}]` : '{…}';
    return String(value);
};

/**
 * Applies `patch` to the endpoints at `selection`.
 *
 * `selection` holds indexes into `items`, so the result can be written straight
 * back over the original array and positions — which routing order depends on
 * — are preserved.
 */
export const applyBatch = <T extends Endpoint>(
    items: T[],
    selection: Iterable<number>,
    direction: EndpointDirection,
    patch: BatchPatch,
): BatchResult<T> => {
    const indexes = [...new Set([...selection])].filter(i => i >= 0 && i < items.length).sort((a, b) => a - b);
    const next = items.map(item => clone(item)) as T[];
    const changes: BatchChange[] = [];
    const skipped: BatchSkip[] = [];

    indexes.forEach((index, position) => {
        const item: any = next[index];
        const protocol = String(item?.protocol || '');
        const originalTag = String(item?.tag ?? '');
        const fields: string[] = [];

        const note = (field: string, before: unknown, after: unknown) => {
            if (describe(before) === describe(after)) return;
            fields.push(`${field}: ${describe(before)} → ${describe(after)}`);
        };
        const skip = (field: string, reason: string) =>
            skipped.push({ index, tag: originalTag, field, reason });

        // ── Transport ───────────────────────────────────────────────────────
        if (patch.network !== undefined || patch.security !== undefined) {
            if (NO_TRANSPORT.has(protocol)) {
                skip('streamSettings', `${protocol} carries no transport settings`);
            } else {
                if (!item.streamSettings) item.streamSettings = {};
                if (patch.network !== undefined) {
                    note('network', item.streamSettings.network, patch.network);
                    item.streamSettings.network = patch.network;
                }
                if (patch.security !== undefined) {
                    note('security', item.streamSettings.security, patch.security);
                    item.streamSettings.security = patch.security;
                }
            }
        }

        // ── Tag ─────────────────────────────────────────────────────────────
        if (patch.tagPrefix || patch.tagSuffix) {
            const tagged = `${patch.tagPrefix ?? ''}${originalTag}${patch.tagSuffix ?? ''}`;
            note('tag', originalTag, tagged);
            item.tag = tagged;
        }

        // ── Inbound-only ────────────────────────────────────────────────────
        if (patch.sniffing !== undefined) {
            if (direction !== 'inbound') {
                skip('sniffing', 'sniffing belongs to inbounds');
            } else if (NO_SNIFFING.has(protocol)) {
                skip('sniffing', `${protocol} has nothing to sniff`);
            } else {
                const before = item.sniffing?.enabled;
                item.sniffing = {
                    destOverride: item.sniffing?.destOverride ?? ['http', 'tls'],
                    ...item.sniffing,
                    enabled: patch.sniffing,
                };
                note('sniffing', before, patch.sniffing);
            }
        }

        if (patch.port !== undefined) {
            if (direction !== 'inbound') {
                skip('port', 'an outbound has no listening port');
            } else if (NO_PORT.has(protocol)) {
                skip('port', `${protocol} does not listen on a port`);
            } else {
                // Stepping keeps a renumbered block free of collisions, which
                // is the only reason to renumber several at once.
                const assigned = patch.port + (patch.portStep ?? 0) * position;
                note('port', item.port, assigned);
                item.port = assigned;
            }
        }

        // ── Outbound-only ───────────────────────────────────────────────────
        if (patch.mux !== undefined) {
            if (direction !== 'outbound') {
                skip('mux', 'Mux belongs to outbounds');
            } else {
                const before = item.mux?.enabled;
                item.mux = { ...item.mux, enabled: patch.mux };
                if (patch.muxConcurrency !== undefined) item.mux.concurrency = patch.muxConcurrency;
                note('mux', before, patch.mux);
            }
        }

        if (patch.dialerProxy !== undefined) {
            if (direction !== 'outbound') {
                skip('dialerProxy', 'chaining belongs to outbounds');
            } else if (patch.dialerProxy === originalTag) {
                // An outbound dialling itself is a loop the core will not run.
                skip('dialerProxy', 'an outbound cannot dial through itself');
            } else if (NO_TRANSPORT.has(protocol)) {
                skip('dialerProxy', `${protocol} carries no transport settings`);
            } else {
                if (!item.streamSettings) item.streamSettings = {};
                if (!item.streamSettings.sockopt) item.streamSettings.sockopt = {};
                const before = item.streamSettings.sockopt.dialerProxy;
                item.streamSettings.sockopt.dialerProxy = patch.dialerProxy || undefined;
                note('dialerProxy', before, patch.dialerProxy || undefined);
            }
        }

        if (patch.targetStrategy !== undefined) {
            if (direction !== 'outbound') {
                skip('targetStrategy', 'target resolution belongs to outbounds');
            } else {
                note('targetStrategy', item.targetStrategy, patch.targetStrategy);
                item.targetStrategy = patch.targetStrategy;
            }
        }

        // ── Free-form paths ─────────────────────────────────────────────────
        for (const entry of patch.set ?? []) {
            const before = getPath(item, entry.path);
            setPath(item, entry.path, entry.value);
            note(entry.path, before, entry.value);
        }

        if (fields.length > 0) {
            changes.push({ index, tag: originalTag, fields });
        }
    });

    return { items: next, changes, skipped };
};

/** Whether a patch asks for anything at all. */
export const isEmptyPatch = (patch: BatchPatch): boolean =>
    Object.entries(patch).every(([key, value]) => {
        if (key === 'set') return !(value as unknown[])?.length;
        if (key === 'portStep' || key === 'muxConcurrency') return true; // modifiers, not changes
        return value === undefined || value === '';
    });
