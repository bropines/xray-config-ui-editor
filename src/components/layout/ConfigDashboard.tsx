import React from 'react';
import { Icon } from '../ui';
import { Button } from '../ui';
import { JsonField } from '../ui';
import type { XrayConfig } from '../../core/types';

// Re-usable column Card for the dashboard
interface DashCardProps {
    title: string;
    icon: string;
    color: string;
    actions: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

const DashCard = ({ title, icon, color, children, actions, className = '' }: DashCardProps) => (
    <div className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color} text-white shadow-lg`}>
                    <Icon name={icon} className="text-xl" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            </div>
            <div className="flex gap-2">{actions}</div>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-900/30 min-h-0">
            {children}
        </div>
    </div>
);

interface ConfigDashboardProps {
    config: XrayConfig;
    rawMode: boolean;
    setRawMode: (v: boolean) => void;
    setConfig: (cfg: XrayConfig | null) => void;
    onEditInbound: (data: any, index: number | null) => void;
    onDeleteInbound: (index: number) => void;
    onOpenInboundJson: () => void;
    onAddInbound: () => void;
    onEditRouting: () => void;
    onOpenRoutingJson: () => void;
    onEditOutbound: (data: any, index: number | null) => void;
    onDeleteOutbound: (index: number) => void;
    onOpenOutboundJson: () => void;
    onAddOutbound: () => void;
    onBatchImport: () => void;
    onEditDns: () => void;
    onOpenDnsJson: () => void;
    filteredOutbounds: any[];
    obSearch: string;
    setObSearch: (v: string) => void;
    modulesVisible: boolean;
    setModulesVisible: (v: boolean) => void;
    onOpenSettings: () => void;
    onOpenReverse: () => void;
    onOpenTopology: () => void;
    onOpenGeoViewer: () => void;
}

export const ConfigDashboard = ({
    config,
    rawMode,
    setRawMode,
    setConfig,
    onEditInbound,
    onDeleteInbound,
    onOpenInboundJson,
    onAddInbound,
    onEditRouting,
    onOpenRoutingJson,
    onEditOutbound,
    onDeleteOutbound,
    onOpenOutboundJson,
    onAddOutbound,
    onBatchImport,
    onEditDns,
    onOpenDnsJson,
    filteredOutbounds,
    obSearch,
    setObSearch,
    modulesVisible,
    setModulesVisible,
    onOpenSettings,
    onOpenReverse,
    onOpenTopology,
    onOpenGeoViewer,
}: ConfigDashboardProps) => (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Toolbar */}
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-xl shadow-lg gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="font-bold text-slate-300 flex items-center gap-2 text-sm md:text-base">
                        <Icon name="SlidersHorizontal" /> Core Modules
                    </h2>
                    <button
                        onClick={() => setModulesVisible(!modulesVisible)}
                        className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Icon name={modulesVisible ? 'CaretUp' : 'CaretDown'} weight="bold" />
                    </button>
                </div>

                <div className="hidden md:block w-px h-6 bg-slate-800" />

                <div className={`${modulesVisible ? 'flex' : 'hidden md:flex'} flex-wrap gap-2 w-full md:w-auto animate-in fade-in slide-in-from-top-1 duration-200`}>
                    <Button className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2" variant="secondary" onClick={onOpenSettings} icon="Gear">
                        Core Settings
                    </Button>
                    <Button className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2" variant="secondary" onClick={onOpenReverse} icon="ArrowsLeftRight">
                        Reverse Proxy
                    </Button>
                    <Button className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2" variant="secondary" onClick={onOpenTopology} icon="GitMerge">
                        Topology
                    </Button>
                    <Button className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2" variant="secondary" onClick={onOpenGeoViewer} icon="GlobeHemisphereWest">
                        Geo Viewer
                    </Button>
                </div>
            </div>

            <div className={`${modulesVisible ? 'flex' : 'hidden md:flex'} flex-wrap gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-slate-800 md:border-transparent animate-in fade-in slide-in-from-top-1 duration-200`}>
                <Button
                    variant="secondary"
                    onClick={() => setRawMode(!rawMode)}
                    icon={rawMode ? 'Layout' : 'Code'}
                    className={`flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2 ${rawMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : ''}`}
                >
                    {rawMode ? 'UI Mode' : 'JSON Mode'}
                </Button>
                <Button
                    variant="danger"
                    className="text-[10px] md:text-xs px-3 py-1.5 md:py-2 flex-1 md:flex-none"
                    onClick={() => { if (confirm('Clear config?')) setConfig(null as any); }}
                    icon="XCircle"
                    title="Close Config"
                >
                    <span className="md:inline">Clear</span>
                </Button>
            </div>
        </div>

        {/* Content */}
        {rawMode ? (
            <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 shadow-2xl flex flex-col">
                <JsonField
                    label="Full Configuration (Auto-saved)"
                    value={config}
                    onChange={(newConfig: any) => { if (newConfig) setConfig(newConfig); }}
                    className="flex-1 relative min-h-0"
                />
            </div>
        ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scroll pb-6">
                <div className="flex flex-col xl:grid xl:grid-cols-3 gap-3 xl:flex-1 xl:min-h-0">
                    {/* Inbounds */}
                    <DashCard
                        title={`Inbounds (${config.inbounds?.length || 0})`}
                        icon="ArrowCircleDown"
                        color="bg-emerald-600"
                        className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
                        actions={
                            <div className="flex gap-1">
                                <Button variant="ghost" className="p-1.5" onClick={onOpenInboundJson} icon="Code" title="View JSON" />
                                <Button variant="ghost" onClick={onAddInbound} icon="Plus" />
                            </div>
                        }
                    >
                        {(config.inbounds || []).map((ib: any, i: number) => (
                            <div key={i} className="card-item group flex justify-between items-start">
                                <div className="min-w-0 pr-2">
                                    <div className="font-bold text-emerald-400 text-sm flex items-center gap-2 truncate">
                                        <Icon name="Hash" /> {ib.tag || 'no-tag'}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 font-mono pl-6 truncate">
                                        {ib.protocol} : {ib.port}
                                    </div>
                                </div>
                                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditInbound(ib, i)} className="btn-icon">
                                        <Icon name="PencilSimple" />
                                    </button>
                                    <button onClick={() => onDeleteInbound(i)} className="btn-icon-danger">
                                        <Icon name="Trash" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </DashCard>

                    {/* Routing */}
                    <DashCard
                        title="Routing"
                        icon="ArrowsSplit"
                        color="bg-purple-600"
                        className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
                        actions={
                            <div className="flex gap-1">
                                <Button variant="ghost" className="p-1.5" onClick={onOpenRoutingJson} icon="Code" title="View JSON" />
                                <Button variant="ghost" onClick={onEditRouting} icon="PencilSimple">Edit</Button>
                            </div>
                        }
                    >
                        <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20 flex justify-between px-4 shrink-0">
                            <span className="opacity-70">Strategy:</span>
                            <span className="font-bold text-white">{config.routing?.domainStrategy || 'AsIs'}</span>
                        </div>
                        <div className="space-y-2">
                            {(config.routing?.rules || []).slice(0, 20).map((rule: any, i: number) => {
                                const hasName = !!rule.ruleTag;
                                const conditions: string[] = [];
                                if (rule.domain) conditions.push(`${rule.domain.length} dom`);
                                if (rule.ip) conditions.push(`${rule.ip.length} ip`);
                                if (rule.port) conditions.push('port');
                                if (rule.protocol) conditions.push('proto');
                                if (rule.inboundTag) conditions.push('inbound');
                                if (conditions.length === 0) conditions.push('match all');
                                const isBalancer = !!rule.balancerTag;
                                const target = rule.outboundTag || rule.balancerTag || 'null';
                                return (
                                    <div key={i} className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBalancer ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                                <span className={`font-bold truncate ${hasName ? 'text-white' : 'text-slate-400 font-mono'}`}>
                                                    {rule.ruleTag || conditions.join(', ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                                <Icon name="ArrowRight" className="text-slate-700 text-[10px]" />
                                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 max-w-[100px] truncate ${isBalancer ? 'text-purple-400' : 'text-blue-400'}`}>
                                                    {target}
                                                </span>
                                            </div>
                                        </div>
                                        {hasName && (
                                            <div className="text-[10px] text-slate-500 font-mono pl-3.5 truncate">
                                                {conditions.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {(config.routing?.rules || []).length === 0 && (
                                <div className="text-center text-slate-600 py-8 italic text-xs">
                                    No routing rules.<br />Traffic will follow the first outbound.
                                </div>
                            )}
                            {(config.routing?.rules || []).length > 20 && (
                                <div className="text-center text-xs text-slate-500 italic pt-2 border-t border-slate-800">
                                    ... +{(config.routing?.rules || []).length - 20} more rules
                                </div>
                            )}
                        </div>
                    </DashCard>

                    {/* Outbounds */}
                    <DashCard
                        title={`Outbounds (${config.outbounds?.length || 0})`}
                        icon="ArrowCircleUp"
                        color="bg-blue-600"
                        className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
                        actions={
                            <div className="flex gap-2 items-center">
                                <div className="relative hidden md:block">
                                    <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                                    <input
                                        className="bg-slate-900 border border-slate-700 rounded-md pl-7 pr-2 py-1 text-[10px] w-32 outline-none focus:w-48 focus:border-indigo-500 transition-all text-white placeholder:text-slate-600"
                                        placeholder="Filter IP, Tag..."
                                        value={obSearch}
                                        onChange={e => setObSearch(e.target.value)}
                                    />
                                </div>
                                <Button variant="ghost" className="p-1.5" onClick={onBatchImport} icon="Stack" title="Batch Import/Export" />
                                <Button variant="ghost" className="p-1.5" onClick={onOpenOutboundJson} icon="Code" title="View JSON" />
                                <Button variant="ghost" onClick={onAddOutbound} icon="Plus" title="Add New Outbound" />
                            </div>
                        }
                    >
                        <div className="md:hidden mb-3 relative shrink-0">
                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                className="input-base pl-8 text-xs py-2 bg-slate-950/50"
                                placeholder="Search outbounds..."
                                value={obSearch}
                                onChange={e => setObSearch(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            {filteredOutbounds.length > 0 ? filteredOutbounds.map((ob: any) => (
                                <div key={ob.i} className="card-item group flex justify-between items-start">
                                    <div className="min-w-0 pr-2">
                                        <div className="font-bold text-blue-400 text-sm flex items-center gap-2 truncate">
                                            <Icon name="PaperPlaneRight" />
                                            {ob.tag || 'no-tag'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 font-mono pl-6 truncate">
                                            <span className="text-blue-500/70">{ob.protocol}</span>
                                            {ob.protocol !== 'freedom' && ob.protocol !== 'blackhole' && (
                                                <>
                                                    <span className="mx-1 text-slate-600">•</span>
                                                    {ob.settings?.vnext?.[0]?.address || ob.settings?.servers?.[0]?.address || ob.settings?.address || 'no-address'}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEditOutbound(ob, ob.i)} className="btn-icon" title="Edit">
                                            <Icon name="PencilSimple" />
                                        </button>
                                        <button onClick={() => onDeleteOutbound(ob.i)} className="btn-icon-danger" title="Delete">
                                            <Icon name="Trash" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 opacity-50">
                                    <Icon name="MagnifyingGlass" className="mx-auto text-3xl mb-2" />
                                    <p className="text-xs">No outbounds match your search</p>
                                </div>
                            )}
                        </div>
                    </DashCard>
                </div>

                {/* DNS */}
                <DashCard
                    title="DNS"
                    icon="Globe"
                    color="bg-indigo-600"
                    className="shrink-0 w-full"
                    actions={
                        <div className="flex gap-1">
                            <Button variant="ghost" className="p-1.5" onClick={onOpenDnsJson} icon="Code" title="View JSON" />
                            <Button variant="ghost" onClick={onEditDns} icon="PencilSimple">Edit</Button>
                        </div>
                    }
                >
                    {config.dns ? (
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                            <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                                <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                    <span className="text-slate-500 block text-[10px] uppercase">Servers</span>
                                    <span className="text-white font-bold font-mono text-lg">{config.dns.servers?.length || 0}</span>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                    <span className="text-slate-500 block text-[10px] uppercase">Hosts</span>
                                    <span className="text-white font-bold font-mono text-lg">{Object.keys(config.dns.hosts || {}).length}</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 md:border-l border-slate-800 md:pl-4 flex flex-col gap-1 min-w-[200px]">
                                <div className="flex justify-between">
                                    <span>Strategy:</span>
                                    <span className="text-indigo-300 font-bold">{config.dns.queryStrategy || 'UseIP'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Client IP:</span>
                                    <span className="font-mono text-slate-500">{config.dns.clientIp || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500 text-xs">
                            DNS not configured. Click Edit to initialize defaults.
                        </div>
                    )}
                </DashCard>
            </div>
        )}
    </div>
);
