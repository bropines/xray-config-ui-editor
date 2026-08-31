import React, { useState } from 'react';
import { Icon, JsonField, Select, SchemaForm, OutboundSelector } from '../../ui';
import { validateBalancer } from '../../../core/validators';
import { BalancerSchema, StrategySettingsSchema } from '../../../core/xray/schemas/routing.schema';
import { useConfigStore } from '../../../store/configStore';

export const BalancerEditor = ({ balancer, onChange, outboundTags = [], rawMode }: any) => {
    const [localRawText, setLocalRawText] = useState<string | null>(null);
    const rawConfigText = useConfigStore(state => state.rawConfigText);

    if (!balancer) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-full">
                <Icon name="Scales" className="text-6xl mb-4 opacity-10" />
                <p>Select a balancer to configure</p>
            </div>
        );
    }

    if (rawMode) {
        return (
            <div className="flex-1 w-full h-full p-4 bg-slate-950">
                <JsonField
                    label="Raw Balancer JSON"
                    value={balancer}
                    onChange={(val: any, raw?: string) => {
                        // Pass raw through so the store can splice this
                        // balancer's literal text (comments included) instead
                        // of a freshly-serialized, comment-free object.
                        onChange(val, raw);
                        if (raw !== undefined) setLocalRawText(raw);
                    }}
                    schemaMode="balancer"
                    className="h-full"
                    rawText={localRawText}
                    rawConfigText={rawConfigText}
                    onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
                    onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
                />
            </div>
        );
    }

    const currentSelector = balancer.selector || [];
    
    const errors = validateBalancer(balancer);
    const errorRecord: Record<string, string> = {};
    errors.forEach((e: any) => {
        errorRecord[e.field] = e.message;
    });
    const selectorError = errors.find((e: any) => e.field === 'selector' || (typeof e === 'string' && e.includes('selectors')));

    const update = (field: string | null, val: any) => {
        if (field === null) {
            onChange(null);
        } else {
            onChange({ ...balancer, [field]: val });
        }
    };

    return (
        <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30 h-full">
            
            <div className="flex justify-end mb-4">
                 <button onClick={() => {
                     if (confirm("Delete this balancer?")) {
                         onChange(null);
                     }
                 }} className="text-xs text-rose-500 hover:text-rose-400 font-bold flex items-center gap-1 bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-900/30">
                     <Icon name="Trash" /> Delete Balancer
                 </button>
            </div>

            {selectorError && (
                <div className="p-4 rounded-xl bg-rose-900/20 border border-rose-500/50 text-rose-200 flex gap-3 items-start animate-pulse">
                    <Icon name="WarningOctagon" className="mt-1 shrink-0 text-xl" weight="fill" />
                    <div>
                        <strong className="block text-sm">Critical Config Error</strong>
                        <p className="text-xs opacity-80">{typeof selectorError === 'string' ? selectorError : selectorError.message}</p>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 relative z-20">
                <div className="relative z-30">
                    <SchemaForm
                        schema={BalancerSchema}
                        value={balancer}
                        onChange={onChange}
                        errors={errorRecord}
                        excludeKeys={['selector', 'strategy']}
                        fieldConfigs={{
                            tag: {
                                label: 'Balancer Tag',
                                help: 'Unique identifier for this balancer, used in routing rules.'
                            },
                            fallbackTag: {
                                label: 'Fallback Tag (Optional)',
                                help: 'Outbound tag to use when no selected outbound is available.',
                                options: ['', ...outboundTags]
                            }
                        }}
                    />
                </div>
                
                <div className="border-t border-slate-800/50 pt-4 relative z-10">
                    <Select 
                        label="Strategy"
                        value={balancer.strategy?.type || "random"} 
                        onChange={val => update('strategy', { ...balancer.strategy, type: val })}
                        options={[
                            { value: "random", label: "Random", description: "Standard load balancing" },
                            { value: "roundRobin", label: "Round Robin", description: "Sequential selection" },
                            { value: "leastPing", label: "Least Ping", description: "Best latency (Requires Observatory)" },
                            { value: "leastLoad", label: "Least Load", description: "Least active connections" },
                        ]}
                    />
                </div>
            </div>

            <OutboundSelector
                label="Target Outbounds"
                help="Select individual nodes or add prefix filters (e.g. 'us-', 'sg-') to balance traffic across matching outbounds."
                availableTags={outboundTags}
                selected={currentSelector}
                onChange={newSel => update('selector', newSel)}
                colorScheme="purple"
                maxGridHeight="max-h-[300px]"
            />
            
            {(balancer.strategy?.type === 'leastPing' || balancer.strategy?.type === 'leastLoad') && (
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50 text-xs text-yellow-200 flex gap-2 items-start">
                    <Icon name="Warning" className="mt-0.5 shrink-0" weight="fill" />
                    <div>
                        <strong>Observatory Required:</strong> For "{balancer.strategy.type}" to work, you must configure <b>Observatory</b> in Settings.
                    </div>
                </div>
            )}

            {balancer.strategy?.type === 'leastLoad' && (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400">LeastLoad Settings</h4>
                    <SchemaForm
                        schema={StrategySettingsSchema}
                        value={balancer.strategy?.settings || {}}
                        onChange={settings => update('strategy', { ...balancer.strategy, settings })}
                        fieldConfigs={{
                            expected: {
                                label: 'Expected Nodes',
                                help: 'Number of expected nodes to probe.',
                                placeholder: '2'
                            },
                            maxRTT: {
                                label: 'Max RTT',
                                help: 'Maximum acceptable RTT (e.g. "1s", "500ms").',
                                placeholder: '1s'
                            },
                            tolerance: {
                                label: 'Tolerance',
                                help: 'RTT difference tolerance.',
                                placeholder: '0.01'
                            },
                            baselines: {
                                label: 'Baselines',
                                help: 'Baseline RTT values (comma-separated).',
                                placeholder: '1s, 2s'
                            },
                            costs: {
                                label: 'Costs',
                                help: 'Cost adjustments for specific outbounds.'
                            }
                        }}
                    />
                </div>
            )}

        </div>
    );
};