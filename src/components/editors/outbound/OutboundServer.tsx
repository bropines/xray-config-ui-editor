import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    const server = outbound.settings?.vnext?.[0] || outbound.settings?.servers?.[0] || {};
    
    // Logic to handle different protocol nested structures
    const updateServerField = (field: string, value: any) => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') {
            const vnext = [...(outbound.settings?.vnext || [{ users: [{ id: '' }] }])];
            vnext[0] = { ...vnext[0], [field]: field === 'port' ? parseInt(value) || 0 : value };
            onChange('settings', { ...outbound.settings, vnext });
        } else {
            const servers = [...(outbound.settings?.servers || [{}])];
            servers[0] = { ...servers[0], [field]: field === 'port' ? parseInt(value) || 0 : value };
            onChange('settings', { ...outbound.settings, servers });
        }
    };

    const updateUserId = (id: string) => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') {
            const vnext = [...(outbound.settings?.vnext || [{ users: [{ id: '' }] }])];
            vnext[0].users[0].id = id;
            onChange('settings', { ...outbound.settings, vnext });
        } else if (outbound.protocol === 'trojan' || outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022') {
            const servers = [...(outbound.settings?.servers || [{}])];
            servers[0] = { ...servers[0], password: id };
            onChange('settings', { ...outbound.settings, servers });
        }
    };

    const updateMethod = (method: string) => {
        if (outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022') {
            const servers = [...(outbound.settings?.servers || [{}])];
            servers[0] = { ...servers[0], method };
            onChange('settings', { ...outbound.settings, servers });
        }
    };

    const getUserId = () => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') return server.users?.[0]?.id || "";
        if (outbound.protocol === 'trojan' || outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022') return server.password || "";
        return "";
    };

    const isShadowsocks = outbound.protocol === 'shadowsocks' || outbound.protocol === 'shadowsocks-2022';
    const isBlackhole = outbound.protocol === 'blackhole';
    const isDns = outbound.protocol === 'dns';
    const isFreedom = outbound.protocol === 'freedom';

    if (isBlackhole) {
        return (
            <Card title="Blackhole Settings" icon="NoEntry" className="mt-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        The <b>Blackhole</b> outbound drops all outgoing traffic. It is primarily used to block specific domains or IPs (e.g., for ad-blocking or preventing telemetry) by routing them here.
                    </p>
                </div>
                <FormField label="Response Type" help="Determines what the client receives when traffic is blocked.">
                    <select className="select-base text-xs"
                        value={outbound.settings?.response?.type || "none"}
                        onChange={e => onChange('settings', { ...outbound.settings, response: { type: e.target.value } })}
                    >
                        <option value="none">None (Silent Drop)</option>
                        <option value="http">HTTP (Return 403 Forbidden)</option>
                    </select>
                </FormField>
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
                                value={outbound.settings?.address || ""} 
                                onChange={e => onChange('settings', { ...outbound.settings, address: e.target.value })} 
                            />
                        </FormField>
                    </div>
                    <FormField label="Port">
                        <input type="number" className="input-base" 
                            value={outbound.settings?.port || 53} 
                            onChange={e => onChange('settings', { ...outbound.settings, port: parseInt(e.target.value) || 53 })} 
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
                    <FormField label="Domain Strategy" help="How to resolve domain names when connecting.">
                        <select className="select-base text-xs"
                            value={outbound.settings?.domainStrategy || "AsIs"}
                            onChange={e => onChange('settings', { ...outbound.settings, domainStrategy: e.target.value })}
                        >
                            <option value="AsIs">As Is (Use system DNS)</option>
                            <option value="UseIP">Use IP (Resolve via Xray DNS)</option>
                            <option value="UseIPv4">Use IPv4</option>
                            <option value="UseIPv6">Use IPv6</option>
                        </select>
                    </FormField>
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
                            value={server.address || ""} 
                            onChange={e => updateServerField('address', e.target.value)} 
                        />
                    </FormField>
                </div>
                <FormField label="Port" error={errors.port}>
                    <input 
                        type="number"
                        className="input-base" 
                        placeholder="443"
                        value={server.port || ""} 
                        onChange={e => updateServerField('port', e.target.value)} 
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={isShadowsocks || outbound.protocol === 'trojan' ? "Password" : "UUID / ID"}>
                    <input 
                        className="input-base font-mono text-xs" 
                        value={getUserId()} 
                        onChange={e => updateUserId(e.target.value)} 
                    />
                </FormField>

                {isShadowsocks && (
                    <FormField label="Method">
                        <select 
                            className="select-base text-xs"
                            value={server.method || (outbound.protocol === 'shadowsocks-2022' ? "2022-blake3-aes-128-gcm" : "aes-256-gcm")}
                            onChange={e => updateMethod(e.target.value)}
                        >
                            {outbound.protocol === 'shadowsocks' && (
                                <>
                                    <option value="aes-256-gcm">aes-256-gcm</option>
                                    <option value="aes-128-gcm">aes-128-gcm</option>
                                    <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                                    <option value="xchacha20-ietf-poly1305">xchacha20-ietf-poly1305</option>
                                </>
                            )}
                            <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                            <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                            <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                        </select>
                    </FormField>
                )}

                {isShadowsocks && (
                    <div className="flex items-center gap-2 pt-6">
                        <Switch 
                            checked={server.uot === true}
                            onChange={checked => {
                                const servers = [...(outbound.settings?.servers || [{}])];
                                servers[0] = { ...servers[0], uot: checked };
                                onChange('settings', { ...outbound.settings, servers });
                            }}
                            label="UDP over TCP (UOT)"
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
