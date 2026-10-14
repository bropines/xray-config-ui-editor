/**
 * What an xdrive transport has to hold before a core will load and run it.
 *
 * xdrive (26.10) carries a connection as files: each side writes what it sends
 * into a shared store and polls the store for what the other side wrote. The
 * store is a `service` — a local folder, a Google Drive folder, or any HTTP
 * file API described by a `template` (v26.10.10:transport/internet/xdrive/storage.go:35-48).
 * Its settings are `streamSettings.xdriveSettings`, `XDriveConfig`
 * (v26.10.10:infra/conf/transport_method.go:969-982), and a core checks them
 * at two moments:
 *
 *   load   `XDriveConfig.Build()` (transport_method.go:985-998) — the config
 *          does not load. It is called whenever the key is there, whatever
 *          `network` says (v26.10.10:infra/conf/transport_internet.go:211-220),
 *          so a leftover one that is wrong stops the config all the same.
 *          Before Build, the decode: every key has to be the JSON type the
 *          struct reads, or the whole document fails
 *          (v26.10.10:infra/conf/serial/loader.go:57-70).
 *   start  the store is built when the transport is first used: by `Serve`
 *          when an inbound starts listening (v26.10.10:transport/internet/xdrive/xdrive.go:123-132),
 *          and by `Dial` for each connection an outbound opens (:80-89). A
 *          store that cannot be built is an inbound that does not start, or
 *          an outbound every connection through which fails. Only asked when
 *          the transport actually runs xdrive.
 *
 * What Build() refuses:
 *
 *   service             anything but `local`, `Google Drive` and `template`,
 *                       compared exactly — case and space included — and an
 *                       empty or absent one: "unsupported service" (:996-997)
 *   Google Drive        `secrets` that are not exactly three (:988-991)
 *   template            no `template` at all (:992-995). `null` is four bytes of
 *                       RawMessage and passes; the store refuses it later.
 *
 * What building the store refuses:
 *
 *   local               an empty `remoteFolder` (xdrive/local.go:20-22)
 *   Google Drive        an empty `remoteFolder` — the folder's id — and an
 *                       empty secret (xdrive/drive.go:62-72)
 *   template            a `template` that does not decode into the template
 *                       struct (xdrive/template.go:19-54 for its shape, :70-73
 *                       for the decode), any of put, get, list and delete
 *                       without a url (:74-76), a list without `namesRegex`
 *                       (:77-79), and one with no capture group (:84-86)
 *   network xdrive      with no `xdriveSettings` at all, the transport gets an
 *                       empty config (v26.10.10:transport/internet/config.go:38-44
 *                       and :67-77) and the store answers "unsupported service: "
 *                       (xdrive/storage.go:46-47)
 *
 * And on every request: an `auth.type` other than none, static, oauth2 and
 * basic ("" counts as none) fails each one (xdrive/template.go:162-185).
 *
 * Not checked: `namesRegex` is compiled by Go's regexp (template.go:80-83),
 * whose language is not JavaScript's; the capture-group count is only asked
 * of a pattern JavaScript compiles too. The eight tuning numbers are only type
 * checked — 0 means the default, and one past its cap is quietly capped
 * (xdrive/params.go:30-52).
 *
 * Every finding is critical. A line that does not register xdrive is answered
 * by the version table alone (the network is refused there, the key is
 * dropped), so this returns nothing for it.
 */

import { t } from '../../i18n';
import { LATEST_CORE_VERSION, coreVersion, type CoreVersionId } from './versions';
import { featureStatus } from './versions/features';
import { effectiveNetwork } from './transport-networks';

export type XDriveSide = 'inbound' | 'outbound';

/** The three stores Build() knows, spelled the way it compares them. */
export const XDRIVE_SERVICES = ['local', 'Google Drive', 'template'] as const;
export type XDriveService = (typeof XDRIVE_SERVICES)[number];

/** `auth.type` values the template store switches on; "" is none. */
export const XDRIVE_AUTH_TYPES = ['none', 'static', 'oauth2', 'basic'] as const;

/**
 * The tuning numbers, all `uint32`, with what 0 stands for and where the store
 * caps them (v26.10.10:transport/internet/xdrive/params.go:5-17).
 */
