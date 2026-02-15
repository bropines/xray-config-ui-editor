import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export const DnsHosts = ({ hosts = {}, onChange }: any) => {
    // Используем локальный стейт для "черновика"
    const [entries, setEntries] = useState<{ domain: string, ips: string[] }[]>([]);
    
    // Флаг, чтобы избежать бесконечного цикла обновлений
    const isInternalChange = useRef(false);

    // Загружаем данные из Store только при первом открытии или если данные реально изменились извне (например, через JSON-редактор)
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        const initialEntries = Object.entries(hosts).map(([domain, ips]) => ({ 
            domain, 
            ips: Array.isArray(ips) ? ips : [ips] 
        }));
        setEntries(initialEntries);
    }, [hosts]);

    // Функция обновления Store
    const saveToStore = (currentEntries: typeof entries) => {
        const result: Record<string, any> = {};
        
        currentEntries.forEach(e => {
            const trimmedDomain = e.domain.trim();
            if (!trimmedDomain) return; // Пропускаем пустые домены для Store

            const validIps = e.ips.map(ip => ip.trim()).filter(ip => ip !== "");
            if (validIps.length === 0) return; // Пропускаем домены без IP

            // Сохраняем: если один IP - строка, если много - массив
            result[trimmedDomain] = validIps.length === 1 ? validIps[0] : validIps;
        });

        isInternalChange.current = true;
        onChange(result);
    };

    const addHost = () => {
        const newEntries = [...entries, { domain: "", ips: [""] }];
        setEntries(newEntries);
        // Не вызываем saveToStore здесь, чтобы Store не "схлопнул" пустую строку через props
    };

    const removeHost = (hIdx: number) => {
        const newEntries = entries.filter((_, i) => i !== hIdx);
        setEntries(newEntries);
        saveToStore(newEntries);
    };

    const updateDomain = (hIdx: number, val: string) => {
        const newEntries = [...entries];
        newEntries[hIdx].domain = val;
        setEntries(newEntries);
        saveToStore(newEntries);
    };

    const addIpRow = (hIdx: number) => {
        const newEntries = [...entries];
        newEntries[hIdx].ips.push("");
        setEntries(newEntries);
        // Не сохраняем в Store пустые IP, просто даем пользователю поле
    };

    const removeIpRow = (hIdx: number, ipIdx: number) => {
        const newEntries = [...entries];
        if (newEntries[hIdx].ips.length > 1) {
            newEntries[hIdx].ips.splice(ipIdx, 1);
            setEntries(newEntries);
            saveToStore(newEntries);
        } else {
            removeHost(hIdx);
        }
    };

    const updateIpValue = (hIdx: number, ipIdx: number, val: string) => {
        const newEntries = [...entries];
        newEntries[hIdx].ips[ipIdx] = val;
        setEntries(newEntries);
        saveToStore(newEntries);
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
                    <div key={hIdx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 relative group hover:border-slate-700 transition-colors animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => removeHost(hIdx)} 
                            className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors"
                        >
                            <Icon name="Trash" size={18} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                                <label className="label-xs text-slate-500 mb-1.5 block">Domain Name</label>
                                <input 
                                    className="input-base text-sm font-bold text-white" 
                                    placeholder="example.com"
                                    value={host.domain}
                                    onChange={e => updateDomain(hIdx, e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-7 space-y-2">
                                <label className="label-xs text-slate-500 mb-1.5 block">IP Addresses (v4/v6)</label>
                                {host.ips.map((ip, ipIdx) => (
                                    <div key={ipIdx} className="flex gap-2">
                                        <input 
                                            className="input-base text-xs font-mono text-emerald-400 flex-1" 
                                            placeholder="1.2.3.4"
                                            value={ip}
                                            onChange={e => updateIpValue(hIdx, ipIdx, e.target.value)}
                                        />
                                        <button 
                                            onClick={() => removeIpRow(hIdx, ipIdx)}
                                            className="p-2 text-slate-600 hover:text-rose-500"
                                        >
                                            <Icon name="MinusCircle" />
                                        </button>
                                    </div>
                                ))}
                                
                                <button 
                                    onClick={() => addIpRow(hIdx)}
                                    className="flex items-center gap-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider pl-1 pt-1"
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
                    </div>
                )}
            </div>
        </div>
    );
};