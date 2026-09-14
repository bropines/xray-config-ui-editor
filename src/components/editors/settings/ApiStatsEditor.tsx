import React from 'react';
import { Switch, Card, SchemaForm } from '../../ui';
import { ApiSchema } from '../../../core/xray/schemas/api.schema';
import { t } from '../../../i18n';

export const ApiStatsEditor = ({ api, stats, onUpdateApi, onToggleApi, onToggleStats }: any) => {
    const apiEnabled = !!api;
    const statsEnabled = !!stats;
    const localApi = api || { tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] };

    return (
        <div className="space-y-6">
            {/* STATS TOGGLE */}
            <Card 
                title={t("Statistics")} 
                icon="ChartBar"
                headerExtra={
                    <Switch 
                        checked={statsEnabled}
                        onChange={() => onToggleStats({})}
                    />
                }
            >
                <p className="text-xs text-slate-500 mb-2">{t("Enable internal traffic counters (Required for panels)")}</p>
            </Card>

            {/* API TOGGLE */}
            <Card 
                title={t("gRPC API")} 
                icon="Plugs"
                headerExtra={
                    <Switch 
                        checked={apiEnabled}
                        onChange={() => onToggleApi({ tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] })}
                    />
                }
            >
                <p className="text-xs text-slate-500 mb-2">{t("Control Xray via gRPC (Required for panels)")}</p>

                {apiEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-800/50 space-y-4">
                        <SchemaForm
                            schema={ApiSchema}
                            value={localApi}
                            onChange={onUpdateApi}
                            fieldConfigs={{
                                tag: {
                                    label: t("API Outbound Tag"),
                                    help: t("The tag used by other components to refer to this API."),
                                    placeholder: 'api'
                                },
                                listen: {
                                    label: t("Listen Address"),
                                    help: t("gRPC server listen address (IP:port)."),
                                    placeholder: '127.0.0.1:10085'
                                },
                                services: {
                                    label: t("Enabled Services"),
                                    help: t("Services enabled in the gRPC API (comma-separated)."),
                                    placeholder: t("e.g. HandlerService, LoggerService, StatsService")
                                }
                            }}
                        />
                        <div className="p-3 bg-yellow-900/10 border border-yellow-700/30 rounded text-yellow-500 text-xs">
                            {t("Remember to add an inbound with protocol dokodemo-door, listening on 127.0.0.1:10085 and routed to this API tag.")}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};