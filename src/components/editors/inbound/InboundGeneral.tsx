import React from 'react';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange }) => {
    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1">
                <label className="label-xs">Protocol</label>
                <select 
                    className="input-base font-bold text-indigo-400"
                    value={inbound.protocol} 
                    onChange={e => onProtocolChange(e.target.value)}
                >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                    <option value="socks">Socks</option>
                    <option value="http">HTTP</option>
                    <option value="dokodemo-door">Dokodemo</option>
                </select>
            </div>
            <div className="col-span-1">
                <label className="label-xs">Port</label>
                <input 
                    type="number" 
                    className="input-base font-mono"
                    value={inbound.port} 
                    onChange={e => onChange('port', parseInt(e.target.value) || 0)} 
                />
            </div>
            <div className="col-span-1">
                <label className="label-xs">Listen IP</label>
                <input 
                    className="input-base font-mono"
                    placeholder="0.0.0.0" 
                    value={inbound.listen || ""} 
                    onChange={e => onChange('listen', e.target.value)} 
                />
            </div>
            <div className="col-span-1">
                <label className="label-xs">Tag</label>
                <input 
                    className="input-base"
                    value={inbound.tag} 
                    onChange={e => onChange('tag', e.target.value)} 
                />
            </div>
        </div>
    );
};