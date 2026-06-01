import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { SchemaForm } from '../../ui/SchemaForm';
import { SniffingSchema } from '../../../core/xray/schemas';

interface InboundSniffingProps {
    sniffing: any;
    onChange: (path: string | (string | number)[], value: any) => void;
    errors?: any[];
}

export const InboundSniffing = ({ sniffing = {}, onChange, errors = [] }: InboundSniffingProps) => {
    const enabled = sniffing.enabled || false;

    // Map errors of format 'sniffing.field' to 'field'
    const sniffingErrors: Record<string, string | undefined> = {};
    if (Array.isArray(errors)) {
        errors.forEach((err: any) => {
            if (err.field && err.field.startsWith('sniffing.')) {
                const key = err.field.replace('sniffing.', '');
                sniffingErrors[key] = err.message;
            }
        });
    }

    const handleSniffingChange = (newSniffing: any) => {
        onChange('sniffing', newSniffing);
    };

    const handleToggleEnabled = (val: boolean) => {
        if (!val) {
            onChange('sniffing', { enabled: false });
        } else {
            onChange('sniffing', { ...sniffing, enabled: true });
        }
    };

    return (
        <Card title="Traffic Sniffing" icon="MagnifyingGlass" className="mt-4">
            <div className="space-y-4">
                <FormField label="Enable Sniffing" help="Analyze traffic to determine destination domain and protocol." horizontal>
                    <Switch 
                        checked={enabled} 
                        onChange={handleToggleEnabled} 
                    />
                </FormField>

                {enabled && (
                    <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <SchemaForm
                            schema={SniffingSchema}
                            value={sniffing}
                            onChange={handleSniffingChange}
                            errors={sniffingErrors}
                            excludeKeys={['enabled']}
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