export const XDRIVE_NUMBERS = [
    { key: 'segmentBytes', fallback: 512 * 1024, cap: 16 * 1024 * 1024 },
    { key: 'flushIntervalMs', fallback: 20 },
    { key: 'pollIntervalMs', fallback: 50 },
    { key: 'maxPollIntervalMs', fallback: 500 },
    { key: 'eagerWindowMs', fallback: 2000 },
    { key: 'holeTimeoutMs', fallback: 30000 },
    { key: 'sessionTtlSeconds', fallback: 300 },
    { key: 'concurrency', fallback: 8, cap: 64 },
] as const satisfies readonly { key: string; fallback: number; cap?: number }[];

export type XDriveNumberKey = (typeof XDRIVE_NUMBERS)[number]['key'];

export interface XDriveProblem {
    kind: string;
    /** From the inbound or outbound down: `streamSettings.xdriveSettings.secrets[1]`. */
    field: string;
    message: string;
    suggestion?: string;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Unset as the decoder sees it: absent or `null`. */
const unset = (value: unknown): boolean => value === undefined || value === null;

const UINT32_MAX = 4294967295;
const isUint32 = (value: unknown): boolean =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;

/** Whether a line registers xdrive at all — the version table's answer. */
export const lineHasXDrive = (version: CoreVersionId): boolean =>
    featureStatus(version, 'outbound.xdriveSettings') === 'accepted';

const shorten = (value: unknown): string => {
    let out: string;
    try {
        out = JSON.stringify(value) ?? String(value);
    } catch {
        out = String(value);
    }
    return out.length > 48 ? `${out.slice(0, 47)}…` : out;
};

// ── Wording ───────────────────────────────────────────────────────────

/** The same sentence masque.ts uses for a decode failure, so it is translated once. */
const wrongType = (what: string, held: unknown, expected: string, tag: string): string =>
    t("{what} holds {value}, but Xray {tag} reads {expected} there — it cannot read the config until that is fixed.", {
        what, value: shorten(held), expected, tag,
    });

const refused = (tag: string): string => t("Xray {tag} refuses the config.", { tag });

/** What a store that cannot be built costs, on each side. */
const notBuilt = (side: XDriveSide, tag: string): string =>
    side === 'inbound'
        ? t("The inbound does not start on Xray {tag}.", { tag })
        : t("Every connection through this outbound fails on Xray {tag}.", { tag });

// ── The template ──────────────────────────────────────────────────────

/** A JSON type the template struct decodes a key as. */
type Shape = 'string' | 'bool' | 'int' | 'string-map' | 'int-list' | { [key: string]: Shape };

/** `opTemplate` (v26.10.10:transport/internet/xdrive/template.go:30-36). */
const OPERATION: Shape = { method: 'string', url: 'string', headers: 'string-map', body: 'string', namesRegex: 'string' };

/** `storageTemplate` with `authTemplate` and `retryTemplate` inside it (template.go:19-54). */
const TEMPLATE: { [key: string]: Shape } = {
    flatten: 'bool',
    concurrency: 'int',
    auth: {
        type: 'string', header: 'string-map', username: 'string', password: 'string',
        tokenUrl: 'string', form: 'string-map', tokenPath: 'string', expiryPath: 'string',
    },
    put: OPERATION,
    get: OPERATION,
    delete: OPERATION,
    list: OPERATION,
    retry: { status: 'int-list', rateReason: 'string' },
};

const OPERATIONS = ['put', 'get', 'list', 'delete'] as const;

const expectedText = (shape: Shape): string => {
    if (typeof shape === 'object') return t("an object");
    switch (shape) {
        case 'string': return t("text");
        case 'bool': return t("true or false");
        case 'int': return t("a whole number");
        case 'string-map': return t("an object of text values");
        case 'int-list': return t("a list of whole numbers");
    }
};

/**
 * Where `value` does not decode as `shape`, as `[path, value, shape]`.
 * A JSON null decodes into anything as its zero value, and a key the struct
 * does not have is skipped, which is what encoding/json does.
 */
const typeMismatches = (value: unknown, shape: Shape, path: string): [string, unknown, Shape][] => {
    if (unset(value)) return [];
    if (typeof shape === 'object') {
        if (!isObject(value)) return [[path, value, shape]];
        return Object.entries(shape).flatMap(([key, inner]) => typeMismatches(value[key], inner, `${path}.${key}`));
    }
    const fits = (() => {
        switch (shape) {
            case 'string': return typeof value === 'string';
            case 'bool': return typeof value === 'boolean';
            case 'int': return typeof value === 'number' && Number.isInteger(value);
            case 'string-map': return isObject(value) && Object.values(value).every(entry => unset(entry) || typeof entry === 'string');
            case 'int-list': return Array.isArray(value) && value.every(entry => unset(entry) || (typeof entry === 'number' && Number.isInteger(entry)));
        }
    })();
    return fits ? [] : [[path, value, shape]];
};

/**
 * How many capture groups a pattern has, when JavaScript can compile it; null
 * when it cannot — Go's RE2 and JavaScript disagree on enough syntax that a
 * pattern JavaScript refuses says nothing about what Go does with it.
 */
export const captureGroups = (pattern: string): number | null => {
    try {
        return (new RegExp(`${pattern}|`).exec('')?.length ?? 1) - 1;
    } catch {
        return null;
    }
};

const templateProblems = (template: unknown, at: string, side: XDriveSide, tag: string): XDriveProblem[] => {
    const out: XDriveProblem[] = [];
    const push = (kind: string, field: string, message: string, suggestion?: string) =>
        out.push({ kind, field, message, suggestion });

    if (!isObject(template)) {
        push(
            'template.type', at,
            `${t("{what} holds {value}, which the template service cannot read as a template object.", { what: at, value: shorten(template) })} ${notBuilt(side, tag)}`,
        );
        return out;
    }

    const mismatches = Object.entries(TEMPLATE).flatMap(([key, shape]) => typeMismatches(template[key], shape, `${at}.${key}`));
    for (const [field, held, shape] of mismatches) {
        push(
            'template.type', field,
            `${t("{what} holds {value}, but the template reads {expected} there.", { what: field, value: shorten(held), expected: expectedText(shape) })} ${notBuilt(side, tag)}`,
        );
    }
    // The decode stops the store before anything below is looked at.
    if (mismatches.length > 0) return out;

    for (const operation of OPERATIONS) {
        const op = isObject(template[operation]) ? template[operation] as Json : {};
        if (typeof op.url === 'string' && op.url !== '') continue;
        push(
            'template.operation', `${at}.${operation}.url`,
            `${t("{what} is empty, and the template needs a url for each of put, get, list and delete.", { what: `${at}.${operation}.url` })} ${notBuilt(side, tag)}`,
        );
    }

    const list = isObject(template.list) ? template.list : {};
    const names = typeof list.namesRegex === 'string' ? list.namesRegex : '';
    if (names === '') {
        push(
            'template.namesRegex', `${at}.list.namesRegex`,
            `${t("{what} is empty, and the template reads the file names out of a list response with it.", { what: `${at}.list.namesRegex` })} ${notBuilt(side, tag)}`,
        );
    } else if (captureGroups(names) === 0) {
        push(
            'template.namesRegex', `${at}.list.namesRegex`,
            `${t("{what} has no capture group, and the template takes each file name from the first one.", { what: `${at}.list.namesRegex` })} ${notBuilt(side, tag)}`,
            t("Put the part that is the name in parentheses, like {example}.", { example: '<d:href>/folder/([^<]+)</d:href>' }),
        );
    }

    const auth = isObject(template.auth) ? template.auth : {};
    if (typeof auth.type === 'string' && auth.type !== '' && !(XDRIVE_AUTH_TYPES as readonly string[]).includes(auth.type)) {
        push(
            'template.auth', `${at}.auth.type`,
            `${t("{what} is \"{value}\": the template knows none, static, oauth2 and basic.", { what: `${at}.auth.type`, value: auth.type })} ${t("Every request to the drive fails on Xray {tag}, so nothing gets through.", { tag })}`,
        );
    }
    return out;
};

// ── xdriveSettings ────────────────────────────────────────────────────

/**
 * Everything about `xdriveSettings` that the core refuses.
 *
 * `runs` says whether the transport actually runs xdrive: without it only the
 * decode and Build() are asked, because a store is never built from a
 * leftover. The option named at says where the object sits, for the field paths.
 */
export const xdriveSettingsProblems = (
    settings: unknown,
    {
        side,
        runs = true,
        at = 'streamSettings.xdriveSettings',
        version = LATEST_CORE_VERSION,
    }: { side: XDriveSide; runs?: boolean; at?: string; version?: CoreVersionId },
): XDriveProblem[] => {
    if (!lineHasXDrive(version)) return [];
    const { tag } = coreVersion(version);
    const out: XDriveProblem[] = [];
    const push = (kind: string, field: string, message: string, suggestion?: string) =>
        out.push({ kind, field: field ? `${at}.${field}` : at, message, suggestion });

    if (unset(settings)) {
        if (runs) {
            push('settings.missing', '', `${t("The xdrive transport has no xdriveSettings, so it has no service to use.")} ${notBuilt(side, tag)}`);
        }
        return out;
    }

    // ── the decode: a wrong JSON type fails the whole document ──────────
    if (!isObject(settings)) {
        push('type', '', wrongType(at, settings, t("an object"), tag));
        return out;
    }
    let decodes = true;
    for (const key of ['service', 'remoteFolder'] as const) {
        if (!unset(settings[key]) && typeof settings[key] !== 'string') {
            push('type', key, wrongType(`${at}.${key}`, settings[key], t("text"), tag));
            decodes = false;
        }
    }
    const secrets = settings.secrets;
    if (!unset(secrets) && (!Array.isArray(secrets) || secrets.some(entry => !unset(entry) && typeof entry !== 'string'))) {
        push('type', 'secrets', wrongType(`${at}.secrets`, secrets, t("a list of text"), tag));
        decodes = false;
    }
    for (const { key } of XDRIVE_NUMBERS) {
        if (!unset(settings[key]) && !isUint32(settings[key])) {
            push('type', key, wrongType(`${at}.${key}`, settings[key], t("a whole number from 0 to 4294967295"), tag));
            decodes = false;
        }
    }
    if (!decodes) return out;

    // ── Build() ─────────────────────────────────────────────────────────
    const service = typeof settings.service === 'string' ? settings.service : '';
    const secretList: unknown[] = Array.isArray(secrets) ? secrets : [];
    const template = settings.template;

    if (service === '') {
        push('service', 'service', `${t("{what} is not set: the xdrive transport needs a service — local, Google Drive or template.", { what: `${at}.service` })} ${refused(tag)}`);
        return out;
    }
    if (!(XDRIVE_SERVICES as readonly string[]).includes(service)) {
        const meant = XDRIVE_SERVICES.find(known => known.toLowerCase().replace(/\s+/g, '') === service.toLowerCase().replace(/\s+/g, ''));
        push(
            'service', 'service',
            `${t("{what} is \"{value}\": the services are local, Google Drive and template, written exactly so.", { what: `${at}.service`, value: service })} ${refused(tag)}`,
            meant ? t("Write it as \"{service}\".", { service: meant }) : undefined,
        );
        return out;
    }
    if (service === 'Google Drive' && secretList.length !== 3) {
        push(
            'secrets.count', 'secrets',
            `${t("{what} holds {count} entries, and Google Drive takes exactly three: the client ID, the client secret and the refresh token, in that order.", { what: `${at}.secrets`, count: secretList.length })} ${refused(tag)}`,
        );
        return out;
    }
    if (service === 'template' && template === undefined) {
        push('template.missing', 'template', `${t("{what} is not set, and the template service is built from it.", { what: `${at}.template` })} ${refused(tag)}`);
        return out;
    }

    // ── the store, built when the transport is used ─────────────────────
    if (!runs) return out;
    const folder = typeof settings.remoteFolder === 'string' ? settings.remoteFolder : '';
    if (service === 'local' && folder === '') {
        push('remoteFolder', 'remoteFolder', `${t("{what} is empty, and the local service needs the folder its files go in.", { what: `${at}.remoteFolder` })} ${notBuilt(side, tag)}`);
    }
    if (service === 'Google Drive') {
        if (folder === '') {
            push('remoteFolder', 'remoteFolder', `${t("{what} is empty, and Google Drive needs the id of the folder its files go in.", { what: `${at}.remoteFolder` })} ${notBuilt(side, tag)}`);
        }
        secretList.forEach((secret, index) => {
            if (typeof secret === 'string' && secret !== '') return;
            push('secrets.empty', `secrets[${index}]`, `${t("{what} is empty, and Google Drive needs all three secrets.", { what: `${at}.secrets[${index}]` })} ${notBuilt(side, tag)}`);
        });
    }
    if (service === 'template') out.push(...templateProblems(template, `${at}.template`, side, tag));
    return out;
};

/**
 * Every xdrive refusal for one inbound or outbound: its settings, whenever
 * they are there, and the store, when its transport runs xdrive.
 */
export const xdriveProblems = (
    item: unknown,
    side: XDriveSide,
    version: CoreVersionId = LATEST_CORE_VERSION,
): XDriveProblem[] => {
    if (!isObject(item) || !lineHasXDrive(version)) return [];
    const stream = isObject(item.streamSettings) ? item.streamSettings : undefined;
    if (!stream) return [];
    const runs = effectiveNetwork(stream, version) === 'xdrive';
    if (!runs && unset(stream.xdriveSettings)) return [];
    return xdriveSettingsProblems(stream.xdriveSettings, { side, runs, version });
};
