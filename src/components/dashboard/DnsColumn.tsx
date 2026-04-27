import React from 'react';
import { Card } from '../ui/Card';
import { Button, ButtonGroup } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface DnsColumnProps {
    dns: any;
    initDns: () => void;
    openSectionJson: (section: string, title: string) => void;
    setModal: (modal: any) => void;
}

export const DnsColumn = ({
    dns,
    initDns,
    openSectionJson,
    setModal
}: DnsColumnProps) => {
    return (
        <Card 
            title="DNS Configuration" 
            icon="Globe" 
            iconColor="bg-indigo-600"
            className="shrink-0 w-full" 
            actions={
                <ButtonGroup>
                    <Button variant="ghost" size="sm" onClick={() => openSectionJson("dns", "DNS Config")} icon="Code" title="View JSON" />
                    <Button variant="ghost" size="sm" onClick={() => { if(!dns) initDns(); setModal({ type: 'dns', data: null, index: null }); }} icon="PencilSimple" title="Edit DNS" />
                </ButtonGroup>
            }
        >
            {dns ? (
                <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-center py-1 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 flex items-center justify-between px-5 shadow-inner group/stat">
                            <div>
                                <span className="text-slate-600 block text-[9px] uppercase font-black tracking-widest mb-0.5">Servers</span>
                                <span className="text-slate-100 font-black font-mono text-xl group-hover/stat:text-indigo-400 transition-colors">{dns.servers?.length || 0}</span>
                            </div>
                            <Icon name="Server" className="text-slate-700 text-xl" weight="duotone" />
                        </div>
                        <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 flex items-center justify-between px-5 shadow-inner group/stat">
                            <div>
                                <span className="text-slate-600 block text-[9px] uppercase font-black tracking-widest mb-0.5">Hosts</span>
                                <span className="text-slate-100 font-black font-mono text-xl group-hover/stat:text-indigo-400 transition-colors">{Object.keys(dns.hosts || {}).length}</span>
                            </div>
                            <Icon name="List" className="text-slate-700 text-xl" weight="duotone" />
                        </div>
                    </div>
                    
                    <div className="w-px h-10 bg-slate-800/80 hidden md:block" />

                    <div className="text-[11px] text-slate-400 flex flex-col gap-2 min-w-[220px] bg-slate-900/30 p-3 rounded-2xl border border-slate-800/50">
                        <div className="flex justify-between items-center px-1">
                            <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">Query Strategy</span>
                            <span className="text-indigo-400 font-black uppercase">{dns.queryStrategy || "UseIP"}</span>
                        </div>
                        <div className="flex justify-between items-center px-1">
                            <span className="font-bold text-slate-500 uppercase tracking-tighter text-[9px]">Client IP</span>
                            <span className="font-mono text-slate-300 font-bold bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">{dns.clientIp || "None"}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 opacity-30 gap-3 grayscale cursor-pointer hover:opacity-50 transition-opacity" onClick={initDns}>
                    <Icon name="Globe" size={32} weight="thin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Initialize DNS Defaults</p>
                </div>
            )}
        </Card>
    );
};
