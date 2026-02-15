import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export const DnsHosts = ({ hosts = {}, onChange }: any) => {
    // Преобразуем объект Record<string, string | string[]> в удобный массив для UI
    const [entries, setEntries] = useState(() => 
        Object.entries(hosts).map(([domain, ips]) => ({ 
            domain, 
            ips: Array.isArray(ips) ? ips : [ips] 
        }))
    );

    // Синхронизация при внешних изменениях
    useEffect(() => {
        setEntries(Object.entries(hosts).map(([domain, ips]) => ({ 
            domain, 
            ips: Array.isArray(ips) ? ips : [ips] 
        })));
    }, [hosts]);

    const sync = (newEntries: any[]) => {
        setEntries(newEntries);
        const result: Record<string, any> = {};
        
        newEntries.forEach(e => {
            if (!e.domain.trim()) return;
            const validIps = e.ips.filter((ip: string) => ip.trim() !== "");
            if (validIps.length === 0) return;

            // Если IP один - сохраняем строкой, если много - массивом
            result[e.domain] = validIps.length === 1 ? validIps[0] : validIps;
        });
        onChange(result);
    };

    const addHost = () => sync([...entries, { domain: "", ips: [""] }]);

    const removeHost = (hIdx: number) => {
        const n = [...entries];
        n.splice(hIdx, 1);
        sync(n);
    };

    const updateDomain = (hIdx: number, val: string) => {
        const n = [...entries];
        n[hIdx].domain = val;
        sync(n);
    };

    // --- Логика управления списком IP внутри хоста ---
    const addIpRow = (hIdx: number) => {
        const n = [...entries];
        n[hIdx].ips.push("");
        sync(n);
    };

    const removeIpRow = (hIdx: number, ipIdx: number) => {
        const n = [...entries];
        if (n[hIdx].ips.length > 1) {
            n[hIdx].ips.splice(ipIdx, 1);
            sync(n);
        } else {
            // Если это последний IP, удаляем весь хост
            removeHost(hIdx);
        }
    };

    const updateIpValue = (hIdx: number, ipIdx: number, val: string) => {
        const n = [...entries];
        n[hIdx].ips[ipIdx] = val;
        sync(n);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <label className="label-xs text-emerald-400">DNS Static Mapping</label>
                    <p className="text-[10px] text-slate-500">Force domains to resolve to specific IP addresses.</p>
                </div>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addHost} icon="Plus">
                    Add Host Entry
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2 pb-10">
                {entries.map((host, hIdx) => (
                    <div key={hIdx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 relative group hover:border-slate-700 transition-colors">
                        <button 
                            onClick={() => removeHost(hIdx)} 
                            className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors"
                            title="Remove entire host"
                        >
                            <Icon name="Trash" size={18} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Domain Column */}
                            <div className="md:col-span-5">
                                <label className="label-xs text-slate-500 mb-1.5 block">Domain Name</label>
                                <input 
                                    className="input-base text-sm font-bold text-white" 
                                    placeholder="example.com"
                                    value={host.domain}
                                    onChange={e => updateDomain(hIdx, e.target.value)}
                                />
                            </div>

                            {/* IPs Column */}
                            <div className="md:col-span-7 space-y-2">
                                <label className="label-xs text-slate-500 mb-1.5 block">IP Addresses (v4/v6)</label>
                                {host.ips.map((ip, ipIdx) => (
                                    <div key={ipIdx} className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <input 
                                            className="input-base text-xs font-mono text-emerald-400 flex-1" 
                                            placeholder="1.2.3.4 or 2620:fe::fe"
                                            value={ip}
                                            onChange={e => updateIpValue(hIdx, ipIdx, e.target.value)}
                                        />
                                        <button 
                                            onClick={() => removeIpRow(hIdx, ipIdx)}
                                            className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                                        >
                                            <Icon name="MinusCircle" />
                                        </button>
                                    </div>
                                ))}
                                
                                <button 
                                    onClick={() => addIpRow(hIdx)}
                                    className="flex items-center gap-2 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-bold uppercase tracking-wider pl-1 pt-1"
                                >
                                    <Icon name="PlusCircle" />
                                    Add another IP
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {entries.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl">
                        <Icon name="Globe" size={48} className="mx-auto text-slate-800 mb-4" />
                        <p className="text-slate-500 text-sm">No static hosts configured.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Useful for ad-blocking or local routing bypass.</p>
                    </div>
                )}
            </div>
        </div>
    );
};