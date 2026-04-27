import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';

export const HttpUpgradeEditor = ({ settings = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...settings, [field]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Path" help="HTTP Upgrade path (e.g. /v2ray).">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="/"
                        value={settings.path || ""} 
                        onChange={e => updateField('path', e.target.value)} 
                    />
                </FormField>
                <FormField label="Host" help="HTTP Host header.">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="example.com"
                        value={settings.host || ""} 
                        onChange={e => updateField('host', e.target.value)} 
                    />
                </FormField>
            </div>
        </div>
    );
};
