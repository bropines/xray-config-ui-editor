/**
 * Business logic for FinalmaskEditor: what the chosen core line offers for
 * each mask and for quicParams, what the config already holds that the line
 * refuses or ignores, and the edits — add/remove/move a layer, change or
 * convert its type, set or clear one setting, edit noise items, put a
 * ready-made noise list (core/presets/noise) into the UDP chain.
 *
 * `finalmask` is a whole-object value and `onChange` replaces it wholesale
 * (no store path), so this does not fit the path-based useField model.
 *
 * What a line takes comes from core/xray/versions/finalmask-rules.ts; nothing
 * here decides it. A value the config holds is never dropped or rewritten
 * because the line refuses it — it is shown with its status, and removing or
 * converting it is the user's call.
 */
import { useMemo } from 'react';
import { useCoreVersion } from './useCoreVersion';
import {
    finalmaskIssues,
    FINALMASK_PATH,
    isNoiseExpItem,
    maskKeyStatus,
    maskTypeChoices,
    maskTypeStatus,
    noiseItemTypeAccepted,
    noiseItemTypeChoices,
    offeredMaskKeys,
    offeredQuicKeys,
    quicKeyStatus,
    toMkcpLegacy,
    type FinalmaskIssue,
    type KeyStatus,
    type MaskKey,
    type MaskList,
    type MaskSide,
    type MaskTypeStatus,
} from '../core/xray/versions/finalmask-rules';
import type { CoreVersionId } from '../core/xray/versions';
import {
    getNoisePresets,
    matchNoisePreset,
    withNoisePreset,
    type NoisePreset,
    type NoisePresetId,
} from '../core/presets/noise';

export type FinalmaskNetType = MaskList;

/** A key the config holds that the form does not draw as a field. */
export interface ExtraKey {
    key: string;
    value: unknown;
    /** Unset for the settings of a type the line refuses — the type says it all. */
    status?: KeyStatus;
}

export interface LayerView {
    index: number;
    type: string;
    settings: Record<string, unknown>;
    typeStatus: MaskTypeStatus;
    /** Types the chooser lists; always includes the current one. */
    typeOptions: string[];
    /** Set when the line refuses the type and mkcp-legacy builds the same thing. */
    convertible: boolean;
    fields: MaskKey[];
    extras: ExtraKey[];
    issues: FinalmaskIssue[];
}

export interface ChainView {
    list: MaskList;
    layers: LayerView[];
    /** Issues about the list as a whole. */
    issues: FinalmaskIssue[];
}

export interface NoisePresetsView {
    /** Empty when the line has no UDP noise mask to put them in. */
    presets: NoisePreset[];
    /** The preset the chain's noise layer holds now, if it holds one exactly. */
    active: NoisePresetId | null;
}

