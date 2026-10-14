/**
 * What the chosen core does with one inbound, as the inbound editor shows it.
 *
 * The diagnostics panel already reports every feature a config uses that a
 * line refuses or ignores. The editor is where those get fixed, so it asks the
 * same table the same question for the inbound in front of it — and pairs
 * each answer with the one action that fixes it: take the key out, or move a
 * 26.7-only spelling onto the one every line reads.
 *
 * Not everything a core refuses is a key or a value in that table. A
 * WireGuard inbound with no secret key is refused for what is missing, and
 * those come from core/xray/wireguard-inbound.ts, which the diagnostics read
 * too — an inbound the factory had just built used to pass through here
 * without a word while every supported core would have refused it.
 *
 * Transport keys (`streamSettings.*`) are left to the transport editor, which
 * draws them.
 */
import type { Inbound } from '../../../core/types';
import { CORE_VERSIONS, type CoreVersionId } from '../../../core/xray/versions';
import type { CoreFeature, CoreValueSet, FeatureStatus } from '../../../core/xray/versions/features';
import { acceptsValue, featureUses, valueUses } from '../../../core/xray/versions/check';
import { spellingConflicts, spellingForPath, type SpellingPair } from '../../../core/generators/endpoint-factory';
import { wireguardInboundProblems } from '../../../core/xray/wireguard-inbound';
import { shadowsocksInboundProblems } from '../../../core/xray/shadowsocks-inbound';

/** What a core refuses an inbound for lacking or getting wrong — the shape both problem modules share. */
export interface InboundProblem {
    kind: string;
    field: string;
    message: string;
    suggestion?: string;
}

export type InboundNote =
    /**
     * Something the core refuses that is not one key or one value — a
     * WireGuard inbound with no secret key, a peer with no public key, a
     * Shadowsocks cipher the line does not know. The words come from where
     * the diagnostics get theirs, so the two agree.
     */
    | { kind: 'problem'; problem: InboundProblem }
    /** Both spellings set: the alias is ignored on every line. */
    | { kind: 'conflict'; pair: SpellingPair; keyEmpty: boolean }
    | {
        kind: 'feature';
        feature: CoreFeature;
        status: Exclude<FeatureStatus, 'accepted'>;
        /** The same answer on every supported line — "does nothing anywhere". */
        everywhere: boolean;
        /** `adopt` moves a 26.7-only spelling onto the one every line reads. */
        action: 'remove' | 'adopt' | 'none';
        pair?: SpellingPair;
    }
    | { kind: 'value'; set: CoreValueSet; value: string };

const isTransportPath = (path: string) => path.startsWith('streamSettings');

/** Worst first: what stops the config loading, then what silently does nothing. */
const rankOf = (note: InboundNote): number => {
    switch (note.kind) {
        case 'problem':
            return 0;
        case 'feature':
            return note.status === 'rejected' ? 0 : note.status === 'absent' ? 2 : 3;
        case 'value':
            return note.set.outside === 'rejected' ? 0 : 2;
        case 'conflict':
            return 1;
    }
};

export const inboundNotes = (inbound: Inbound, version: CoreVersionId): InboundNote[] => {
    if (!inbound || typeof inbound !== 'object') return [];
    const config = { inbounds: [inbound] };
    const notes: InboundNote[] = [];

    // First in the list as well as in rank: nothing below matters while the
    // inbound cannot be built at all.
    for (const problem of wireguardInboundProblems(inbound, version)) {
        notes.push({ kind: 'problem', problem });
    }
    for (const problem of shadowsocksInboundProblems(inbound, version)) {
        notes.push({ kind: 'problem', problem });
    }

    const conflicts = spellingConflicts(inbound);
    const settings = (inbound.settings ?? {}) as Record<string, unknown>;
    for (const pair of conflicts) {
        const key = settings[pair.key];
        notes.push({ kind: 'conflict', pair, keyEmpty: Array.isArray(key) && key.length === 0 });
    }

    const seen = new Set<string>();
    for (const { feature } of featureUses(config)) {
        const status = feature.status[version];
        if (status === 'accepted' || isTransportPath(feature.path)) continue;
        // One note per place, whichever row matched it first.
        const place = `${feature.path}=${feature.value ?? ''}`;
        if (seen.has(place)) continue;
        seen.add(place);

        const pair = spellingForPath(inbound, feature.path);
        if (pair && conflicts.includes(pair)) continue;
        notes.push({
            kind: 'feature',
            feature,
            status,
            everywhere: CORE_VERSIONS.every(line => feature.status[line.id] === status),
            action: pair ? 'adopt' : feature.path === 'protocol' ? 'none' : 'remove',
            pair,
        });
    }

    for (const use of valueUses(config)) {
        if (isTransportPath(use.set.path) || acceptsValue(use.set, version, use.value)) continue;
        notes.push({ kind: 'value', set: use.set, value: use.value });
    }

    return notes
        .map((note, index) => ({ note, index }))
        .sort((a, b) => rankOf(a.note) - rankOf(b.note) || a.index - b.index)
        .map(({ note }) => note);
};

/**
 * `node` without the key a feature path names.
 *
 * `[]` walks every element of an array, the way the feature table's paths do:
 * `settings.clients[].password` drops `password` from each client. The top
 * level comes back as a new object, and so does everything on the way down —
 * editor state is immutable.
 */
export const withoutPath = (node: unknown, path: string): unknown => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
    const dot = path.indexOf('.');
    const head = dot === -1 ? path : path.slice(0, dot);
    const rest = dot === -1 ? '' : path.slice(dot + 1);
    const object = node as Record<string, unknown>;

    const each = /^([^[]+)\[\]$/.exec(head);
    if (each) {
        const key = each[1]!;
        const list = object[key];
        if (!Array.isArray(list) || !rest) return node;
        return { ...object, [key]: list.map(element => withoutPath(element, rest)) };
    }
    if (!(head in object)) return node;
    if (!rest) {
        const { [head]: _removed, ...others } = object;
        return others;
    }
    return { ...object, [head]: withoutPath(object[head], rest) };
};

/** The top-level inbound key a feature path starts at: `settings.clients[].x` → `settings`. */
export const topKeyOf = (path: string): string => path.split('.')[0]!.replace(/\[.*$/, '');
