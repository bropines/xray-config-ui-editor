import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export const DnsHosts = ({ hosts = {}, onChange }) => {
    // Преобразуем объект в массив для удобного редактирования
    const [entries, setEntries] = useState(Object.entries(hosts).map(([k, v]) => ({ domain: k, ip: Array.isArray(v) ? v[0] : v })));

    const sync = (newEntries) => {
        setEntries(newEntries);
        // Обратно в объект
        const newHosts = {};
        newEntries.forEach(e => {
            if (e.domain && e.ip) newHosts[e.domain] = e.ip;
        });
        onChange(newHosts);
    };

    const addEntry = () => sync([...entries, { domain: "", ip: "" }]);
    const removeEntry = (idx) => {
        const n = [...entries];
        n.splice(idx, 1);
        sync(n);
    };
    const updateEntry = (idx, field, val) => {
        const n = [...entries];
        n[idx][field] = val;
        sync(n);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <label className="label-xs">Static Hosts</label>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addEntry} icon="Plus">Add Host</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1">
                {entries.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800">
                        <input className="flex-1 bg-transparent text-xs text-white font-mono outline-none placeholder:text-slate-700" 
                            placeholder="domain.com"
                            value={entry.domain}
                            onChange={e => updateEntry(i, 'domain', e.target.value)}
                        />
                        <span className="text-slate-600">:</span>
                        <input className="flex-1 bg-transparent text-xs text-emerald-400 font-mono outline-none text-right placeholder:text-slate-700" 
                            placeholder="1.2.3.4"
                            value={entry.ip}
                            onChange={e => updateEntry(i, 'ip', e.target.value)}
                        />
                        <button onClick={() => removeEntry(i)} className="text-slate-600 hover:text-rose-500 p-1"><Icon name="Trash" /></button>
                    </div>
                ))}
                {entries.length === 0 && <div className="text-center text-slate-600 text-xs py-8">No static hosts.</div>}
            </div>
        </div>
    );
};