import React from 'react';
import { Switch, Card, SchemaForm } from '../../ui';
import { ApiSchema } from '../../../core/xray/schemas/api.schema';

export const ApiStatsEditor = ({ api, stats, onUpdateApi, onToggleApi, onToggleStats }: any) => {
    const apiEnabled = !!api;
    const statsEnabled = !!stats;
    const localApi = api || { tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] };

    return (
        <div className="space-y-6">
            {/* STATS TOGGLE */}
            <Card 
                title="Statistics" 
                icon="ChartBar"
                headerExtra={
                    <Switch 
                        checked={statsEnabled}
                        onChange={() => onToggleStats({})}
                    />
                }
            >
                <p className="text-xs text-slate-500 mb-2">Enable internal traffic counters (Required for panels)</p>
            </Card>

            {/* API TOGGLE */}
            <Card 
                title="gRPC API" 
                icon="Plugs"
                headerExtra={
                    <Switch 
                        checked={apiEnabled}
                        onChange={() => onToggleApi({ tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] })}
                    />
                }
            >
                <p className="text-xs text-slate-500 mb-2">Control Xray via gRPC (Required for panels)</p>

                {apiEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-800/50 space-y-4">
                        <SchemaForm
                            schema={ApiSchema}
                            value={localApi}
                            onChange={onUpdateApi}
                            fieldConfigs={{
                                tag: {
                                    label: 'API Outbound Tag',
                                    help: 'The tag used by other components to refer to this API.',
                                    placeholder: 'api'
                                },
                                listen: {
                                    label: 'Listen Address',
                                    help: 'gRPC server listen address (IP:port).',
                                    placeholder: '127.0.0.1:10085'
                                },
                                services: {
                                    label: 'Enabled Services',
                                    help: 'Services enabled in the gRPC API (comma-separated).',
                                    placeholder: 'e.g. HandlerService, LoggerService, StatsService'
                                }
                            }}
                        />
                        <div className="p-3 bg-yellow-900/10 border border-yellow-700/30 rounded text-yellow-500 text-xs">
                            Don't forget to add an <b>Inbound</b> with protocol <code>dokodemo-door</code> listening on <code>127.0.0.1:10085</code> routed to this API tag!
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};