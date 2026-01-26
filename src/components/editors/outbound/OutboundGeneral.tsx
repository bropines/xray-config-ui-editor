import React from 'react';

export const OutboundGeneral = ({ outbound, onChange }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="label-xs">Tag</label>
                <input 
                    className="input-base font-bold text-blue-400" 
                    value={outbound.tag || ""} 
                    onChange={e => onChange('tag', e.target.value)} 
                />
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