import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    // Helper to get the correct server object regardless of protocol
    const getServer = () => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') {
            return outbound.settings?.vnext?.[0] || {};
        }
        return outbound.settings?.servers?.[0] || {};
    };

    const server = getServer();
    
    const updateServerField = (field: string, value: any) => {
        const val = field === 'port' ? parseInt(value) || 0 : value;
        
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') {
            const vnext = [...(outbound.settings?.vnext || [{ users: [{ id: '' }] }])];
            vnext[0] = { ...vnext[0], [field]: val };
            onChange('settings', { ...outbound.settings, vnext });
        } else {
            const servers = [...(outbound.settings?.servers || [{}])];
            servers[0] = { ...servers[0], [field]: val };
            onChange('settings', { ...outbound.settings, servers });
        }
    };

    const updateUserId = (id: string) => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') {
            const vnext = [...(outbound.settings?.vnext || [{ users: [{ id: '' }] }])];
            vnext[0].users[0].id = id;
            onChange('settings', { ...outbound.settings, vnext });
        } else {
            const servers = [...(outbound.settings?.servers || [{}])];
            // Shadowsocks and Trojan use 'password' field
            servers[0].password = id;
            onChange('settings', { ...outbound.settings, servers });
        }
    };

    const getUserId = () => {
        if (outbound.protocol === 'vmess' || outbound.protocol === 'vless') return server.users?.[0]?.id || "";
        return server.password || "";
    };

    return (
        <Card title="Server Connection" icon="Cloud" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                    <FormField label="Remote Address" error={errors.address} help="IP address or Domain name of the server.">
                        <Input 
                            placeholder="example.com"
                            value={server.address || ""} 
                            onChange={e => updateServerField('address', e.target.value)} 
                        />
                    </FormField>
                </div>
                <FormField label="Port" error={errors.port}>
                    <Input 
                        type="number"
                        placeholder="443"
                        value={server.port || ""} 
                        onChange={e => updateServerField('port', e.target.value)} 
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormField label={outbound.protocol === 'shadowsocks' || outbound.protocol === 'trojan' ? "Password" : "UUID / Client ID"}>
                    <Input 
                        className="font-mono text-xs" 
                        value={getUserId()} 
                        onChange={e => updateUserId(e.target.value)} 
                    />
                </FormField>

                {outbound.protocol === 'shadowsocks' && (
                    <FormField label="Encryption Method" help="Shadowsocks encryption algorithm.">
                        <Select 
                            className="font-bold text-indigo-400"
                            value={server.method || "2022-blake3-aes-256-gcm"}
                            onChange={e => updateServerField('method', e.target.value)}
                        >
                            <option value="aes-128-gcm">aes-128-gcm</option>
                            <option value="aes-256-gcm">aes-256-gcm</option>
                            <option value="chacha20-ietf-poly1305">chacha20-poly1305</option>
                            <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                            <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                            <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                            <option value="none">none</option>
                        </Select>
                    </FormField>
                )}
            </div>

            {outbound.protocol === 'shadowsocks' && (
                <div className="pt-2 px-1">
                    <FormField label="UDP over TCP (UOT)" horizontal help="Enable UOT for better UDP performance over TCP-based transport.">
                        <Switch 
                            checked={server.uot || false}
                            onChange={val => updateServerField('uot', val)}
                        />
                    </FormField>
                </div>
            )}
        </Card>
    );
};
