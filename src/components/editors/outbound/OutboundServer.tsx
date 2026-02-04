import React from 'react';

export const OutboundServer = ({ outbound, onChange, errors = {} }: any) => {
    const proto = outbound.protocol;
    
    if (!['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(proto)) return null;

    const isShadowsocks = proto === 'shadowsocks';
    const rootKey = isShadowsocks ? 'servers' : 'vnext';
    
    const serverObj = outbound.settings?.[rootKey]?.[0] || {};
    const userObj = isShadowsocks ? serverObj : (serverObj.users?.[0] || {});

    const updateServer = (field: string, value: any) => {
        const currentServers = outbound.settings?.[rootKey] || [{}];
        // ИСПРАВЛЕНИЕ: Создаем полностью новый массив и новый объект внутри него
        const newRoot = [
            { 
                ...(currentServers[0] || {}), 
                [field]: value 
            },
            ...currentServers.slice(1)
        ];
        onChange(['settings', rootKey], newRoot);
    };

    const updateUser = (field: string, value: any) => {
        if (isShadowsocks) {
            updateServer(field, value);
        } else {
            const currentVnext = outbound.settings?.vnext || [{}];
            const firstServer = currentVnext[0] || {};
            const currentUsers = firstServer.users || [{}];

            // ИСПРАВЛЕНИЕ: Глубокое копирование через spread-оператор
            const newUsers = [
                { 
                    ...(currentUsers[0] || {}), 
                    [field]: value 
                },
                ...currentUsers.slice(1)
            ];

            const newRoot = [
                { 
                    ...firstServer, 
                    users: newUsers 
                },
                ...currentVnext.slice(1)
            ];
            onChange(['settings', rootKey], newRoot);
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <h4 className="label-xs border-b border-slate-800 pb-2 mb-3">Remote Server</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                    <label className="label-xs">Address</label>
                    <input 
                        className={`input-base font-mono ${errors.address ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={serverObj.address || ""}
                        onChange={e => updateServer('address', e.target.value)}
                        placeholder="example.com"
                    />
                    {errors.address && <span className="text-[10px] text-rose-500">{errors.address}</span>}
                </div>
                <div>
                    <label className="label-xs">Port</label>
                    <input 
                        type="number" 
                        className={`input-base font-mono ${errors.port ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={serverObj.port || 0}
                        onChange={e => updateServer('port', parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${proto === 'vless' || isShadowsocks ? 'md:col-span-2' : ''}`}>
                    <label className="label-xs">
                        {proto === 'trojan' || proto === 'shadowsocks' || proto === 'socks' ? 'Password' : 'UUID'}
                    </label>
                    <input 
                        className="input-base font-mono text-xs" 
                        value={isShadowsocks ? (serverObj.password || "") : (userObj[proto === 'trojan' ? 'password' : 'id'] || "")}
                        onChange={e => updateUser(proto === 'trojan' || isShadowsocks ? 'password' : 'id', e.target.value)}
                    />
                </div>

                {proto === 'vless' && (
                    <div className="md:col-span-2">
                        <label className="label-xs">Flow</label>
                        <select 
                            className="input-base"
                            value={userObj.flow || ""}
                            onChange={e => updateUser('flow', e.target.value)}
                        >
                            <option value="">None</option>
                            <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};