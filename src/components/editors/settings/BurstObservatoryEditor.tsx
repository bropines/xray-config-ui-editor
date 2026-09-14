import React from 'react';
import { Switch, Card, OutboundSelector, SchemaForm } from '../../ui';
import { PingConfigSchema } from '../../../core/xray/schemas/observatory.schema';
import { t } from '../../../i18n';

export const BurstObservatoryEditor = ({ burstObservatory, onChange, onToggle, outboundTags = [] }: any) => {
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
            title={t("Burst Observatory")} 
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
            <p className="text-xs text-slate-500 -mt-2 mb-4">{t("Advanced stealth health checks for balancers")}</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-slate-800/50">
                    <SchemaForm
                        schema={PingConfigSchema}
                        value={localObs.pingConfig || {}}
                        onChange={pingConfig => update('pingConfig', pingConfig)}
                        fieldConfigs={{
                            destination: {
                                label: t("Destination URL"),
                                help: t("URL used for probing, should return HTTP 204."),
                                placeholder: 'https://connectivitycheck.gstatic.com/generate_204'
                            },
                            connectivity: {
                                label: t("Connectivity Check URL (Optional)"),
                                help: t("URL for local connectivity check. Empty = disabled."),
                                placeholder: 'https://connectivitycheck.gstatic.com/generate_204'
                            },
                            interval: {
                                label: t("Interval"),
                                help: t("Average probe interval per outbound. Min 10s."),
                                placeholder: '1m'
                            },
                            timeout: {
                                label: t("Timeout"),
                                help: t("Probe timeout."),
                                placeholder: '5s'
                            },
                            sampling: {
                                label: t("Sampling Count"),
                                help: t("Number of recent probe results to keep.")
                            },
                            httpMethod: {
                                label: t("HTTP Method"),
                                help: t("HTTP method for probing."),
                                options: ['HEAD', 'GET', 'POST']
                            }
                        }}
                    />
                    
                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                        <OutboundSelector 
                            label={t("Subject Selector (Outbounds to Watch)")}
                            help={t("Select outbound tags or enter prefix filters (e.g. 'vless-', 'proxy-') for burst stealth health checks.")}
                            availableTags={outboundTags}
                            selected={localObs.subjectSelector || []}
                            onChange={v => update('subjectSelector', v)}
                            placeholder={t("e.g. 'vless-', 'node-', 'direct'...")}
                            colorScheme="indigo"
                        />
                    </div>
                </div>
            )}
        </Card>
    );
};
