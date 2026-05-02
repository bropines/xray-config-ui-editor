import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';

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
                            className="input-base text-xs"
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
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700"
                            checked={server.uot === true}
                            onChange={e => {
                                const servers = [...(outbound.settings?.servers || [{}])];
                                servers[0] = { ...servers[0], uot: e.target.checked };
                                onChange('settings', { ...outbound.settings, servers });
                            }}
                        />
                        <span className="text-[10px] text-slate-500 font-bold uppercase">UDP over TCP (UOT)</span>
                    </div>
                )}
            </div>
        </Card>
    );
};
