import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { Icon } from '../../ui/Icon';

export const ApiStatsEditor = ({ api, stats, onUpdateApi, onToggleApi, onToggleStats }: any) => {
    return (
        <Card title="API & Statistics" icon="ChartBar" iconColor="bg-emerald-600">
            <div className="space-y-8">
                {/* --- API Section --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Icon name="Plug" weight="bold" /> Xray Remote API
                        </h5>
                        <Switch checked={!!api} onChange={onToggleApi} />
                    </div>
                    {api && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950/40 rounded-2xl border border-slate-800 animate-in zoom-in-95 duration-200">
                            <FormField label="API Tag" help="Tag for the API inbound.">
                                <Input 
                                    value={api.tag || ""} 
                                    placeholder="api"
                                    onChange={e => onUpdateApi({ ...api, tag: e.target.value })} 
                                />
                            </FormField>
                            <FormField label="Services" help="Enabled API services.">
                                <Input 
                                    value={api.services?.join(', ') || ""} 
                                    placeholder="HandlerService, StatsService"
                                    onChange={e => onUpdateApi({ ...api, services: e.target.value.split(',').map((s: string) => s.trim()) })} 
                                />
                            </FormField>
                        </div>
                    )}
                </div>

                {/* --- Stats Section --- */}
                <div className="pt-6 border-t border-slate-800/80">
                    <div className="flex justify-between items-center px-1">
                        <div className="space-y-0.5">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Icon name="Activity" weight="bold" /> Internal Statistics
                            </h5>
                            <p className="text-[9px] text-slate-600 font-medium uppercase tracking-tighter">Collect traffic and system metrics</p>
                        </div>
                        <Switch checked={!!stats} onChange={onToggleStats} />
                    </div>
                </div>
            </div>
        </Card>
    );
};
