import React from 'react';
import { Select, NumberInput, FormField, Help, Switch } from '../../ui';

interface InboundAllocateProps {
    allocate?: {
        strategy?: 'always' | 'random';
        refresh?: number;
        concurrency?: number;
    };
    onChange: (field: string, value: any) => void;
}

export const InboundAllocate: React.FC<InboundAllocateProps> = ({ allocate, onChange }) => {
    const isEnabled = !!allocate;
    const local = allocate || { strategy: 'always', refresh: 5, concurrency: 3 };

    const toggleAllocate = (enabled: boolean) => {
        if (!enabled) {
            onChange('allocate', undefined);
        } else {
            onChange('allocate', { strategy: 'always', refresh: 5, concurrency: 3 });
        }
    };

    const updateField = (field: string, val: any) => {
        onChange('allocate', { ...local, [field]: val });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        Port Allocation & Hopping (allocate)
                        <Help>Rotates or dynamically allocates listen ports across a specified range for anti-censorship port hopping.</Help>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Dynamically open random port listeners from the port range.</p>
                </div>
                <Switch
                    checked={isEnabled}
                    onChange={toggleAllocate}
                />
            </div>

            {isEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 animate-in fade-in">
                    <Select
                        label="Strategy"
                        value={local.strategy || 'always'}
                        onChange={val => updateField('strategy', val)}
                        options={[
                            { value: 'always', label: 'Always (Fixed List)', description: 'Allocates all random ports continuously' },
                            { value: 'random', label: 'Random Rotation', description: 'Randomly cycles ports on refresh interval' }
                        ]}
                    />

                    <FormField label="Refresh (min)" help="Interval in minutes to rotate random ports.">
                        <NumberInput
                            value={local.refresh ?? 5}
                            onChange={val => updateField('refresh', val)}
                            placeholder="5"
                        />
                    </FormField>

                    <FormField label="Concurrency" help="Number of concurrent random ports to listen on.">
                        <NumberInput
                            value={local.concurrency ?? 3}
                            onChange={val => updateField('concurrency', val)}
                            placeholder="3"
                        />
                    </FormField>
                </div>
            )}
        </div>
    );
};
