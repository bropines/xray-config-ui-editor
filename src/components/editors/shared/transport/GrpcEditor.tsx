import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Input } from '../../../ui/Input';
import { Switch } from '../../../ui/Switch';

export const GrpcEditor = ({ settings = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...settings, [field]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Service Name" help="gRPC service name (e.g. GunService).">
                    <Input 
                        className="font-mono text-xs" 
                        placeholder="GunService"
                        value={settings.serviceName || ""} 
                        onChange={e => updateField('serviceName', e.target.value)} 
                    />
                </FormField>
                <FormField label="Multi Mode" help="Allow multiple streams per connection." horizontal>
                    <Switch 
                        checked={settings.multiMode || false} 
                        onChange={val => updateField('multiMode', val)} 
                    />
                </FormField>
            </div>
        </div>
    );
};
