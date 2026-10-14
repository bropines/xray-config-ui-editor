import React from 'react';
import { Switch } from '../../ui/Switch';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { JsonInput } from '../../ui/JsonInput';
import { ListTextInput } from '../../ui/ListTextInput';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { VersionKeyNotice } from './NetworkSection';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { masqueSettingsProblems } from '../../../core/xray/masque';
import { t } from '../../../i18n';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isHeld = (value: unknown): boolean => value !== undefined && value !== null;

/** A copy of `source` with `key` set, or removed when `value` says nothing. */
const withKey = (source: Json, key: string, value: unknown): Json => {
    const next = { ...source };
    const empty = value === undefined || value === null || value === ''
        || (Array.isArray(value) && value.length === 0)
        || (isObject(value) && Object.keys(value).length === 0 && key !== 'warp');
    if (empty) delete next[key];
    else next[key] = value;
    return next;
};

const orUndefined = (settings: Json): Json | undefined => (Object.keys(settings).length > 0 ? settings : undefined);

/** Keys that only the dialling side reads: the listener keeps `path` alone (v26.10.10:transport/internet/masque/hub.go:62). */
const CLIENT_KEYS = ['host', 'user', 'pass', 'headers', 'warp'] as const;

const FieldProblem = ({ message }: { message?: string }) =>
    message ? <p className="text-[10px] text-rose-400 mt-1 leading-snug">{message}</p> : null;

/**
 * `streamSettings.masqueSettings`: the HTTP request that carries the tunnel,
 * and — from 26.10 — the WARP identity that signs it.
 *
 * Every key is typed the way the core decodes it: four texts, an object of
 * texts for `headers`, an object for `warp` with two texts and a list. A value
 * a config already holds with the wrong type is shown and can be removed, not
 * coerced. What the line refuses, and what the loader would answer, comes from
 * core/xray/masque — the diagnostics use the same function.
 */
