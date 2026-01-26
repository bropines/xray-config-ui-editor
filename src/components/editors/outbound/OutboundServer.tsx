import React from 'react';

export const OutboundServer = ({ outbound, onChange }) => {
    const proto = outbound.protocol;
    
    // Если протокол не требует настройки удаленного сервера, ничего не рендерим
    if (!['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(proto)) return null;

    // Определяем пути к данным
    const isShadowsocks = proto === 'shadowsocks';
    const rootKey = isShadowsocks ? 'servers' : 'vnext'; // shadowsocks использует 'servers', остальные 'vnext'
    
    // Получаем текущие значения (безопасное чтение)
    const serverObj = outbound.settings?.[rootKey]?.[0] || {};
    const userObj = isShadowsocks ? serverObj : (serverObj.users?.[0] || {});

    // Хелпер для обновления
    const updateServer = (field, value) => {
        const newRoot = [...(outbound.settings?.[rootKey] || [{}])];
        if(!newRoot[0]) newRoot[0] = {};
        newRoot[0][field] = value;
        onChange(['settings', rootKey], newRoot);
    };

    const updateUser = (field, value) => {
        if (isShadowsocks) {
            updateServer(field, value); // У SS пароль лежит прямо в объекте сервера
        } else {
            const newRoot = [...(outbound.settings?.[rootKey] || [{}])];
            if(!newRoot[0]) newRoot[0] = {};
            if(!newRoot[0].users) newRoot[0].users = [{}];
            newRoot[0].users[0][field] = value;
            onChange(['settings', rootKey], newRoot);
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <h4 className="label-xs border-b border-slate-800 pb-2 mb-3">Remote Server</h4>
            
            {/* Address & Port */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-2">
                    <label className="label-xs">Address</label>
                    <input 
                        className="input-base font-mono" 
                        value={serverObj.address || ""}
                        onChange={e => updateServer('address', e.target.value)}
                        placeholder="example.com"
                    />
                </div>
                <div>
                    <label className="label-xs">Port</label>
                    <input 
                        type="number" 
                        className="input-base font-mono" 
                        value={serverObj.port || 0}
                        onChange={e => updateServer('port', parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="label-xs">
                        {proto === 'trojan' || proto === 'shadowsocks' || proto === 'socks' ? 'Password' : 'UUID'}
                    </label>
                    <input 
                        className="input-base font-mono text-xs" 
                        value={isShadowsocks ? (serverObj.password || "") : (userObj[proto === 'trojan' ? 'password' : 'id'] || "")}
                        onChange={e => updateUser(proto === 'trojan' || isShadowsocks ? 'password' : 'id', e.target.value)}
                    />
                </div>

                {/* VLESS Specific */}
                {proto === 'vless' && (
                    <div className="col-span-2">
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

                {/* Shadowsocks Specific */}
                {isShadowsocks && (
                    <div className="col-span-2">
                        <label className="label-xs">Encryption Method</label>
                        <select 
                            className="input-base"
                            value={serverObj.method || "aes-256-gcm"}
                            onChange={e => updateServer('method', e.target.value)}
                        >
                            <option value="aes-256-gcm">aes-256-gcm</option>
                            <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                            <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};