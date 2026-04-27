import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { TagSelector } from '../../ui/TagSelector';
import { Icon } from '../../ui/Icon';

export const ObservatoryEditor = ({ observatory, onChange, onToggle, outboundTags }: any) => {
    const enabled = !!observatory;
    const localObs = observatory || { 
        subjectSelector: [], 
        probeUrl: "https://www.google.com/generate_204", 
        probeInterval: "1m" 
    };

    const update = (field: string, val: any) => {
        onChange({ ...localObs, [field]: val });
    };

    return (
        <Card 
            title="Observatory" 
            icon="Eye" 
            iconColor="bg-indigo-600"
            actions={
                <Switch 
                    checked={enabled} 
                    onChange={() => onToggle({ 
                        subjectSelector: [], 
                        probeUrl: "https://www.google.com/generate_204", 
                        probeInterval: "1m" 
                    })} 
                />
            }
        >
            {enabled ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Probe URL" help="URL used for latency checks.">
                            <Input 
                                className="font-mono text-xs" 
                                value={localObs.probeUrl || ""} 
                                placeholder="https://..."
                                onChange={e => update('probeUrl', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Check Interval" help="Frequency of health checks.">
                            <Input 
                                placeholder="1m, 30s"
                                value={localObs.probeInterval || ""} 
                                onChange={e => update('probeInterval', e.target.value)}
                            />
                        </FormField>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50">
                        <TagSelector 
                            label="Subject Selector"
                            availableTags={outboundTags}
                            selected={localObs.subjectSelector || []}
                            onChange={v => update('subjectSelector', v)}
                            multi={true}
                            placeholder="Select tags or prefixes..."
                        />
                        <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 font-medium bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                            <Icon name="Info" className="mt-0.5 text-indigo-400" />
                            <span>Select Outbound tags or prefixes to monitor. Required for <b>leastPing</b> balancers.</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-2 opacity-40 text-[10px] uppercase font-black tracking-widest italic">
                    Standard Observatory is disabled
                </div>
            )}
        </Card>
    );
};