export const MasqueSettingsEditor = ({ settings, onChange, isClient, protocol }: {
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
    const wrongType = held && !isObject(settings);
    const value: Json = isObject(settings) ? settings : {};

    const lineKnowsIt = offersAt(side, 'streamSettings.masqueSettings', protocol);
    const offersWarp = offersAt(side, 'streamSettings.masqueSettings.warp', protocol);
    const problems = masqueSettingsProblems(isObject(settings) ? settings : undefined, 'masqueSettings', version);
    const problem = (key: string): string | undefined =>
        problems.find(entry => entry.field === `masqueSettings.${key}`)?.message;

    const set = (key: string, next: unknown) => onChange(orUndefined(withKey(value, key, next)));
    const warp = isObject(value.warp) ? value.warp : undefined;
    const warpWrongType = isHeld(value.warp) && !warp;
    const setWarp = (key: string, next: unknown) => {
        const merged = withKey(warp ?? {}, key, next);
        onChange(orUndefined({ ...value, warp: merged }));
    };

    const foreign = isClient ? [] : CLIENT_KEYS.filter(key => isHeld(value[key]));

    // A line that has never heard of the key drops it: say so, and offer the way out.
    if (!lineKnowsIt) {
        return held ? (
            <div className="border-t border-slate-800/50 pt-4" data-masque-settings="unknown-line">
                <VersionKeyNotice
                    what="streamSettings.masqueSettings"
                    status={statusAt(side, 'streamSettings.masqueSettings', protocol)}
                    tag={tag}
                    actions={[{ label: t("Remove it"), onClick: () => onChange(undefined) }]}
                />
            </div>
        ) : null;
    }

    const stringField = (key: 'host' | 'path' | 'user' | 'pass') => {
        const current = value[key];
        if (isHeld(current) && typeof current !== 'string') {
            return (
                <WrongTypeNotice
                    field={`masqueSettings.${key}`}
                    held={current}
                    expects="text"
                    onRemove={() => set(key, undefined)}
                />
            );
        }
        return null;
    };

    return (
        <div className="space-y-4 border-t border-slate-800/50 pt-4 animate-in fade-in" data-masque-settings>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400">{t("MASQUE Settings")}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
                {t("MASQUE carries IP packets inside an HTTP request. The TLS ALPN picks the carrier: h2 on its own runs it over HTTP/2 on TCP, anything else over HTTP/3 on QUIC (a server that lists both listens on both).")}
            </p>

            {wrongType && (
                <WrongTypeNotice field="masqueSettings" held={settings} onRemove={() => onChange(undefined)} />
            )}

            {foreign.length > 0 && (
                <div className="flex gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-950/20 text-[11px] text-amber-200/90">
                    <Icon name="Warning" weight="fill" className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                        <span className="font-mono font-bold">{foreign.join(', ')}</span>
                        {' — '}
                        {t("client-side fields on a server inbound. Xray never reads them here, so they change nothing. They are shown because they are in your config: clear them if they were copied in by mistake.")}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label-xs flex items-center gap-1">
                        {t("Path")}
                        <Help>{t("The request path, starting with a slash. target and ipproto can be used as variables, in braces. Empty uses the well-known path, or / for WARP.")}</Help>
                    </label>
                    <input
                        className="input-base font-mono"
                        placeholder="/.well-known/masque/ip/*/*/"
                        value={typeof value.path === 'string' ? value.path : ''}
                        onChange={e => set('path', e.target.value)}
                    />
                    <FieldProblem message={problem('path')} />
                    {stringField('path')}
                </div>

                {isClient && (
                    <div>
                        <label className="label-xs flex items-center gap-1">
                            {t("Host")}
                            <Help>{t("The authority of the request. Empty uses the TLS server name; with WARP it is cloudflareaccess.com.")}</Help>
                        </label>
                        <input
                            className="input-base font-mono"
                            placeholder={t("example.com")}
                            value={typeof value.host === 'string' ? value.host : ''}
                            onChange={e => set('host', e.target.value)}
                        />
                        <FieldProblem message={problem('host')} />
                        {stringField('host')}
                    </div>
                )}
            </div>

            {isClient && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-xs flex items-center gap-1">
                                {t("Username")}
                                <Help>{t("Sent as Basic credentials in the Authorization header. Cannot be combined with WARP, and cannot contain a colon.")}</Help>
                            </label>
                            <input
                                className="input-base"
                                value={typeof value.user === 'string' ? value.user : ''}
                                onChange={e => set('user', e.target.value)}
                            />
                            <FieldProblem message={problem('user')} />
                            {stringField('user')}
                        </div>
                        <div>
                            <label className="label-xs">{t("Password")}</label>
                            <input
                                className="input-base font-mono"
                                value={typeof value.pass === 'string' ? value.pass : ''}
                                onChange={e => set('pass', e.target.value)}
                            />
                            <FieldProblem message={problem('pass')} />
                            {stringField('pass')}
                        </div>
                    </div>

                    <div>
                        <label className="label-xs flex items-center gap-1">
                            {t("Headers")}
                            <Help>{t("Extra request headers, as an object of text values. Host and Capsule-Protocol are set by Xray and refused. User-Agent also takes chrome, firefox, safari, edge, curl or golang as shorthand.")}</Help>
                        </label>
                        <JsonInput
                            value={value.headers}
                            expects="string-map"
                            placeholder={'{ "User-Agent": "chrome" }'}
                            ariaLabel={t("Headers")}
                            onChange={next => set('headers', next)}
                        />
                        {problems.filter(entry => entry.field.startsWith('masqueSettings.headers')).map(entry => (
                            <FieldProblem key={entry.field} message={entry.message} />
                        ))}
                    </div>

                    {/* WARP: only where the line reads it; a held one on any other line is shown below. */}
                    {(offersWarp || isHeld(value.warp)) && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3" data-masque-warp>
                            {offersWarp ? (
                                <Switch
                                    checked={isHeld(value.warp)}
                                    onChange={checked => {
                                        const next = { ...value };
                                        if (checked) next.warp = warp ?? {};
                                        else delete next.warp;
                                        onChange(orUndefined(next));
                                    }}
                                    label={t("Connect to Cloudflare WARP")}
                                />
                            ) : (
                                <VersionKeyNotice
                                    what="streamSettings.masqueSettings.warp"
                                    status={statusAt(side, 'streamSettings.masqueSettings.warp', protocol)}
                                    tag={tag}
                                    actions={[{ label: t("Remove it"), onClick: () => set('warp', undefined) }]}
                                />
                            )}

                            {offersWarp && isHeld(value.warp) && (
                                <>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        {t("Signs in to the WARP endpoint with the device's own key pair instead of a user name and password. It needs the private key, the public key the endpoint presents, and the address WARP gave this device.")}
                                    </p>
                                    {warpWrongType ? (
                                        <WrongTypeNotice field="masqueSettings.warp" held={value.warp} onRemove={() => set('warp', undefined)} />
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="label-xs">{t("Private key")}</label>
                                                <textarea
                                                    className="input-base text-xs font-mono min-h-[72px] resize-y"
                                                    spellCheck={false}
                                                    placeholder="-----BEGIN PRIVATE KEY-----"
                                                    value={typeof warp?.privateKey === 'string' ? warp.privateKey : ''}
                                                    onChange={e => setWarp('privateKey', e.target.value)}
                                                />
                                                <FieldProblem message={problem('warp.privateKey')} />
                                            </div>
                                            <div>
                                                <label className="label-xs">{t("Public key")}</label>
                                                <textarea
                                                    className="input-base text-xs font-mono min-h-[72px] resize-y"
                                                    spellCheck={false}
                                                    placeholder="-----BEGIN PUBLIC KEY-----"
                                                    value={typeof warp?.publicKey === 'string' ? warp.publicKey : ''}
                                                    onChange={e => setWarp('publicKey', e.target.value)}
                                                />
                                                <FieldProblem message={problem('warp.publicKey')} />
                                            </div>
                                            <div>
                                                <label className="label-xs flex items-center gap-1">
                                                    {t("Device addresses")}
                                                    <Help>{t("What WARP assigned this device: at most one IPv4 and one IPv6 address, bare or as a prefix.")}</Help>
                                                </label>
                                                <ListTextInput
                                                    value={warp?.address}
                                                    onChange={next => setWarp('address', next)}
                                                    className="input-base font-mono"
                                                    placeholder="172.16.0.2/32, 2606:4700:110:8a36::2/128"
                                                    aria-label={t("Device addresses")}
                                                    spellCheck={false}
                                                />
                                                <FieldProblem message={problem('warp.address')} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
