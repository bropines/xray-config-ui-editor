import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';

export const RealityEditor = ({ reality = {}, onChange, isClient = false }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...reality, [field]: value });
    };

    // Support both client (string) and server (array) formats
    const getServerName = () => {
        if (reality.serverName) return reality.serverName;
        if (Array.isArray(reality.serverNames)) return reality.serverNames[0];
        return "";
    };

    const getShortId = () => {
        if (reality.shortId) return reality.shortId;
        if (Array.isArray(reality.shortIds)) return reality.shortIds[0];
        return "";
    };

    const handleServerNameChange = (val: string) => {
        if (isClient) {
            updateField('serverName', val);
        } else {
            updateField('serverNames', [val]);
        }
    };

    const handleShortIdChange = (val: string) => {
        if (isClient) {
            updateField('shortId', val);
        } else {
            updateField('shortIds', [val]);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isClient && (
                    <FormField label="Dest" help="Destination address (e.g. google.com:443). Inbound only.">
                        <Input 
                            className="font-mono text-xs" 
                            value={reality.dest || ""} 
                            onChange={e => updateField('dest', e.target.value)} 
                            placeholder="example.com:443"
                        />
                    </FormField>
                )}
                <FormField label="Server Name (SNI)" help="SNI for Reality handshake.">
                    <Input 
                        className="font-mono text-xs" 
                        value={getServerName()} 
                        onChange={e => handleServerNameChange(e.target.value)} 
                        placeholder="e.g. microsoft.com"
                    />
                </FormField>
                {isClient && (
                    <FormField label="Fingerprint" help="TLS Fingerprint simulation (uTLS).">
                        <Select 
                            value={reality.fingerprint || "chrome"}
                            onChange={e => updateField('fingerprint', e.target.value)}
                        >
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
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isClient ? (
                    <FormField label="Public Key" help="Public key from server.">
                        <Input 
                            className="font-mono text-[10px]" 
                            value={reality.publicKey || ""} 
                            onChange={e => updateField('publicKey', e.target.value)} 
                            placeholder="Base64 Public Key"
                        />
                    </FormField>
                ) : (
                    <FormField label="Private Key" help="Your X25519 private key.">
                        <Input 
                            className="font-mono text-[10px]" 
                            value={reality.privateKey || ""} 
                            onChange={e => updateField('privateKey', e.target.value)} 
                        />
                    </FormField>
                )}
                <FormField label="Short ID" help="Hexadecimal short ID.">
                    <Input 
                        className="font-mono text-xs" 
                        value={getShortId()} 
                        onChange={e => handleShortIdChange(e.target.value)} 
                    />
                </FormField>
            </div>

            <FormField label="SpiderX" help="Spider path (e.g. / or /abc).">
                <Input 
                    className="font-mono text-xs" 
                    value={reality.spiderX || ""} 
                    onChange={e => updateField('spiderX', e.target.value)} 
                />
            </FormField>
        </div>
    );
};
