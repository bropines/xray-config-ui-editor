import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { generateUUID, generateShortId } from '../../../utils/generators';

import { useConfigStore } from '../../../store/configStore';

export const InboundClients = ({ inbound, onChange, errors = {} as any }) => {
    const { remnawave } = useConfigStore();
    const proto = inbound.protocol;

    // Remnawave integration: Hide users if connected
    if (remnawave.connected && ['vless', 'vmess', 'trojan', 'shadowsocks', 'shadowsocks-2022', 'hysteria2'].includes(proto)) {
        return (
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl mt-4 flex items-start gap-3">
                <Icon name="Cloud" className="text-indigo-400 text-lg shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-indigo-300 uppercase mb-1">Managed by Remnawave</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        User management for this inbound is handled dynamically by your Remnawave panel. 
                        Manually adding clients here is not required.
                    </p>
                </div>
            </div>
        );
    }

    // 1. Shadowsocks / SS-2022
    if (proto === 'shadowsocks' || proto === 'shadowsocks-2022') {
        const is2022 = proto === 'shadowsocks-2022';
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Icon name="Key" /> {is2022 ? 'SS-2022' : 'Shadowsocks'} Credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label-xs">Method</label>
                        <select className="input-base"
                            value={inbound.settings?.method || (is2022 ? "2022-blake3-aes-128-gcm" : "aes-256-gcm")}
                            onChange={e => onChange(['settings', 'method'], e.target.value)}
                        >
                            {!is2022 && <option value="aes-256-gcm">aes-256-gcm</option>}
                            {!is2022 && <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>}
                            <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                            <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                            <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-xs">Password / Pre-shared Key</label>
                        <div className="flex gap-2">
                            <input className={`input-base font-mono ${errors.password ? 'border-rose-500 bg-rose-500/10' : ''}`}
                                value={inbound.settings?.password || ""}
                                onChange={e => onChange(['settings', 'password'], e.target.value)}
                            />
                            <button onClick={() => onChange(['settings', 'password'], generateShortId() + generateShortId())}
                                className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white transition-colors">
                                <Icon name="DiceFive" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Hysteria 2
    if (proto === 'hysteria2') {
        const users = inbound.settings?.users || [];
        const addUser = () => onChange(['settings', 'users'], [...users, { password: generateShortId() }]);
        const removeUser = (i: number) => {
            const next = [...users];
            next.splice(i, 1);
            onChange(['settings', 'users'], next);
        };
        const updateUser = (i: number, val: string) => {
            const next = [...users];
            next[i] = { ...next[i], password: val };
            onChange(['settings', 'users'], next);
        };

        return (
            <div className="space-y-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Icon name="Gauge" /> Bandwidth & Global Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="label-xs">Up (Mbps)</label>
                            <input type="number" className="input-base font-mono" 
                                value={inbound.settings?.up_mbps || ""} 
                                onChange={e => onChange(['settings', 'up_mbps'], parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className="label-xs">Down (Mbps)</label>
                            <input type="number" className="input-base font-mono" 
                                value={inbound.settings?.down_mbps || ""} 
                                onChange={e => onChange(['settings', 'down_mbps'], parseInt(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-700"
                                checked={inbound.settings?.ignore_client_bandwidth === true}
                                onChange={e => onChange(['settings', 'ignore_client_bandwidth'], e.target.checked)} />
                            <span className="text-xs text-slate-400 font-bold uppercase">Ignore Client Bandwidth</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <Icon name="Users" /> Hysteria 2 Users
                        </h4>
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addUser} icon="Plus">Add</Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll pr-1">
                        {users.map((u: any, i: number) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group flex items-center gap-3">
                                <Icon name="Key" className="text-indigo-400 shrink-0" />
                                <input className="input-base py-1.5 text-xs font-mono"
                                    placeholder="Password"
                                    value={u.password || ""}
                                    onChange={e => updateUser(i, e.target.value)}
                                />
                                <button onClick={() => removeUser(i)} className="text-slate-600 hover:text-rose-500 transition-opacity">
                                    <Icon name="Trash" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 2. Socks / HTTP
    if (proto === 'socks' || proto === 'http') {
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Icon name="UserCircle" /> Authentication
                </h4>
                <div>
                    <label className="label-xs">Auth Type</label>
                    <select className="input-base"
                        value={inbound.settings?.auth || "noauth"}
                        onChange={e => onChange(['settings', 'auth'], e.target.value)}
                    >
                        <option value="noauth">No Auth</option>
                        <option value="password">Password</option>
                    </select>
                </div>
                {inbound.settings?.auth === 'password' && (
                    <div className="mt-3 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded text-indigo-300 text-xs flex gap-2">
                        <Icon name="Info" className="mt-0.5" />
                        To manage accounts for Socks/HTTP, please switch to JSON mode.
                    </div>
                )}
            </div>
        );
    }

    // 3. VLESS / VMess / Trojan
    if (!['vless', 'vmess', 'trojan'].includes(proto)) return null;

    const clients = inbound.settings?.clients || [];
    const idKey = proto === 'trojan' ? 'password' : 'id';

    const addClient = () => {
        const newClient: any = { email: `user${clients.length}@xray` };
        newClient[idKey] = idKey === 'id' ? generateUUID() : generateShortId();
        if (proto === 'vless') newClient.flow = "xtls-rprx-vision";
        onChange(['settings', 'clients'], [...clients, newClient]);
    };

    const updateClient = (index, field, val) => {
        const newClients = [...clients];
        newClients[index] = { ...newClients[index], [field]: val };
        onChange(['settings', 'clients'], newClients);
    };

    const removeClient = (index) => {
        const newClients = [...clients];
        newClients.splice(index, 1);
        onChange(['settings', 'clients'], newClients);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Users" /> Clients / Users
                </h4>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addClient} icon="Plus">Add</Button>
            </div>

            {errors.clients && (
                <div className="mb-3 p-2 bg-rose-900/20 border border-rose-500/40 rounded text-rose-300 text-[11px]">
                    ⚠ {errors.clients}
                </div>
            )}
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                {clients.map((c, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group hover:border-slate-600 transition-colors">
                        <button onClick={() => removeClient(i)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Icon name="Trash" />
                        </button>

                        {/* Адаптивный грид клиентов */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                            <div>
                                <label className="label-xs">Email</label>
                                <input className="input-base py-1.5 text-xs"
                                    value={c.email || ""}
                                    onChange={e => updateClient(i, 'email', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-xs">{idKey === 'id' ? 'UUID' : 'Password'}</label>
                                <div className="flex gap-2">
                                    <input className="input-base py-1.5 text-xs font-mono"
                                        value={c[idKey] || ""}
                                        onChange={e => updateClient(i, idKey, e.target.value)}
                                    />
                                    <button onClick={() => updateClient(i, idKey, idKey === 'id' ? generateUUID() : generateShortId())}
                                        className="text-slate-500 hover:text-white transition-colors">
                                        <Icon name="DiceFive" />
                                    </button>
                                </div>
                            </div>
                            {proto === 'vless' && (
                                <div className="md:col-span-2">
                                    <label className="label-xs">Flow</label>
                                    <select className="input-base py-1.5 text-xs"
                                        value={c.flow || ""}
                                        onChange={e => updateClient(i, 'flow', e.target.value)}>
                                        <option value="">None</option>
                                        <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {clients.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-4 italic">No users defined. Click Add to create one.</div>
                )}
            </div>
        </div>
    );
};