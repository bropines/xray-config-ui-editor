import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Switch } from '../../../ui/Switch';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';

export const TlsEditor = ({ tls = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...tls, [field]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Server Name (SNI)" help="SNI for TLS handshake.">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="example.com"
                        value={tls.serverName || ""} 
                        onChange={e => updateField('serverName', e.target.value)} 
                    />
                </FormField>
                <FormField label="ALPN" help="Application-Layer Protocol Negotiation (comma separated).">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="h2, http/1.1"
                        value={tls.alpn?.join(', ') || ""} 
                        onChange={e => updateField('alpn', e.target.value.split(',').map(s => s.trim()))} 
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Fingerprint" help="TLS Fingerprint simulation (uTLS) for clients.">
                    <Select 
                        value={tls.fingerprint || ""}
                        onChange={e => updateField('fingerprint', e.target.value)}
                    >
                        <option value="">None (Standard TLS)</option>
                        <option value="chrome">Chrome</option>
                        <option value="firefox">Firefox</option>
                        <option value="safari">Safari</option>
                        <option value="ios">iOS</option>
                        <option value="android">Android</option>
                        <option value="edge">Edge</option>
                        <option value="360">360</option>
                        <option value="qq">QQ</option>
                        <option value="random">Random</option>
                        <option value="randomized">Randomized</option>
                    </Select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Allow Insecure" horizontal>
                        <Switch 
                            checked={tls.allowInsecure || false} 
                            onChange={(val) => updateField('allowInsecure', val)} 
                        />
                    </FormField>
                    <FormField label="System Root" horizontal help="Use system root CA certificates.">
                        <Switch 
                            checked={tls.disableSystemRoot === false} 
                            onChange={(val) => updateField('disableSystemRoot', !val)} 
                        />
                    </FormField>
                </div>
            </div>
        </div>
    );
};
