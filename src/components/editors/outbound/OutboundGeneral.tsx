import React from 'react';

export const OutboundGeneral = ({ outbound, onChange, errors = {} }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="label-xs">Tag</label>
                <input 
                    className={`input-base font-bold text-blue-400 ${errors.tag ? 'border-rose-500 bg-rose-500/10 focus:border-rose-500' : ''}`}
                    value={outbound.tag || ""} 
                    onChange={e => onChange('tag', e.target.value)} 
                />
                {errors.tag && <span className="text-[10px] text-rose-500 mt-1 block">{errors.tag}</span>}
            </div>
            <div>
                <label className="label-xs">Protocol</label>
                <select 
                    className="input-base" 
                    value={outbound.protocol} 
                    onChange={e => onChange('protocol', e.target.value)}
                >
                    {["freedom", "blackhole", "vless", "vmess", "trojan", "shadowsocks", "wireguard", "dns", "socks", "http"].map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};