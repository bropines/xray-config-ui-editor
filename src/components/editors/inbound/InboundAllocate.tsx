import React from 'react';
import { Select, NumberInput, DurationInput, FormField, Help, Switch } from '../../ui';
import { useField, type FieldPath } from '../../../hooks/useField';

interface AllocateSettings {
    strategy?: 'always' | 'random';
    refresh?: number;
    concurrency?: number;
}

interface InboundAllocateProps {
    allocate?: AllocateSettings;
    onChange: (path: FieldPath, value: any) => void;
}

const DEFAULT_ALLOCATE: Required<AllocateSettings> = { strategy: 'always', refresh: 5, concurrency: 3 };

export const InboundAllocate: React.FC<InboundAllocateProps> = ({ allocate, onChange }) => {
    const isEnabled = !!allocate;

    // `onChange` here is the parent editor's updateField(path, value) (see
    // InboundModal.tsx) — the same path-based updater useField/useArrayField
    // bind to elsewhere. This component only receives the `allocate`
    // sub-object (not the full inbound), so it wraps it under an `allocate`
    // key to read/write nested paths like ['allocate', 'strategy'] through
    // that same updater.
    const local = { allocate: allocate || DEFAULT_ALLOCATE };
    const strategy = useField<'always' | 'random'>(local, onChange, ['allocate', 'strategy']);
    const refresh = useField<number | undefined>(local, onChange, ['allocate', 'refresh']);
    const concurrency = useField<number | undefined>(local, onChange, ['allocate', 'concurrency']);

    const toggleAllocate = (enabled: boolean) => {
        onChange('allocate', enabled ? { ...DEFAULT_ALLOCATE } : undefined);
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
                        value={strategy.value || 'always'}
                        onChange={val => strategy.onChange(val)}
                        options={[
                            { value: 'always', label: 'Always (Fixed List)', description: 'Allocates all random ports continuously' },
                            { value: 'random', label: 'Random Rotation', description: 'Randomly cycles ports on refresh interval' }
                        ]}
                    />

                    <FormField label="Refresh Interval" help="Interval to rotate random ports.">
                        <DurationInput
                            value={refresh.value ?? 5}
                            onChange={val => refresh.onChange(val)}
                            placeholder="5"
                            defaultUnit="m"
                            mode="number"
                            baseUnit="m"
                            unitOptions={['ms', 's', 'm', 'h']}
                        />
                    </FormField>

                    <FormField label="Concurrency" help="Number of concurrent random ports to listen on.">
                        <NumberInput
                            value={concurrency.value ?? 3}
                            onChange={val => concurrency.onChange(val)}
                            placeholder="3"
                        />
                    </FormField>
                </div>
            )}
        </div>
    );
};
