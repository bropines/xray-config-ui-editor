import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';

export const XhttpEditor = ({ settings = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...settings, [field]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Path" help="Xhttp path (e.g. /v2ray).">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="/"
                        value={settings.path || ""} 
                        onChange={e => updateField('path', e.target.value)} 
                    />
                </FormField>
                <FormField label="Mode" help="Xhttp mode: packet, stream, sub.">
                    <Select 
                        value={settings.mode || "packet"}
                        onChange={e => updateField('mode', e.target.value)}
                    >
                        <option value="packet">Packet</option>
                        <option value="stream">Stream</option>
                        <option value="sub">Sub</option>
                    </Select>
                </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Host" help="HTTP Host header.">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="example.com"
                        value={settings.host || ""} 
                        onChange={e => updateField('host', e.target.value)} 
                    />
                </FormField>
                <FormField label="Extra" help="Extra configuration in JSON format.">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder='{"key": "val"}'
                        value={typeof settings.extra === 'object' ? JSON.stringify(settings.extra) : settings.extra || ""} 
                        onChange={e => {
                            try {
                                updateField('extra', JSON.parse(e.target.value));
                            } catch {
                                updateField('extra', e.target.value);
                            }
                        }} 
                    />
                </FormField>
            </div>
        </div>
    );
};
