import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { useField } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    hasLogin,
    loginProblem,
    readCredentials,
    serverShape,
    withCredentials,
} from '../../../core/xray/outbound-credentials';
import {
    shadowsocksOutboundProblems,
    shadowsocksUot,
    type ShadowsocksOutboundProblem,
} from '../../../core/xray/shadowsocks-outbound';
import { canonicalNames, protocolNameProblem, text } from '../../../core/xray/shadowsocks-rules';
import { OutboundHttpHeaders } from './OutboundHttpHeaders';
import { OutboundFlow, OutboundVision } from './OutboundVision';
import { isHttpOutbound } from '../../../core/xray/http-outbound-headers';
import { t } from '../../../i18n';

/**
 * What the core refuses about one field, said next to it — the same words the
 * diagnostics use (core/xray/shadowsocks-outbound), so a check the panel save
 * runs is one the form shows while it is being typed.
 */
const Problems = ({ items }: { items: ShadowsocksOutboundProblem[] }) => (items.length === 0 ? null : (
    <ul className="space-y-1 mt-1">
        {items.map((problem, index) => (
            <li key={index} data-problem={problem.kind} className="text-[10px] leading-relaxed text-rose-300 break-words">
                {problem.message}
                {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
            </li>
        ))}
    </ul>
));

const invalidClass = (invalid: boolean) => (invalid ? 'border-rose-500 bg-rose-500/10' : '');

/**
 * What is wrong with the outbound as a whole rather than with a field, and
 * what a key the line does nothing with is doing in it. Information first, the
 * buttons at the foot where a thumb finds them.
 */
const ShadowsocksNotes = ({ problems, nameProblem, onUseShadowsocks, uot }: {
    problems: ShadowsocksOutboundProblem[];
    nameProblem?: { message: string; suggestion: string };
    onUseShadowsocks: () => void;
    uot?: { keys: string[]; text: string[]; onRemove: () => void };
}) => {
    if (!nameProblem && problems.length === 0 && !uot) return null;
    const button = 'h-9 px-4 rounded-lg border bg-slate-950/40 text-[11px] font-bold transition-colors';
    return (
        <div className="mt-4 space-y-3">
            {nameProblem && (
                <div className="p-3 rounded-xl border space-y-3 bg-rose-950/20 border-rose-500/40" data-problem="protocol.name">
                    <p className="text-[11px] leading-relaxed text-rose-200/90 break-words">{nameProblem.message}</p>
                    <p className="text-[10px] leading-relaxed text-slate-400 break-words">{nameProblem.suggestion}</p>
                    <button type="button" onClick={onUseShadowsocks} className={`${button} border-rose-500/40 text-rose-200 hover:border-rose-400`}>
                        {t("Use shadowsocks")}
                    </button>
                </div>
            )}
            {problems.length > 0 && (
                <div className="p-3 rounded-xl border bg-rose-950/20 border-rose-500/40">
                    <Problems items={problems} />
                </div>
            )}
            {uot && (
                <div className="p-3 rounded-xl border space-y-3 bg-amber-950/20 border-amber-500/30" data-held-uot={uot.keys.join(',')}>
                    {uot.text.map((line, index) => (
                        <p key={index} className="text-[11px] leading-relaxed text-slate-300 break-words">{line}</p>
                    ))}
                    <button type="button" onClick={uot.onRemove} className={`${button} border-amber-500/40 text-amber-200 hover:border-amber-400`}>
                        {t("Remove")}
                    </button>
                </div>
            )}
        </div>
    );
};

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    const isShadowsocks = outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022';
    const isBlackhole = outbound.protocol === 'blackhole';
    const isDns = outbound.protocol === 'dns';
    const isVnextProtocol = outbound.protocol === 'vmess' || outbound.protocol === 'vless';
    /**
     * Hysteria's client config is flat — `version`, `address`, `port` and
     * nothing else (infra/conf/hysteria.go, all three supported tags). A
     * `servers[]` entry is dropped without a word, which leaves the address
     * nil, and Build() dereferences it: the core does not start. Its password
     * is the transport's `hysteriaSettings.auth`, not a setting here.
     */
    const isHysteria = outbound.protocol === 'hysteria';
    // SOCKS and HTTP have the flat shape too, and the core reads it in
    // preference to `servers` whenever `settings.address` is there — so the
    // card follows whichever the config uses instead of always writing
    // `servers[0]`, which on a flat config is a key nothing reads.
    const withLogin = hasLogin(outbound.protocol);
    // Shadowsocks has them too, by the same test and on every line
    // (v26.7.28:infra/conf/shadowsocks.go:201-212): a form that always wrote
    // `servers[0]` drew empty boxes for a flat config and edited a list the
    // core had already replaced.
    //
    // VMess and VLESS have the same two forms by the same test: `address` in
    // the settings makes it the flat one, and `vnext` is then replaced
    // (v26.7.28:infra/conf/vless.go:263-271, v26.7.28:infra/conf/vmess.go:127
    // and :161-162; v26.3.27:infra/conf/vless.go:251 and vmess.go:121, :155-156).
    // Their account — id, flow, and for VLESS the Vision keys — is then flat too.
    const isFlat = isHysteria || ((withLogin || isShadowsocks || isVnextProtocol) && serverShape(outbound) === 'flat');
    // One identifier: a UUID for vless and vmess, a password for trojan and
    // shadowsocks. Nothing else has one — this box used to be drawn for
    // socks, http and hysteria as well, bound to nothing.
    const supportsUserId = isVnextProtocol || outbound.protocol === 'trojan' || isShadowsocks;
    const login = readCredentials(outbound);
    const setLogin = (patch: Partial<typeof login>) =>
        onChange('settings', withCredentials(outbound, { ...login, ...patch }).settings);

    // `outbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` (see OutboundModal.tsx). The active server
    // entry lives at settings.vnext[0] for vmess/vless, settings.servers[0]
    // for every other protocol handled by the "Server Details" card below.
    const basePath: (string | number)[] = isFlat
        ? ['settings']
        : isVnextProtocol ? ['settings', 'vnext', 0] : ['settings', 'servers', 0];

    const address = useField<string>(outbound, onChange, [...basePath, 'address']);
    const port = useField<number>(outbound, onChange, [...basePath, 'port']);
    const method = useField<string>(outbound, onChange, [...basePath, 'method']);
    const uot = useField<boolean>(outbound, onChange, [...basePath, 'uot']);
    const uotVersion = useField<number | undefined>(outbound, onChange, [...basePath, 'uotVersion']);
    const { version, tag: coreTag, values } = useCoreVersion();
    // UDP over TCP is read by Xray 26.3 and handed to a 2022 cipher only
    // (v26.3.27:infra/conf/shadowsocks.go:223-224); 26.7 on has no such key.
    // Offered where it does something; a value the config holds elsewhere is
    // still drawn, with what the line does with it and a way to remove it.
    const ssProblems = isShadowsocks ? shadowsocksOutboundProblems(outbound, version) : [];
    const problemsAt = (key: string) => ssProblems.filter(problem => problem.key === key);
    const uotState = isShadowsocks ? shadowsocksUot(outbound, version) : undefined;
    const nameProblem = isShadowsocks ? protocolNameProblem(outbound.protocol) : undefined;
    // What the chosen line takes (none only where it works, no aead_* twins),
    // plus whatever the config holds, so a name the line refuses is shown and
    // not swapped for one it does not have.
    const heldMethod = text(method.value);
    const methodNames = canonicalNames(values('outbound.shadowsocks.method'));
    const methodOptions = heldMethod !== '' && !methodNames.includes(heldMethod) ? [...methodNames, heldMethod] : methodNames;
    // vmess/vless keep the identifier under users[0].id, or `id` in the flat
    // form; trojan/shadowsocks keep it as `password`.
    const userIdField = useField<string>(
        outbound,
        onChange,
        isVnextProtocol
            ? (isFlat ? ['settings', 'id'] : [...basePath, 'users', 0, 'id'])
            : [...basePath, 'password']
    );
    const userId = supportsUserId ? userIdField : { value: '', onChange: () => {} };

    const responseType = useField<string>(outbound, onChange, ['settings', 'response', 'type']);
    const customResponse = useField<string | undefined>(outbound, onChange, ['settings', 'response', 'customResponseData']);
    const dnsAddress = useField<string>(outbound, onChange, ['settings', 'address']);
    const dnsPort = useField<number>(outbound, onChange, ['settings', 'port']);

    // `custom` exists only on 26.9; earlier lines refuse it as an unknown
    // response id. A config that already says `custom` keeps it visible.
    const blackholeResponseOptions = [
        { value: "none", label: t("None"), description: t("Silent Drop") },
        { value: "http", label: "HTTP", description: t("Return 403 Forbidden") },
        ...(values('outbound.blackhole.response.type').includes('custom') || responseType.value === 'custom'
            ? [{ value: "custom", label: t("Custom"), description: t("Send bytes of your own") }]
            : []),
    ];

    if (isBlackhole) {
        return (
            <Card title={t("Blackhole Settings")} icon="Prohibit" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        {t("The Blackhole outbound drops all outgoing traffic. Route specific domains or IPs here to block them — for ad-blocking, or to stop telemetry.")}
                    </p>
                </div>
                <Select
                    label={t("Response Type")}
                    hint={t("Determines what the client receives when traffic is blocked.")}
                    value={responseType.value || "none"}
                    onChange={val => responseType.onChange(val)}
                    options={blackholeResponseOptions}
                />

                {/* The core base64-decodes this field and refuses to start if
                    it is not valid base64, so it is bytes, not text. */}
                {responseType.value === 'custom' && (
                    <div className="mt-4 animate-in fade-in">
                        <FormField label={t("Custom Response (base64)")}>
                            <textarea
                                className="input-base font-mono text-xs min-h-[80px]"
                                placeholder="SFRUUC8xLjEgNDA0IE5vdCBGb3VuZA0KDQo="
                                value={customResponse.value || ""}
                                onChange={e => customResponse.onChange(e.target.value || undefined)}
                            />
                        </FormField>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {t("Base64 of the exact bytes to write back. Xray decodes it at startup and will not run if it is not valid base64.")}
                        </p>
                    </div>
                )}
            </Card>
        );
    }

    if (isDns) {
        return (
            <Card title={t("DNS Outbound")} icon="Globe" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        {t("The DNS outbound intercepts and forwards DNS queries. A query routed here is handled by Xray's own DNS logic.")}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                        <FormField label={t("DNS Server Address")}>
                            <input className="input-base"
                                value={dnsAddress.value || ""}
                                onChange={e => dnsAddress.onChange(e.target.value)}
                            />
                        </FormField>
                    </div>
                    <FormField label={t("Port")}>
                        <input type="number" className="input-base"
                            value={dnsPort.value || 53}
                            onChange={e => dnsPort.onChange(parseInt(e.target.value) || 53)}
                        />
                    </FormField>
                </div>
            </Card>
        );
    }

    return (
        <Card title={t("Server Details")} icon="Cloud" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                    <FormField label={t("Address (IP or Domain)")} error={errors.address}>
                        <input
                            className={`input-base ${invalidClass(problemsAt('address').length > 0)}`}
                            placeholder={t("example.com")}
                            value={address.value || ""}
                            onChange={e => address.onChange(e.target.value)}
                        />
                        <Problems items={problemsAt('address')} />
                    </FormField>
                </div>
                <FormField label={t("Port")} error={errors.port}>
                    <input
                        type="number"
                        className={`input-base ${invalidClass(problemsAt('port').length > 0)}`}
                        placeholder="443"
                        value={port.value || ""}
                        onChange={e => port.onChange(parseInt(e.target.value) || 0)}
                    />
                    <Problems items={problemsAt('port')} />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {supportsUserId && (
                    <FormField label={isShadowsocks || outbound.protocol === 'trojan' ? t("Password") : t("UUID / ID")}>
                        <input
                            className={`input-base font-mono text-xs ${invalidClass(isShadowsocks && problemsAt('password').length > 0)}`}
                            value={userId.value || ""}
                            onChange={e => userId.onChange(e.target.value)}
                        />
                        <Problems items={problemsAt('password')} />
                    </FormField>
                )}

                {/* The proxy's own login. Both empty means none is sent. */}
                {withLogin && (
                    <>
                        <FormField
                            label={t("Username")}
                            help={t("The login this proxy asks for. Leave both boxes empty for a proxy that takes anyone.")}
                        >
                            <input
                                className="input-base font-mono text-xs"
                                autoComplete="off"
                                value={login.user}
                                onChange={e => setLogin({ user: e.target.value })}
                            />
                        </FormField>
                        <FormField
                            label={t("Password")}
                            error={loginProblem(login) ? t("A password with no user name: the proxy would be offered an empty login.") : undefined}
                        >
                            <input
                                className="input-base font-mono text-xs"
                                autoComplete="off"
                                value={login.pass}
                                onChange={e => setLogin({ pass: e.target.value })}
                            />
                        </FormField>
                    </>
                )}

                {/* Hysteria has no credential of its own here: its password
                    is the transport's, and saying so beats a box that looks
                    like the place for it. */}
                {isHysteria && (
                    <p className="md:col-span-2 text-[11px] text-slate-500 leading-relaxed">
                        {t("Hysteria's password is not set here: it is the transport's Auth, under Stream Settings below.")}
                    </p>
                )}

                {/* VLESS: what makes it Vision, drawn beside the id it belongs to. */}
                {outbound.protocol === 'vless' && <OutboundFlow outbound={outbound} onChange={onChange} />}

                {isShadowsocks && (
                    <div>
                        {/* An outbound has no default cipher: an empty method is
                            refused on every line, so an empty one is shown as
                            empty rather than as a name the config does not hold. */}
                        <Select
                            label={t("Method")}
                            value={text(method.value)}
                            onChange={val => method.onChange(val)}
                            placeholder={t("Choose a method")}
                            options={methodOptions.map(name => ({ value: name, label: name }))}
                        />
                        <Problems items={problemsAt('method')} />
                    </div>
                )}

                {uotState?.effect === 'works' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-6">
                        <Switch
                            checked={uot.value === true}
                            onChange={checked => uot.onChange(checked)}
                            label={t("UDP over TCP (UOT)")}
                        />
                        {/* Read by this line, so drawn when the config holds it: a
                            number the core decodes as an int, never text. */}
                        {uotState.held.includes('uotVersion') && (
                            <label className="flex items-center gap-2 text-[11px] text-slate-400">
                                {t("UDP over TCP version")}
                                <input
                                    type="number"
                                    step={1}
                                    className="input-base w-20 py-1 text-xs"
                                    value={typeof uotVersion.value === 'number' ? uotVersion.value : ''}
                                    onChange={e => {
                                        const next = parseInt(e.target.value, 10);
                                        uotVersion.onChange(Number.isNaN(next) ? undefined : next);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                )}

                {/* Only an HTTP outbound reads `headers`; one key beside the
                    server, whichever shape the server is in. */}
                {isHttpOutbound(outbound) && <OutboundHttpHeaders outbound={outbound} onChange={onChange} />}
            </div>

            {outbound.protocol === 'vless' && <OutboundVision outbound={outbound} onChange={onChange} />}

            {isShadowsocks && (
                <ShadowsocksNotes
                    problems={ssProblems.filter(problem => problem.key === 'servers')}
                    nameProblem={nameProblem}
                    onUseShadowsocks={() => onChange('protocol', 'shadowsocks')}
                    uot={uotState && uotState.effect !== 'works' && uotState.held.length > 0 ? {
                        keys: uotState.held,
                        text: uotState.effect === 'method'
                            ? problemsAt('uot').map(problem => problem.message)
                            : [t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what: uotState.held.join(', '), tag: coreTag })],
                        onRemove: () => {
                            const target = isFlat ? outbound.settings : outbound.settings?.servers?.[0];
                            const kept = Object.fromEntries(
                                Object.entries(target ?? {}).filter(([key]) => !(uotState.held as string[]).includes(key)),
                            );
                            onChange(basePath, kept);
                        },
                    } : undefined}
                />
            )}
        </Card>
    );
};
