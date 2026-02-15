import React from 'react';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    const isTun = inbound.protocol === 'tun';

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                    {/* Добавлено */}
                    <option value="tun">TUN (Transparent)</option> 
                </select>
            </div>

            {/* Скрываем порт для TUN, либо делаем необязательным */}
            {!isTun && (
                <div className="col-span-1">
                    <label className="label-xs">Port</label>
                    <input 
                        type="number" 
                        className={`input-base font-mono ${errors.port ? 'border-rose-500 bg-rose-500/10 focus:border-rose-500' : ''}`}
                        value={inbound.port} 
                        onChange={e => onChange('port', parseInt(e.target.value) || 0)} 
                    />
                    {errors.port && <span className="text-[10px] text-rose-500 mt-1 block">{errors.port}</span>}
                </div>
            )}

            {/* Для TUN Listen IP тоже не нужен, но можно оставить для единообразия, Xray его проигнорирует */}
            {!isTun && (
                <div className="col-span-1">
                    <label className="label-xs">Listen IP</label>
                    <input 
                        className="input-base font-mono"
                        placeholder="0.0.0.0" 
                        value={inbound.listen || ""} 
                        onChange={e => onChange('listen', e.target.value)} 
                    />
                </div>
            )}

            <div className="col-span-1">
                <label className="label-xs">Tag</label>
                <input 
                    className={`input-base ${errors.tag ? 'border-rose-500 bg-rose-500/10 focus:border-rose-500' : ''}`}
                    value={inbound.tag} 
                    onChange={e => onChange('tag', e.target.value)} 
                />
                {errors.tag && <span className="text-[10px] text-rose-500 mt-1 block">{errors.tag}</span>}
            </div>
        </div>
    );
};