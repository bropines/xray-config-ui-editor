import React from 'react';
import { Switch, Card, TagSelector, SchemaForm } from '../../ui';
import { PingConfigSchema } from '../../../core/xray/schemas/observatory.schema';

export const BurstObservatoryEditor = ({ burstObservatory, onChange, onToggle, outboundTags }: any) => {
    const enabled = !!burstObservatory;
    const localObs = burstObservatory || { 
        subjectSelector: [], 
        pingConfig: { destination: "https://connectivitycheck.gstatic.com/generate_204", interval: "1m", sampling: 10 } 
    };

    const update = (field: string, val: any) => {
        onChange({ ...localObs, [field]: val });
    };

    return (
        <Card 
            title="Burst Observatory" 
            icon="Lightning"
            headerExtra={
                <Switch 
                    checked={enabled}
                    onChange={() => onToggle({ 
                        subjectSelector: [], 
                        pingConfig: { destination: "https://connectivitycheck.gstatic.com/generate_204", interval: "1m", sampling: 10 } 
                    })}
                />
            }
        >
            <p className="text-xs text-slate-500 -mt-2 mb-4">Advanced stealth health checks for balancers</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-slate-800/50">
                    <SchemaForm
                        schema={PingConfigSchema}
                        value={localObs.pingConfig || {}}
                        onChange={pingConfig => update('pingConfig', pingConfig)}
                        fieldConfigs={{
                            destination: {
                                label: 'Destination URL',
                                help: 'URL used for probing, should return HTTP 204.',
                                placeholder: 'https://connectivitycheck.gstatic.com/generate_204'
                            },
                            connectivity: {
                                label: 'Connectivity Check URL (Optional)',
                                help: 'URL for local connectivity check. Empty = disabled.',
                                placeholder: 'https://connectivitycheck.gstatic.com/generate_204'
                            },
                            interval: {
                                label: 'Interval',
                                help: 'Average probe interval per outbound. Min 10s.',
                                placeholder: '1m'
                            },
                            timeout: {
                                label: 'Timeout',
                                help: 'Probe timeout.',
                                placeholder: '5s'
                            },
                            sampling: {
                                label: 'Sampling Count',
                                help: 'Number of recent probe results to keep.'
                            },
                            httpMethod: {
                                label: 'HTTP Method',
                                help: 'HTTP method for probing.',
                                options: ['HEAD', 'GET', 'POST']
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
                    </div>
                </div>
            )}
        </Card>
    );
};