import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';

export const QuicEditor = ({ settings = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...settings, [field]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Security" help="QUIC encryption method.">
                    <Select 
                        value={settings.security || "none"}
                        onChange={e => updateField('security', e.target.value)}
                    >
                        <option value="none">None</option>
                        <option value="aes-128-gcm">AES-128-GCM</option>
                        <option value="chacha20-poly1305">Chacha20-Poly1305</option>
                    </Select>
                </FormField>
                <FormField label="Key" help="QUIC encryption key.">
                    <Input 
                        className="font-mono text-xs" 
                        value={settings.key || ""} 
                        onChange={e => updateField('key', e.target.value)} 
                    />
                </FormField>
            </div>
            <FormField label="Header Type" help="QUIC masquerading type.">
                <Select 
                    value={settings.header?.type || "none"}
                    onChange={e => updateField('header', { type: e.target.value })}
                >
                    <option value="none">None</option>
                    <option value="srtp">SRTP</option>
                    <option value="utp">UTP</option>
                    <option value="wechat-video">Wechat-Video</option>
                    <option value="dtls">DTLS</option>
                    <option value="wireguard">Wireguard</option>
                </Select>
            </FormField>
        </div>
    );
};
