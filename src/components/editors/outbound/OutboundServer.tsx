import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { useField } from '../../../hooks/useField';

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    const isShadowsocks = outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022';
    const isBlackhole = outbound.protocol === 'blackhole';
    const isDns = outbound.protocol === 'dns';
    const isFreedom = outbound.protocol === 'freedom';
    const isVnextProtocol = outbound.protocol === 'vmess' || outbound.protocol === 'vless';
    // Only these protocols expose a single ID/password field in this UI —
    // matches the previous getUserId()/updateUserId() behavior, where every
    // other protocol (socks, http, hysteria, ...) left the field inert.
    const supportsUserId = isVnextProtocol || outbound.protocol === 'trojan' || isShadowsocks;

    // `outbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` (see OutboundModal.tsx). The active server
    // entry lives at settings.vnext[0] for vmess/vless, settings.servers[0]
    // for every other protocol handled by the "Server Details" card below.
    const basePath: (string | number)[] = isVnextProtocol ? ['settings', 'vnext', 0] : ['settings', 'servers', 0];

    const address = useField<string>(outbound, onChange, [...basePath, 'address']);
    const port = useField<number>(outbound, onChange, [...basePath, 'port']);
    const method = useField<string>(outbound, onChange, [...basePath, 'method']);
    const uot = useField<boolean>(outbound, onChange, [...basePath, 'uot']);
    // vmess/vless keep the identifier under users[0].id; trojan/shadowsocks keep it as `password`.
    const userIdField = useField<string>(
        outbound,
        onChange,
        isVnextProtocol ? [...basePath, 'users', 0, 'id'] : [...basePath, 'password']
    );
    const userId = supportsUserId ? userIdField : { value: '', onChange: () => {} };

    const responseType = useField<string>(outbound, onChange, ['settings', 'response', 'type']);
    const dnsAddress = useField<string>(outbound, onChange, ['settings', 'address']);
    const dnsPort = useField<number>(outbound, onChange, ['settings', 'port']);
    const domainStrategy = useField<string>(outbound, onChange, ['settings', 'domainStrategy']);

    if (isBlackhole) {
        return (
            <Card title="Blackhole Settings" icon="NoEntry" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        The <b>Blackhole</b> outbound drops all outgoing traffic. It is primarily used to block specific domains or IPs (e.g., for ad-blocking or preventing telemetry) by routing them here.
                    </p>
                </div>
                <Select
                    label="Response Type"
                    hint="Determines what the client receives when traffic is blocked."
                    value={responseType.value || "none"}
                    onChange={val => responseType.onChange(val)}
                    options={[
                        { value: "none", label: "None", description: "Silent Drop" },
                        { value: "http", label: "HTTP", description: "Return 403 Forbidden" },
                    ]}
                />
            </Card>
        );
    }

    if (isDns) {
        return (
            <Card title="DNS Outbound" icon="Globe" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        The <b>DNS</b> outbound is used to intercept and forward DNS queries. When a query is routed here, Xray will handle it using internal DNS logic.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                        <FormField label="DNS Server Address">
                            <input className="input-base"
                                value={dnsAddress.value || ""}
                                onChange={e => dnsAddress.onChange(e.target.value)}
                            />
                        </FormField>
                    </div>
                    <FormField label="Port">
                        <input type="number" className="input-base"
                            value={dnsPort.value || 53}
                            onChange={e => dnsPort.onChange(parseInt(e.target.value) || 53)}
                        />
                    </FormField>
                </div>
            </Card>
        );
    }

    if (isFreedom) {
        return (
            <Card title="Freedom (Direct)" icon="ArrowSquareOut" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        The <b>Freedom</b> outbound sends traffic directly to its destination without any proxy. This is typically used for local traffic or bypassing the VPN.
                    </p>
                </div>
                <div className="mt-4">
                        <Select
                            label="Domain Strategy"
                            hint="How to resolve domain names when connecting."
                            value={domainStrategy.value || "AsIs"}
                            onChange={val => domainStrategy.onChange(val)}
                            options={[
                                { value: "AsIs", label: "As Is", description: "Use system DNS" },
                                { value: "UseIP", label: "Use IP", description: "Resolve via Xray DNS" },
                                { value: "UseIPv4", label: "Use IPv4" },
                                { value: "UseIPv6", label: "Use IPv6" },
                            ]}
                        />
                </div>
            </Card>
        );
    }

    return (
        <Card title="Server Details" icon="Cloud" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                    <FormField label="Address (IP or Domain)" error={errors.address}>
                        <input
                            className="input-base"
                            placeholder="example.com"
                            value={address.value || ""}
                            onChange={e => address.onChange(e.target.value)}
                        />
                    </FormField>
                </div>
                <FormField label="Port" error={errors.port}>
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
                <FormField label={isShadowsocks || outbound.protocol === 'trojan' ? "Password" : "UUID / ID"}>
                    <input
                        className="input-base font-mono text-xs"
                        value={userId.value || ""}
                        onChange={e => userId.onChange(e.target.value)}
                    />
                </FormField>

                {isShadowsocks && (
                    <Select
                        label="Method"
                        value={method.value || (outbound.protocol === 'shadowsocks-2022' ? "2022-blake3-aes-128-gcm" : "aes-256-gcm")}
                        onChange={val => method.onChange(val)}
                        options={outbound.protocol === 'shadowsocks' ? [
                            { value: "aes-256-gcm", label: "aes-256-gcm" },
                            { value: "aes-128-gcm", label: "aes-128-gcm" },
                            { value: "chacha20-ietf-poly1305", label: "chacha20-ietf-poly1305" },
                            { value: "xchacha20-ietf-poly1305", label: "xchacha20-ietf-poly1305" },
                        ] : [
                            { value: "2022-blake3-aes-128-gcm", label: "2022-blake3-aes-128-gcm" },
                            { value: "2022-blake3-aes-256-gcm", label: "2022-blake3-aes-256-gcm" },
                            { value: "2022-blake3-chacha20-poly1305", label: "2022-blake3-chacha20-poly1305" },
                        ]}
                    />
                )}

                {isShadowsocks && (
                    <div className="flex items-center gap-2 pt-6">
                        <Switch
                            checked={uot.value === true}
                            onChange={checked => uot.onChange(checked)}
                            label="UDP over TCP (UOT)"
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
