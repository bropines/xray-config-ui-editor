import React from 'react';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { JsonInput } from '../../ui/JsonInput';
import { NumberInput } from '../../ui/NumberInput';
import { Select, type SelectOption } from '../../ui/Select';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { VersionKeyNotice } from './NetworkSection';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    XDRIVE_NUMBERS,
    XDRIVE_SERVICES,
    xdriveSettingsProblems,
    type XDriveNumberKey,
    type XDriveProblem,
    type XDriveService,
} from '../../../core/xray/xdrive';
import { t } from '../../../i18n';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isHeld = (value: unknown): boolean => value !== undefined && value !== null;

/** A copy of `source` with `key` set, or removed when `value` says nothing. */
const withKey = (source: Json, key: string, value: unknown): Json => {
    const next = { ...source };
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete next[key];
    else next[key] = value;
    return next;
};

const orUndefined = (settings: Json): Json | undefined => (Object.keys(settings).length > 0 ? settings : undefined);

/** Where the editor's problems are said to be: relative to the stream settings. */
const AT = 'xdriveSettings';

const FieldProblems = ({ problems }: { problems: XDriveProblem[] }) => (
    <>
        {problems.map((problem, index) => (
            <p key={`${problem.field}-${index}`} className="text-[10px] text-rose-400 mt-1 leading-snug break-words" data-xdrive-problem={problem.kind}>
                {problem.message}
                {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
            </p>
        ))}
    </>
);

/**
 * A held value of a type the struct does not decode, for a key that is not an
 * object (WrongTypeNotice speaks of objects and text): what the core says,
 * and the way out.
 */
const HeldWrongType = ({ problems, onRemove }: { problems: XDriveProblem[]; onRemove: () => void }) => (
    <div className="p-3 rounded-xl border space-y-2 bg-rose-950/20 border-rose-500/40" data-xdrive-wrong-type>
        <FieldProblems problems={problems} />
        <button
            type="button"
            onClick={onRemove}
            className="h-9 px-4 rounded-lg border bg-slate-950/40 text-[11px] font-bold transition-colors border-rose-500/40 text-rose-200 hover:border-rose-400"
        >
            {t("Remove it")}
        </button>
    </div>
);

const serviceDescription = (service: XDriveService): string => {
    switch (service) {
        case 'local': return t("A folder on this machine that both ends can reach");
        case 'Google Drive': return t("A Google Drive folder, signed in with an OAuth client");
        case 'template': return t("Any HTTP file API, described by a template");
    }
};

/** The three Build() knows, by the names it compares — never translated, since they are what the config holds. */
const serviceOptions = (): SelectOption[] =>
    XDRIVE_SERVICES.map(service => ({ value: service, label: service, description: serviceDescription(service) }));

const folderHelp = (service: string): string => {
    switch (service) {
        case 'local': return t("A folder path on this machine. Both ends have to see the same files, so it is a shared or synced folder; Xray creates it when it is missing.");
        case 'Google Drive': return t("The id of the Google Drive folder both ends use — the last part of the folder's address.");
        case 'template': return t("Put into the template wherever it says {folder}.");
        default: return t("Where the files go; what it means depends on the service.");
    }
};

const numberLabel = (key: XDriveNumberKey): string => {
    switch (key) {
        case 'segmentBytes': return t("Segment size (bytes)");
        case 'flushIntervalMs': return t("Flush interval (ms)");
        case 'pollIntervalMs': return t("Poll interval (ms)");
        case 'maxPollIntervalMs': return t("Longest poll interval (ms)");
        case 'eagerWindowMs': return t("Fast polling window (ms)");
        case 'holeTimeoutMs': return t("Missing segment timeout (ms)");
        case 'sessionTtlSeconds': return t("Session lifetime (s)");
        case 'concurrency': return t("Concurrent transfers");
    }
};

const numberHelp = (key: XDriveNumberKey, fallback: number, cap?: number): string => {
    switch (key) {
        case 'segmentBytes': return t("The largest piece of a stream written as one file. 0 or empty is {fallback}; Xray uses at most {cap}.", { fallback, cap });
        case 'flushIntervalMs': return t("How long data waits for more before a short piece is written anyway. 0 or empty is {fallback}.", { fallback });
        case 'pollIntervalMs': return t("How often the store is looked at for the other side's files while traffic flows. 0 or empty is {fallback}.", { fallback });
        case 'maxPollIntervalMs': return t("The longest wait between looks once the line is quiet; never shorter than the poll interval. 0 or empty is {fallback}.", { fallback });
        case 'eagerWindowMs': return t("How long after the last traffic polling stays at its fastest. 0 or empty is {fallback}.", { fallback });
        case 'holeTimeoutMs': return t("How long a missing piece is waited for while later ones have arrived, before the connection is given up. 0 or empty is {fallback}.", { fallback });
        case 'sessionTtlSeconds': return t("How long the listening side keeps a session nobody picks up or uses before removing its files. 0 or empty is {fallback}.", { fallback });
        case 'concurrency': return t("How many files are written or read at once. 0 or empty is {fallback}; Xray uses at most {cap}.", { fallback, cap });
    }
};

/**
 * `streamSettings.xdriveSettings` (26.10): which store carries the files, how
 * to reach it, and how often each side writes and polls it.
 *
 * Every key is typed the way `XDriveConfig` decodes it: two texts, a list of
 * texts, eight whole numbers and the template, which the struct keeps as raw
 * JSON and the store decodes into an object — so it is edited as JSON, the
 * honest shape for a description of someone's HTTP API. A value a config
 * already holds with the wrong type is shown and can be removed, not coerced;
 * a service this form does not offer is kept in the chooser, labelled with
 * why the core refuses it. The words beside the fields are core/xray/xdrive's,
 * which the diagnostics read too.
 */
export const XDriveSettingsEditor = ({ settings, onChange, isClient, protocol }: {
    /** Whatever the config holds — not necessarily an object. */
    settings: unknown;
    /** `undefined` removes the key. */
    onChange: (next: Json | undefined) => void;
    isClient: boolean;
    protocol?: string;
}) => {
    const { version, tag, statusAt, offersAt } = useCoreVersion();
    const side = isClient ? 'outbound' : 'inbound';
    const held = isHeld(settings);

    // A line that has never heard of the key drops it: say so, and offer the way out.
    if (!offersAt(side, 'streamSettings.xdriveSettings', protocol)) {
        return held ? (
            <div className="border-t border-slate-800/50 pt-4" data-xdrive-settings="unknown-line">
                <VersionKeyNotice
                    what="streamSettings.xdriveSettings"
                    status={statusAt(side, 'streamSettings.xdriveSettings', protocol)}
                    tag={tag}
                    actions={[{ label: t("Remove it"), onClick: () => onChange(undefined) }]}
                />
            </div>
        ) : null;
    }

    const wrongType = held && !isObject(settings);
    const value: Json = isObject(settings) ? settings : {};
    const problems = xdriveSettingsProblems(settings, { side, runs: true, at: AT, version });
    const problemsAt = (field: string) => problems.filter(problem => problem.field === `${AT}.${field}`);
    const problemsUnder = (field: string) => problems.filter(problem => problem.field.startsWith(`${AT}.${field}`));
    const set = (key: string, next: unknown) => onChange(orUndefined(withKey(value, key, next)));

    const service = typeof value.service === 'string' ? value.service : '';
    const options = serviceOptions();
    if (service !== '' && !options.some(option => option.value === service)) {
        // Shown, not offered: it is what the config holds, and the core refuses it.
        options.push({ value: service, label: service, description: problemsAt('service')[0]?.message, disabled: true });
    }

    const secrets: unknown[] = Array.isArray(value.secrets) ? value.secrets : [];
    const secretsWrongType = isHeld(value.secrets) && !Array.isArray(value.secrets);
    /**
     * The three Google Drive fields drop the key once all of them are empty;
     * a row of the list stays until its own remove button takes it, so
     * clearing a box to retype it does not take the row away.
     */
    const setSecret = (index: number, next: string, dropWhenEmpty: boolean) => {
        const list = [...secrets];
        while (list.length <= index) list.push('');
        list[index] = next;
        set('secrets', dropWhenEmpty && list.every(entry => entry === '' || entry === null) ? undefined : list);
    };
    const removeSecret = (index: number) => set('secrets', secrets.filter((_, at) => at !== index));
    const googleDrive = service === 'Google Drive' && secrets.length <= 3;
    const showSecretList = !googleDrive && (service === 'template' || service === 'Google Drive' || secrets.length > 0);
    const DRIVE_SECRETS = [t("Client ID"), t("Client secret"), t("Refresh token")];

    const showTemplate = service === 'template' || value.template !== undefined;
    // The struct keeps any JSON here, and only a template store decodes it —
    // into an object. Under that service anything else held, null included, is
    // shown with the way out and the box below is for the replacement; under
    // another it is inert JSON and shown as it is.
    const templateWrong = service === 'template' && value.template !== undefined && !isObject(value.template);
    const numbersHeld = XDRIVE_NUMBERS.filter(({ key }) => isHeld(value[key])).length;

    return (
        <div className="space-y-4 border-t border-slate-800/50 pt-4 animate-in fade-in" data-xdrive-settings>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400">{t("xdrive Settings")}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
                {t("xdrive carries a connection as files: each side writes what it sends into a shared store and polls the store for what the other side wrote. Both ends need the same store and the same settings.")}
            </p>

            {wrongType && (
                <WrongTypeNotice field="xdriveSettings" held={settings} onRemove={() => onChange(undefined)} />
            )}
            <FieldProblems problems={problems.filter(problem => problem.field === AT && problem.kind !== 'type')} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Select
                        label={t("Service")}
                        help={t("Where the files are kept. Written exactly as listed: Xray compares the name as it is, case and space included.")}
                        value={service}
                        placeholder={t("Pick a service")}
                        onChange={next => set('service', next)}
                        options={options}
                    />
                    <FieldProblems problems={problemsAt('service')} />
                </div>
                <div>
                    <label className="label-xs flex items-center gap-1">
                        {t("Remote folder")}
                        <Help>{folderHelp(service)}</Help>
                    </label>
                    <input
                        className="input-base font-mono"
                        aria-label={t("Remote folder")}
                        spellCheck={false}
                        placeholder={service === 'local' ? '/srv/xdrive' : service === 'Google Drive' ? '1AbCdEfGhIjKlMnOpQrStUvWxYz' : 'xdrive'}
                        value={typeof value.remoteFolder === 'string' ? value.remoteFolder : ''}
                        onChange={e => set('remoteFolder', e.target.value)}
                    />
                    <FieldProblems problems={problemsAt('remoteFolder')} />
                </div>
            </div>

            {/* ── Secrets ─────────────────────────────────────────────── */}
            {secretsWrongType && (
                <HeldWrongType problems={problemsAt('secrets')} onRemove={() => set('secrets', undefined)} />
            )}
            {!secretsWrongType && googleDrive && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-xdrive-secrets="google-drive">
                    {DRIVE_SECRETS.map((label, index) => (
                        <div key={label}>
                            <label className="label-xs">{label}</label>
                            <input
                                className="input-base font-mono"
                                aria-label={label}
                                autoComplete="off"
                                spellCheck={false}
                                value={typeof secrets[index] === 'string' ? secrets[index] as string : ''}
                                onChange={e => setSecret(index, e.target.value, true)}
                            />
                            <FieldProblems problems={problemsAt(`secrets[${index}]`)} />
                        </div>
                    ))}
                    <div className="md:col-span-3"><FieldProblems problems={problemsAt('secrets')} /></div>
                </div>
            )}
            {!secretsWrongType && showSecretList && (
                <div className="space-y-2" data-xdrive-secrets="list">
                    <label className="label-xs flex items-center gap-1">
                        {t("Secrets")}
                        <Help>{service === 'Google Drive'
                            ? t("Google Drive takes exactly three: the client ID, the client secret and the refresh token, in that order.")
                            : t("Each one is put into the template wherever it says {secret0}, {secret1} and so on, counting from 0.")}</Help>
                    </label>
                    {secrets.map((secret, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-slate-500 w-16 shrink-0">{`{secret${index}}`}</span>
                            <input
                                className="input-base font-mono flex-1 min-w-0"
                                aria-label={`secret${index}`}
                                autoComplete="off"
                                spellCheck={false}
                                value={typeof secret === 'string' ? secret : ''}
                                onChange={e => setSecret(index, e.target.value, false)}
                            />
                            <button
                                type="button"
                                onClick={() => removeSecret(index)}
                                className="h-9 w-9 shrink-0 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-rose-300 hover:border-rose-500/50 transition-colors flex items-center justify-center"
                                aria-label={t("Remove")}
                                title={t("Remove")}
                            >
                                <Icon name="Trash" />
                            </button>
                        </div>
                    ))}
                    <FieldProblems problems={problemsAt('secrets')} />
                    <button
                        type="button"
                        onClick={() => set('secrets', [...secrets, ''])}
                        className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors inline-flex items-center gap-1.5"
                    >
                        <Icon name="Plus" /> {t("Add a secret")}
                    </button>
                </div>
            )}

            {/* ── Template ────────────────────────────────────────────── */}
            {showTemplate && (
                <div data-xdrive-template>
                    <label className="label-xs flex items-center gap-1">
                        {t("Template")}
                        <Help>{t("The HTTP calls the store makes: put, get, list and delete, each with a method and a url, and list with a namesRegex whose first group is the file name. {folder}, {name}, {prefix} and {secret0}… are filled in; auth and retry are optional.")}</Help>
                    </label>
                    {templateWrong && (
                        <HeldWrongType problems={problemsAt('template')} onRemove={() => set('template', undefined)} />
                    )}
                    <JsonInput
                        value={templateWrong ? undefined : value.template}
                        expects={service === 'template' ? 'object' : 'any'}
                        // The shape to type, not prose: the same in every language.
                        placeholder={'{ "put": { "method": "PUT", "url": "https://dav.example/{folder}/{name}" }, … }'}
                        ariaLabel={t("Template")}
                        onChange={next => set('template', next)}
                    />
                    <FieldProblems problems={problemsUnder('template').filter(problem => !templateWrong || problem.field !== `${AT}.template`)} />
                </div>
            )}

            {/* ── Tuning ──────────────────────────────────────────────── */}
            <ExtendedSection
                title={t("Polling and writing")}
                description={t("How often each side looks at the store and how it writes to it. Empty is Xray's default.")}
                activeCount={numbersHeld}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-xdrive-numbers>
                    {XDRIVE_NUMBERS.map(entry => {
                        const current = value[entry.key];
                        const cap = 'cap' in entry ? entry.cap : undefined;
                        return (
                            <div key={entry.key}>
                                <label className="label-xs flex items-center gap-1">
                                    {numberLabel(entry.key)}
                                    <Help>{numberHelp(entry.key, entry.fallback, cap)}</Help>
                                </label>
                                {isHeld(current) && typeof current !== 'number' ? (
                                    <HeldWrongType problems={problemsAt(entry.key)} onRemove={() => set(entry.key, undefined)} />
                                ) : (
                                    <>
                                        <NumberInput
                                            placeholder={String(entry.fallback)}
                                            min={0}
                                            value={typeof current === 'number' ? current : undefined}
                                            onChange={next => set(entry.key, next)}
                                        />
                                        <FieldProblems problems={problemsAt(entry.key)} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ExtendedSection>
        </div>
    );
};