export interface QuicView {
    value: Record<string, unknown>;
    fields: MaskKey[];
    extras: ExtraKey[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const RANK: Record<FinalmaskIssue['severity'], number> = { info: 0, warning: 1, critical: 2 };

/**
 * Issues for a side nobody told us. Direction-specific findings (which xdns
 * list a side reads, udphop on a server) would be guesses, so only what both
 * sides agree on is kept, at the graver of the two severities.
 */
const issuesForEitherSide = (finalmask: unknown, version: CoreVersionId): FinalmaskIssue[] => {
    const inbound = finalmaskIssues(finalmask, version, 'inbound');
    const outbound = finalmaskIssues(finalmask, version, 'outbound');
    return inbound.flatMap(issue => {
        const twin = outbound.find(other => other.path === issue.path && other.message === issue.message);
        if (!twin) return [];
        return [RANK[twin.severity] > RANK[issue.severity] ? twin : issue];
    });
};

/** `udp[1]` owns `udp[1]` and `udp[1].settings.x`, not `udp[10]`. */
const belongsTo = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}.`);

/** What a new mask starts with. Noise without an item is useless, so it gets one. */
const defaultSettings = (type: string): Json =>
    type === 'noise' ? { noise: [{ rand: '40-70', delay: '5-10' }] } : {};

/** An empty value is written as no key at all: the core's default, not `""`. */
const isEmptyValue = (value: unknown) =>
    value === undefined || value === '' || value === false || (Array.isArray(value) && value.length === 0);

export function useFinalmaskEditor(finalmask: any, onChange: (v: any) => void, side?: MaskSide) {
    const { version, tag } = useCoreVersion();
    const enabled = !!finalmask;

    const masksOf = (list: MaskList): unknown[] =>
        isObject(finalmask) && Array.isArray(finalmask[list]) ? finalmask[list] as unknown[] : [];

    const issues = useMemo(
        () => (side ? finalmaskIssues(finalmask, version, side) : issuesForEitherSide(finalmask, version)),
        [finalmask, version, side],
    );

    const layerView = (list: MaskList, mask: unknown, index: number): LayerView => {
        const type = isObject(mask) && typeof mask.type === 'string' ? mask.type : '';
        const settings = isObject(mask) && isObject(mask.settings) ? mask.settings : {};
        const typeStatus = maskTypeStatus(version, list, type, side);
        const fields = typeStatus.accepted ? offeredMaskKeys(version, list, type, side) : [];
        const drawn = new Set(fields.map(spec => spec.key));
        const extras = Object.keys(settings)
            .filter(key => !drawn.has(key))
            .map(key => ({
                key,
                value: settings[key],
                ...(typeStatus.accepted ? { status: maskKeyStatus(version, list, type, key, side) } : {}),
            }));
        const at = `${FINALMASK_PATH}.${list}[${index}]`;
        return {
            index,
            type,
            settings,
            typeStatus,
            typeOptions: maskTypeChoices(version, list, side, type),
            convertible: !typeStatus.accepted && list === 'udp' && toMkcpLegacy(type, settings) !== null,
            fields,
            extras,
            issues: issues.filter(issue => belongsTo(issue.path, at)),
        };
    };

    const chains: ChainView[] = (['udp', 'tcp'] as const).map(list => ({
        list,
        layers: masksOf(list).map((mask, index) => layerView(list, mask, index)),
        issues: issues.filter(issue => issue.path === `${FINALMASK_PATH}.${list}`),
    }));

    const quicValue: Json = isObject(finalmask) && isObject(finalmask.quicParams) ? finalmask.quicParams : {};
    const quicFields = offeredQuicKeys(version);
    const quicDrawn = new Set(quicFields.map(spec => spec.key));
    const quic: QuicView = {
        value: quicValue,
        fields: quicFields,
        extras: Object.keys(quicValue)
            .filter(key => !quicDrawn.has(key))
            .map(key => ({ key, value: quicValue[key], status: quicKeyStatus(version, key, side) })),
    };

    // ── Edits ───────────────────────────────────────────────────────────

    const base = (): Json => (isObject(finalmask) ? finalmask : {});

    const writeList = (list: MaskList, next: unknown[]) => onChange({ ...base(), [list]: next });

    const enable = () => onChange({});
    const remove = () => onChange(null);

    const addLayer = (list: MaskList) => {
        // The first type the line offers here — noise for UDP, as it always
        // has been, since it is the one every line has and the WARP presets use.
        const choices = maskTypeChoices(version, list, side);
        const type = list === 'udp' && choices.includes('noise') ? 'noise' : choices[0] ?? '';
        writeList(list, [...masksOf(list), { type, settings: defaultSettings(type) }]);
    };

    const removeLayer = (list: MaskList, index: number) => {
        const next = [...masksOf(list)];
        next.splice(index, 1);
        writeList(list, next);
    };

    /** Order is meaning here: which end a mask sits at decides whether it runs. */
    const moveLayer = (list: MaskList, index: number, by: -1 | 1) => {
        const next = [...masksOf(list)];
        const target = index + by;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        writeList(list, next);
    };

    const changeType = (list: MaskList, index: number, type: string) => {
        const next = [...masksOf(list)];
        next[index] = { type, settings: defaultSettings(type) };
        writeList(list, next);
    };

    /** Replace a removed 26.3 mask with the mkcp-legacy mask that builds the same thing. */
    const convertLayer = (list: MaskList, index: number) => {
        const next = [...masksOf(list)];
        const mask = next[index];
        const converted = isObject(mask) && typeof mask.type === 'string' ? toMkcpLegacy(mask.type, mask.settings) : null;
        if (!converted) return;
        next[index] = converted;
        writeList(list, next);
    };

    const setSetting = (list: MaskList, index: number, key: string, value: unknown) => {
        const next = [...masksOf(list)];
        const mask = isObject(next[index]) ? next[index] as Json : {};
        const settings: Json = { ...(isObject(mask.settings) ? mask.settings : {}) };
        if (isEmptyValue(value)) delete settings[key];
        else settings[key] = value;
        next[index] = { ...mask, settings };
        writeList(list, next);
    };

    /**
     * Several settings in one write.
     *
     * `setSetting` reads the mask out of the `finalmask` prop, so two calls in
     * one event handler both start from the value before either of them — the
     * second silently discards the first. Anything changing more than one key
     * at a time (the generator writes `noise` and `reset` together) has to go
     * through here instead.
     */
    const patchSettings = (list: MaskList, index: number, patch: Record<string, unknown>) => {
        const next = [...masksOf(list)];
        const mask = isObject(next[index]) ? next[index] as Json : {};
        const settings: Json = { ...(isObject(mask.settings) ? mask.settings : {}) };
        for (const [key, value] of Object.entries(patch)) {
            if (isEmptyValue(value)) delete settings[key];
            else settings[key] = value;
        }
        next[index] = { ...mask, settings };
        writeList(list, next);
    };

    // Noise items keep every key they came with (randRange, a WARP preset's
    // packet type): only the field being edited changes.
    const noiseItems = (list: MaskList, index: number): Json[] => {
        const mask = masksOf(list)[index];
        const items = isObject(mask) && isObject(mask.settings) ? mask.settings.noise : undefined;
        return Array.isArray(items) ? items.map(item => (isObject(item) ? item : {})) : [];
    };

    const addNoiseItem = (list: MaskList, index: number) =>
        setSetting(list, index, 'noise', [...noiseItems(list, index), { rand: '40-70', delay: '5-15' }]);

    const updateNoiseItem = (list: MaskList, index: number, item: number, patch: Json) => {
        const items = noiseItems(list, index);
        const updated: Json = { ...items[item], ...patch };
        for (const key of Object.keys(patch)) if (patch[key] === undefined) delete updated[key];
        items[item] = updated;
        setSetting(list, index, 'noise', items);
    };

    const removeNoiseItem = (list: MaskList, index: number, item: number) => {
        const items = noiseItems(list, index);
        items.splice(item, 1);
        setSetting(list, index, 'noise', items);
    };

    /**
     * The packet encodings the item chooser lists, the one the item holds
     * included — a refused one stays on screen, marked, rather than turning
     * into a different value in the box.
     */
    const noiseTypeOptions = (held: unknown): { value: string; refused: boolean }[] =>
        noiseItemTypeChoices(version, held).map(value => ({ value, refused: !noiseItemTypeAccepted(version, value) }));

    /**
     * The generator rebuilds the whole list from hex packets and junk, so
     * applying it over a list with an item written as an expression (26.10's
     * `exp`) would turn that item into hex nonsense. It stays off until the
     * expression is gone; every other edit leaves the item as it was.
     */
    const generatorBlocked = (list: MaskList, index: number) => noiseItems(list, index).some(isNoiseExpItem);

    // Ready-made noise: into the noise layer the chain has, or a new one by
    // the socket — the placement lives with the presets, not here.
    const noiseOffered = maskTypeStatus(version, 'udp', 'noise', side).accepted;
    const firstNoise = masksOf('udp').find(mask => isObject(mask) && typeof mask.type === 'string' && mask.type.toLowerCase() === 'noise');
    const noisePresets: NoisePresetsView = {
        presets: noiseOffered ? getNoisePresets() : [],
        active: isObject(firstNoise) && isObject(firstNoise.settings) ? matchNoisePreset(firstNoise.settings.noise) : null,
    };
    const applyNoisePreset = (id: NoisePresetId) => onChange(withNoisePreset(finalmask, id, version));

    /** A cleared quicParams key is removed, and an empty quicParams with it. */
    const setQuic = (key: string, value: unknown) => {
        const quicParams: Json = { ...quicValue };
        if (isEmptyValue(value)) delete quicParams[key];
        else quicParams[key] = value;
        const next: Json = { ...base() };
        if (Object.keys(quicParams).length === 0) delete next.quicParams;
        else next.quicParams = quicParams;
        onChange(next);
    };

    return {
        version,
        tag,
        side,
        enabled,
        chains,
        quic,
        enable,
        remove,
        addLayer,
        removeLayer,
        moveLayer,
        changeType,
        convertLayer,
        setSetting,
        patchSettings,
        addNoiseItem,
        updateNoiseItem,
        removeNoiseItem,
        noiseTypeOptions,
        generatorBlocked,
        noisePresets,
        applyNoisePreset,
        setQuic,
    };
}
