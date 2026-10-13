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
import { t } from '../../../i18n';

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
    const isFlat = isHysteria || (withLogin && serverShape(outbound) === 'flat');
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
    const basePath: (string | number)[] = isVnextProtocol
        ? ['settings', 'vnext', 0]
        : isFlat ? ['settings'] : ['settings', 'servers', 0];

    const address = useField<string>(outbound, onChange, [...basePath, 'address']);
    const port = useField<number>(outbound, onChange, [...basePath, 'port']);
    const method = useField<string>(outbound, onChange, [...basePath, 'method']);
    const uot = useField<boolean>(outbound, onChange, [...basePath, 'uot']);
    // UDP over TCP exists in the shadowsocks client config on 26.3 and is
    // gone from 26.7 on, where the key is dropped silently. Offered where it
    // works; shown wherever a config already sets it, so it is not hidden.
    const { offers, values } = useCoreVersion();
    const showUot = isShadowsocks && (offers('outbound.shadowsocks.servers.uot') || uot.value !== undefined);
    // vmess/vless keep the identifier under users[0].id; trojan/shadowsocks keep it as `password`.
    const userIdField = useField<string>(
        outbound,
        onChange,
        isVnextProtocol ? [...basePath, 'users', 0, 'id'] : [...basePath, 'password']
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
                            className="input-base"
                            placeholder={t("example.com")}
                            value={address.value || ""}
                            onChange={e => address.onChange(e.target.value)}
                        />
                    </FormField>
                </div>
                <FormField label={t("Port")} error={errors.port}>
                    <input
                        type="number"
                        className="input-base"
                        placeholder="443"
                        value={port.value || ""}
                        onChange={e => port.onChange(parseInt(e.target.value) || 0)}
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {supportsUserId && (
                    <FormField label={isShadowsocks || outbound.protocol === 'trojan' ? t("Password") : t("UUID / ID")}>
                        <input
                            className="input-base font-mono text-xs"
                            value={userId.value || ""}
                            onChange={e => userId.onChange(e.target.value)}
                        />
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

                {isShadowsocks && (
                    <Select
                        label={t("Method")}
                        value={method.value || (outbound.protocol === 'shadowsocks-2022' ? "2022-blake3-aes-128-gcm" : "aes-256-gcm")}
                        onChange={val => method.onChange(val)}
                        options={outbound.protocol === 'shadowsocks' ? [
                            { value: "aes-256-gcm", label: t("aes-256-gcm") },
                            { value: "aes-128-gcm", label: t("aes-128-gcm") },
                            { value: "chacha20-ietf-poly1305", label: t("chacha20-ietf-poly1305") },
                            { value: "xchacha20-ietf-poly1305", label: t("xchacha20-ietf-poly1305") },
                        ] : [
                            { value: "2022-blake3-aes-128-gcm", label: t("2022-blake3-aes-128-gcm") },
                            { value: "2022-blake3-aes-256-gcm", label: t("2022-blake3-aes-256-gcm") },
                            { value: "2022-blake3-chacha20-poly1305", label: t("2022-blake3-chacha20-poly1305") },
                        ]}
                    />
                )}

                {showUot && (
                    <div className="flex items-center gap-2 pt-6">
                        <Switch
                            checked={uot.value === true}
                            onChange={checked => uot.onChange(checked)}
                            label={t("UDP over TCP (UOT)")}
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
