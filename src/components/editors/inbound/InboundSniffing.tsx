import React from 'react';

export const InboundSniffing = ({ sniffing, onChange }) => {
    const enabled = sniffing?.enabled || false;
    const destOverride = sniffing?.destOverride || [];

    const toggleType = (type) => {
        if (destOverride.includes(type)) {
            onChange(['sniffing', 'destOverride'], destOverride.filter(t => t !== type));
        } else {
            onChange(['sniffing', 'destOverride'], [...destOverride, type]);
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-indigo-600"
                    checked={enabled}
                    onChange={e => onChange(['sniffing', 'enabled'], e.target.checked)}
                />
                <label className="text-sm font-bold text-slate-300">Sniffing Enabled</label>
            </div>
            
            {enabled && (
                <div className="flex gap-2 pl-6 animate-in fade-in slide-in-from-top-1">
                    {['http', 'tls', 'quic', 'fakedns'].map(type => (
                        <label key={type} className={`
                            flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all
                            ${destOverride.includes(type) 
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' 
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}
                        `}>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={destOverride.includes(type)}
                                onChange={() => toggleType(type)}
                            />
                            {type.toUpperCase()}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};