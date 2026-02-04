import React from 'react';

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    const proto = outbound.protocol;
    if (!['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(proto)) return null;

    const settings = outbound.settings || {};
    
    // Опеределяем структуру: vnext (vless/vmess), servers (ss/trojan/socks/http) или плоская
    const isVnext = Array.isArray(settings.vnext) && settings.vnext.length > 0;
    const isServers = Array.isArray(settings.servers) && settings.servers.length > 0;
    const isFlat = !!settings.address || !!settings.id || !!settings.password;

    // Извлекаем текущие значения
    let currentAddress = "";
    let currentPort: number | string = 0;
    let currentKey = ""; // id или password
    let currentFlow = "";

    if (isVnext) {
        const s = settings.vnext[0];
        currentAddress = s.address || "";
        currentPort = s.port || 0;
        currentKey = s.users?.[0]?.id || "";
        currentFlow = s.users?.[0]?.flow || "";
    } else if (isServers) {
        const s = settings.servers[0];
        currentAddress = s.address || "";
        currentPort = s.port || 0;
        currentKey = s.password || s.id || "";
    } else if (isFlat) {
        currentAddress = settings.address || "";
        currentPort = settings.port || 0;
        currentKey = settings.id || settings.password || "";
        currentFlow = settings.flow || "";
    }

    // Универсальная функция обновления
    const update = (field: 'address' | 'port' | 'key' | 'flow', value: any) => {
        const newSettings = JSON.parse(JSON.stringify(settings));

        if (isVnext) {
            if (field === 'address' || field === 'port') newSettings.vnext[0][field] = value;
            if (field === 'key') newSettings.vnext[0].users[0].id = value;
            if (field === 'flow') newSettings.vnext[0].users[0].flow = value;
        } else if (isServers) {
            const keyName = (proto === 'trojan' || proto === 'shadowsocks') ? 'password' : 'id';
            if (field === 'address' || field === 'port') newSettings.servers[0][field] = value;
            if (field === 'key') newSettings.servers[0][keyName] = value;
        } else {
            // ПЛОСКАЯ СТРУКТУРА (твой случай)
            if (field === 'key') {
                const keyName = (proto === 'trojan' || proto === 'shadowsocks') ? 'password' : 'id';
                newSettings[keyName] = value;
            } else {
                newSettings[field] = value;
            }
        }

        onChange('settings', newSettings);
    };

    const keyLabel = (proto === 'trojan' || proto === 'shadowsocks' || proto === 'socks') ? 'Password' : 'UUID';

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                <h4 className="label-xs text-slate-400">Remote Server</h4>
                <span className="text-[9px] text-slate-600 font-mono uppercase">
                    Format: {isVnext ? 'vnext' : isServers ? 'servers' : 'flat'}
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                    <label className="label-xs">Address</label>
                    <input 
                        className={`input-base font-mono ${errors.address ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={currentAddress}
                        onChange={e => update('address', e.target.value)}
                        placeholder="example.com"
                    />
                    {errors.address && <span className="text-[10px] text-rose-500">{errors.address}</span>}
                </div>
                <div>
                    <label className="label-xs">Port</label>
                    <input 
                        type="number" 
                        className={`input-base font-mono ${errors.port ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={currentPort}
                        onChange={e => update('port', parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${proto !== 'vless' ? 'md:col-span-2' : ''}`}>
                    <label className="label-xs">{keyLabel}</label>
                    <input 
                        className="input-base font-mono text-xs" 
                        value={currentKey}
                        onChange={e => update('key', e.target.value)}
                        placeholder="Your ID or Password"
                    />
                </div>

                {proto === 'vless' && (
                    <div>
                        <label className="label-xs">Flow</label>
                        <select 
                            className="input-base"
                            value={currentFlow}
                            onChange={e => update('flow', e.target.value)}
                        >
                            <option value="">None</option>
                            <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                            <option value="xtls-rprx-vision-udp443">xtls-rprx-vision-udp443</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};