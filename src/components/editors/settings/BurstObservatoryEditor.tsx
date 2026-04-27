import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { TagSelector } from '../../ui/TagSelector';
import { Icon } from '../../ui/Icon';

export const BurstObservatoryEditor = ({ burstObservatory, onChange, onToggle, outboundTags }: any) => {
    const enabled = !!burstObservatory;
    const localObs = burstObservatory || { 
        subjectSelector: [], 
        pingConfig: { destination: "https://www.google.com/generate_204", interval: "1m", connectivity: "" } 
    };

    const update = (field: string, val: any) => {
        onChange({ ...localObs, [field]: val });
    };

    const updatePing = (field: string, val: any) => {
        update('pingConfig', { ...(localObs.pingConfig || {}), [field]: val });
    };

    return (
        <Card 
            title="Burst Observatory" 
            icon="Lightning" 
            iconColor="bg-amber-500"
            actions={
                <Switch 
                    checked={enabled} 
                    onChange={() => onToggle({ 
                        subjectSelector: [], 
                        pingConfig: { destination: "https://www.google.com/generate_204", interval: "1m", connectivity: "" } 
                    })} 
                />
            }
        >
            {enabled ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Ping Destination" help="URL to check.">
                            <Input 
                                className="font-mono text-xs" 
                                value={localObs.pingConfig?.destination || ""} 
                                placeholder="https://..."
                                onChange={e => updatePing('destination', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Interval" help="Health check frequency.">
                            <Input 
                                placeholder="1m, 30s"
                                value={localObs.pingConfig?.interval || ""} 
                                onChange={e => updatePing('interval', e.target.value)}
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
                            placeholder="Select tags..."
                        />
                        <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 font-medium bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                            <Icon name="Lightning" weight="fill" className="mt-0.5 text-amber-500" />
                            <span>Burst observatory uses randomized checks to bypass detection. Ideal for modern Xray setups.</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-2 opacity-40 text-[10px] uppercase font-black tracking-widest italic">
                    Burst Observatory is disabled
                </div>
            )}
        </Card>
    );
};
