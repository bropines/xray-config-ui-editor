import React from 'react';
import { Switch, Card, TagSelector, SchemaForm } from '../../ui';
import { ObservatorySchema } from '../../../core/xray/schemas/observatory.schema';

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
            headerExtra={
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
            <p className="text-xs text-slate-500 -mt-2 mb-4">Health checks for Load Balancers</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-slate-800/50">
                    <SchemaForm
                        schema={ObservatorySchema}
                        value={localObs}
                        onChange={onChange}
                        excludeKeys={['subjectSelector']}
                        fieldConfigs={{
                            probeUrl: {
                                label: 'Probe URL',
                                help: 'URL used for probing outbound connectivity.',
                                placeholder: 'https://www.google.com/generate_204'
                            },
                            probeInterval: {
                                label: 'Probe Interval',
                                help: 'Probe interval (e.g. "10s", "1m", "2h").',
                                placeholder: '1m'
                            },
                            enableConcurrency: {
                                label: 'Enable Concurrency',
                                help: 'Enable concurrent probing of all matched outbounds.'
                            }
                        }}
                    />
                    
                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                        <TagSelector 
                            label="Subject Selector (Outbounds to Watch)"
                            availableTags={outboundTags}
                            selected={localObs.subjectSelector || []}
                            onChange={v => update('subjectSelector', v)}
                            multi={true}
                            placeholder="Prefix matching..."
                        />
                        <p className="text-[10px] text-slate-500 mt-2">
                            Select Outbound tags (or prefixes) that will be monitored by Observatory. 
                            Needed for <code>leastPing</code> balancers.
                        </p>
                    </div>
                </div>
            )}
        </Card>
    );
};