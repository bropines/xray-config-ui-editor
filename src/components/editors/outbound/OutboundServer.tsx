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
        } else if (outbound.protocol === 'trojan') {
            const servers = [...(outbound.settings?.servers || [{}])];
            servers[0].password = id;
            onChange('settings', { ...outbound.settings, servers });
        } else if (outbound.protocol === 'shadowsocks') {
            onChange('settings', { ...outbound.settings, password: id });
        }
    };

    const getUserId = () => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') return server.users?.[0]?.id || "";
        if (outbound.protocol === 'trojan') return server.password || "";
        if (outbound.protocol === 'shadowsocks') return outbound.settings?.password || "";
        return "";
    };

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

            <FormField label={outbound.protocol === 'shadowsocks' || outbound.protocol === 'trojan' ? "Password" : "UUID / ID"}>
                <div className="relative">
                    <input 
                        className="input-base font-mono text-xs" 
                        value={getUserId()} 
                        onChange={e => updateUserId(e.target.value)} 
                    />
                </div>
            </FormField>
        </Card>
    );
};
