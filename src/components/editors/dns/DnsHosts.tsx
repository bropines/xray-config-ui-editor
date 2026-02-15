import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { isValidDomain, isValidHostDestination } from '../../../utils/validator';

export const DnsHosts = ({ hosts = {}, onChange }: any) => {
    const [entries, setEntries] = useState<{ domain: string, ips: string[] }[]>([]);
    const isInternalChange = useRef(false);

    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        const initialEntries = Object.entries(hosts).map(([domain, ips]) => ({ 
            domain, 
            ips: Array.isArray(ips) ? [...ips] : [ips] 
        }));
        setEntries(initialEntries);
    }, [hosts]);

    const saveToStore = (currentEntries: typeof entries) => {
        const result: Record<string, any> = {};
        currentEntries.forEach(e => {
            const domain = e.domain.trim();
            if (!domain || !isValidDomain(domain)) return;

            const validIps = e.ips.map(ip => ip.trim()).filter(ip => ip !== "" && isValidHostDestination(ip));
            if (validIps.length === 0) return;

            result[domain] = validIps.length === 1 ? validIps[0] : validIps;
        });

        isInternalChange.current = true;
        onChange(result);
    };

    const addHost = () => {
        setEntries([...entries, { domain: "", ips: [""] }]);
    };

    const removeHost = (hIdx: number) => {
        const n = entries.filter((_, i) => i !== hIdx);
        setEntries(n);
        saveToStore(n);
    };

    const updateDomain = (hIdx: number, val: string) => {
        const n = [...entries];
        n[hIdx] = { ...n[hIdx], domain: val };
        setEntries(n);
        saveToStore(n);
    };

    const addIpRow = (hIdx: number) => {
        const n = [...entries];
        n[hIdx] = { ...n[hIdx], ips: [...n[hIdx].ips, ""] };
        setEntries(n);
    };

    const removeIpRow = (hIdx: number, ipIdx: number) => {
        const host = entries[hIdx];
        const newIps = host.ips.filter((_, i) => i !== ipIdx);
        if (newIps.length === 0) {
            removeHost(hIdx);
        } else {
            const n = [...entries];
            n[hIdx] = { ...host, ips: newIps };
            setEntries(n);
            saveToStore(n);
        }
    };

    const updateIpValue = (hIdx: number, ipIdx: number, val: string) => {
        const n = [...entries];
        const newIps = [...n[hIdx].ips];
        newIps[ipIdx] = val;
        n[hIdx] = { ...n[hIdx], ips: newIps };
        setEntries(n);
        saveToStore(n);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <label className="label-xs text-emerald-400">DNS Static Mapping</label>
                    <p className="text-[10px] text-slate-500">Force domains to resolve to specific IPs.</p>
                </div>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={addHost} icon="Plus">
                    Add Host Entry
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2 pb-10">
                {entries.map((host, hIdx) => {
                    const domainIsInvalid = host.domain !== "" && !isValidDomain(host.domain);
                    
                    return (
                        <div key={hIdx} className={`bg-slate-900/50 border rounded-xl p-4 relative group transition-all duration-200 
                            ${domainIsInvalid ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
                            
                            <button onClick={() => removeHost(hIdx)} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors">
                                <Icon name="Trash" size={18} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Domain Column */}
                                <div className="md:col-span-5">
                                    <label className={`label-xs mb-1.5 block ${domainIsInvalid ? 'text-rose-400' : 'text-slate-500'}`}>
                                        Domain Name {domainIsInvalid && "(Invalid)"}
                                    </label>
                                    <input 
                                        className={`input-base text-sm font-bold ${domainIsInvalid ? 'border-rose-500 text-rose-200 bg-rose-950' : 'text-white'}`} 
                                        placeholder="example.com"
                                        value={host.domain}
                                        onChange={e => updateDomain(hIdx, e.target.value)}
                                    />
                                </div>

                                {/* IPs Column */}
                                <div className="md:col-span-7 space-y-2">
                                    <label className="label-xs text-slate-500 mb-1.5 block">IP Addresses / Aliases</label>
                                    {host.ips.map((ip, ipIdx) => {
                                        // ЖЕСТКАЯ ВАЛИДАЦИЯ КАЖДОГО ПОЛЯ
                                        const ipIsInvalid = ip.trim() !== "" && !isValidHostDestination(ip.trim());

                                        return (
                                            <div key={ipIdx} className="flex flex-col gap-1">
                                                <div className="flex gap-2">
                                                    <input 
                                                        className={`input-base text-xs font-mono flex-1 transition-all
                                                            ${ipIsInvalid 
                                                                ? 'border-rose-500! bg-rose-500/10! text-rose-200!' 
                                                                : 'text-emerald-400 focus:border-indigo-500'}`} 
                                                        placeholder="1.2.3.4"
                                                        value={ip}
                                                        onChange={e => updateIpValue(hIdx, ipIdx, e.target.value)}
                                                    />
                                                    <button onClick={() => removeIpRow(hIdx, ipIdx)} className="p-2 text-slate-600 hover:text-rose-500">
                                                        <Icon name="MinusCircle" />
                                                    </button>
                                                </div>
                                                {ipIsInvalid && (
                                                    <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter animate-pulse ml-1">
                                                        Invalid IP / Alias
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => addIpRow(hIdx)} className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase hover:text-indigo-300">
                                        <Icon name="PlusCircle" /> Add another IP
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {entries.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl">
                        <Icon name="Globe" size={48} className="mx-auto text-slate-800 mb-4" />
                        <p className="text-slate-500 text-sm">No static hosts configured.</p>
                    </div>
                )}
            </div>
        </div>
    );
};