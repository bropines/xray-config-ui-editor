import React from 'react';
import { SchemaForm } from '../../ui/SchemaForm';
import { TunInboundSettingsSchema } from '../../../core/xray/schemas';

interface InboundTunProps {
    inbound: any;
    onChange: (path: string | (string | number)[], value: any) => void;
    errors?: any[];
}

export const InboundTun = ({ inbound, onChange, errors = [] }: InboundTunProps) => {
    const settings = inbound.settings || {};

    // Map errors of format 'settings.field' to 'field'
    const settingsErrors: Record<string, string | undefined> = {};
    if (Array.isArray(errors)) {
        errors.forEach((err: any) => {
            if (err.field && err.field.startsWith('settings.')) {
                const key = err.field.replace('settings.', '');
                settingsErrors[key] = err.message;
            }
        });
    }

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2">
                TUN Interface Settings
            </h4>
            <SchemaForm
                schema={TunInboundSettingsSchema}
                value={settings}
                onChange={newSettings => onChange('settings', newSettings)}
                errors={settingsErrors}
            />
        </div>
    );
};