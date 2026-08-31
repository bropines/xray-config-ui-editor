import React from 'react';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Help } from '../../ui/Help';
import { Switch } from '../../ui/Switch';
import { generateUUID, generateShortId } from '../../../core/generators';
import { useField, useArrayField } from '../../../hooks/useField';

import { useConfigStore } from '../../../store/configStore';

export const InboundClients = ({ inbound, onChange, errors = {} as any }) => {
    const { remnawave } = useConfigStore();
    const [ssPassLen, setSsPassLen] = React.useState(32);
    const proto = inbound.protocol;

    // `inbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` — see InboundModal.tsx. useField/useArrayField
    // bind directly on top of that, so every path below is the ONE place the
    // wiring to the config lives; the JSX under it can be restyled freely.
    const method = useField<string>(inbound, onChange, ['settings', 'method']);
    const password = useField<string>(inbound, onChange, ['settings', 'password']);
    const hysteriaUsers = useArrayField<{ password?: string }>(inbound, onChange, ['settings', 'users']);
    const accounts = useArrayField<{ user?: string; pass?: string }>(inbound, onChange, ['settings', 'accounts']);
    const clients = useArrayField<Record<string, any>>(inbound, onChange, ['settings', 'clients']);
    const auth = useField<string>(inbound, onChange, ['settings', 'auth']);
    const udp = useField<boolean>(inbound, onChange, ['settings', 'udp']);
    const allowTransparent = useField<boolean>(inbound, onChange, ['settings', 'allowTransparent']);
    const upMbps = useField<number>(inbound, onChange, ['settings', 'up_mbps']);
    const downMbps = useField<number>(inbound, onChange, ['settings', 'down_mbps']);
    const ignoreClientBandwidth = useField<boolean>(inbound, onChange, ['settings', 'ignore_client_bandwidth']);

    // Remnawave integration: Hide users if connected (only for multi-user protocols)
    if (remnawave.connected && ['vless', 'vmess', 'trojan', 'hysteria'].includes(proto)) {
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
                    {remnawave.connected && <span className="text-[10px] text-indigo-400 ml-auto flex items-center gap-1 font-normal"><Icon name="Cloud" /> Remnawave Active</span>}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Method"
                            hint="Encryption algorithm for Shadowsocks."
                            value={method.value || (is2022 ? "2022-blake3-aes-128-gcm" : "aes-256-gcm")}
                            onChange={val => method.onChange(val)}
                            options={!is2022 ? [
                                { value: "aes-256-gcm", label: "aes-256-gcm" },
                                { value: "aes-128-gcm", label: "aes-128-gcm" },
                                { value: "chacha20-ietf-poly1305", label: "chacha20-ietf-poly1305" },
                                { value: "xchacha20-ietf-poly1305", label: "xchacha20-ietf-poly1305" },
                                { value: "2022-blake3-aes-128-gcm", label: "2022-blake3-aes-128-gcm" },
                                { value: "2022-blake3-aes-256-gcm", label: "2022-blake3-aes-256-gcm" },
                                { value: "2022-blake3-chacha20-poly1305", label: "2022-blake3-chacha20-poly1305" },
                            ] : [
                                { value: "2022-blake3-aes-128-gcm", label: "2022-blake3-aes-128-gcm" },
                                { value: "2022-blake3-aes-256-gcm", label: "2022-blake3-aes-256-gcm" },
                                { value: "2022-blake3-chacha20-poly1305", label: "2022-blake3-chacha20-poly1305" },
                            ]}
                        />
                    <div>
                        <label className="label-xs flex items-center justify-between">
                            <span>Password / Pre-shared Key</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Length:</span>
                                <input
                                    type="number"
                                    className="w-10 bg-transparent border-none text-[10px] text-indigo-400 font-bold p-0 focus:ring-0"
                                    value={ssPassLen}
                                    onChange={e => setSsPassLen(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </label>
                        <div className="flex gap-2">
                            <input className={`input-base font-mono ${errors.password ? 'border-rose-500 bg-rose-500/10' : ''}`}
                                value={password.value || ""}
                                onChange={e => password.onChange(e.target.value)}
                            />
                            <button onClick={() => password.onChange(generateShortId(ssPassLen))}
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
    if (proto === 'hysteria') {
        const users = hysteriaUsers.items;

        return (
            <div className="space-y-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Icon name="Gauge" /> Bandwidth & Global Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="label-xs flex items-center">
                                Up (Mbps)
                                <Help>Maximum upload speed in Mbps for Hysteria 2 protocol.</Help>
                            </label>
                            <input type="number" className="input-base font-mono"
                                value={upMbps.value || ""}
                                onChange={e => upMbps.onChange(parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className="label-xs flex items-center">
                                Down (Mbps)
                                <Help>Maximum download speed in Mbps for Hysteria 2 protocol.</Help>
                            </label>
                            <input type="number" className="input-base font-mono"
                                value={downMbps.value || ""}
                                onChange={e => downMbps.onChange(parseInt(e.target.value))} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <Switch
                                checked={ignoreClientBandwidth.value === true}
                                onChange={checked => ignoreClientBandwidth.onChange(checked)}
                                label="Ignore Client Bandwidth"
                            />
                            <Help>If enabled, the server will ignore the bandwidth limits requested by the client.</Help>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <Icon name="Users" /> Hysteria 2 Users
                        </h4>
                        <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => hysteriaUsers.add({ password: generateShortId() })} icon="Plus">Add</Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll pr-1">
                        {users.map((u, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group flex items-center gap-3">
                                <Icon name="Key" className="text-indigo-400 shrink-0" />
                                <input className="input-base py-1.5 text-xs font-mono"
                                    placeholder="Password"
                                    value={u.password || ""}
                                    onChange={e => hysteriaUsers.update(i, { password: e.target.value })}
                                />
                                <button onClick={() => hysteriaUsers.remove(i)} className="text-slate-600 hover:text-rose-500 transition-opacity">
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
        const accountItems = accounts.items;

        return (
            <div className="space-y-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Icon name="Gear" /> {proto.toUpperCase()} Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {proto === 'socks' && (
                            <Select
                                label="Auth Type"
                                value={auth.value || "noauth"}
                                onChange={val => auth.onChange(val)}
                                options={[
                                    { value: "noauth", label: "No Auth" },
                                    { value: "password", label: "Password" },
                                ]}
                            />
                        )}
                        <div className="flex items-center gap-6">
                            {proto === 'socks' && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="socks-udp"
                                        checked={udp.value === true}
                                        onChange={checked => udp.onChange(checked)}
                                        label="UDP Support"
                                    />
                                    <Help>Enable UDP associate for SOCKS5.</Help>
                                </div>
                            )}
                            {proto === 'http' && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="http-transparent"
                                        checked={allowTransparent.value === true}
                                        onChange={checked => allowTransparent.onChange(checked)}
                                        label="Allow Transparent"
                                    />
                                    <Help>Allow transparent proxying for HTTP.</Help>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {(proto === 'http' || (proto === 'socks' && auth.value === 'password')) && (
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Icon name="Users" /> {proto.toUpperCase()} Accounts
                            </h4>
                            <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => accounts.add({ user: 'admin', pass: generateShortId() })} icon="Plus">Add Account</Button>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scroll pr-1">
                            {accountItems.map((acc, i) => (
                                <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group flex flex-col md:flex-row items-end gap-3 hover:border-slate-600 transition-colors">
                                    <div className="flex-1 w-full">
                                        <label className="label-xs">Username</label>
                                        <input className="input-base py-1.5 text-xs"
                                            value={acc.user || ""}
                                            onChange={e => accounts.update(i, { user: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="label-xs">Password</label>
                                        <div className="flex gap-2">
                                            <input className="input-base py-1.5 text-xs font-mono"
                                                value={acc.pass || ""}
                                                onChange={e => accounts.update(i, { pass: e.target.value })}
                                            />
                                            <button onClick={() => accounts.update(i, { pass: generateShortId() })}
                                                title="Generate Password"
                                                className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white transition-colors">
                                                <Icon name="DiceFive" />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => accounts.remove(i)}
                                        className="bg-slate-800/50 p-2 rounded text-slate-600 hover:text-rose-500 transition-colors shrink-0"
                                        title="Remove Account">
                                        <Icon name="Trash" />
                                    </button>
                                </div>
                            ))}
                            {accountItems.length === 0 && (
                                <div className="text-center text-slate-600 text-xs py-6 italic border border-dashed border-slate-800 rounded-lg">
                                    No accounts defined. {proto === 'http' ? 'Auth is disabled.' : 'Add one to enable password auth.'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. VLESS / VMess / Trojan
    if (!['vless', 'vmess', 'trojan'].includes(proto)) return null;

    const clientItems = clients.items;
    const idKey = proto === 'trojan' ? 'password' : 'id';

    const addClient = () => {
        const newClient: any = { email: `user${clientItems.length}@xray` };
        newClient[idKey] = idKey === 'id' ? generateUUID() : generateShortId();
        if (proto === 'vless') newClient.flow = "xtls-rprx-vision";
        clients.add(newClient);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Users" /> Clients / Users
                </h4>
                <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={addClient} icon="Plus">Add</Button>
            </div>

            {errors.clients && (
                <div className="mb-3 p-2 bg-rose-900/20 border border-rose-500/40 rounded text-rose-300 text-[11px]">
                    ⚠ {errors.clients}
                </div>
            )}
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                {clientItems.map((c, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group hover:border-slate-600 transition-colors">
                        <button onClick={() => clients.remove(i)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Icon name="Trash" />
                        </button>

                        {/* Адаптивный грид клиентов */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                            <div>
                                <label className="label-xs">Email</label>
                                <input className="input-base py-1.5 text-xs"
                                    value={c.email || ""}
                                    onChange={e => clients.update(i, { email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-xs">{idKey === 'id' ? 'UUID' : 'Password'}</label>
                                <div className="flex gap-2">
                                    <input className="input-base py-1.5 text-xs font-mono"
                                        value={c[idKey] || ""}
                                        onChange={e => clients.update(i, { [idKey]: e.target.value })}
                                    />
                                    <button onClick={() => clients.update(i, { [idKey]: idKey === 'id' ? generateUUID() : generateShortId() })}
                                        className="text-slate-500 hover:text-white transition-colors">
                                        <Icon name="DiceFive" />
                                    </button>
                                </div>
                            </div>
                            {proto === 'vless' && (
                                    <Select
                                        label="Flow"
                                        value={c.flow || ""}
                                        onChange={val => clients.update(i, { flow: val })}
                                        options={[
                                            { value: "", label: "None" },
                                            { value: "xtls-rprx-vision", label: "xtls-rprx-vision" },
                                        ]}
                                    />
                            )}
                        </div>
                    </div>
                ))}
                {clientItems.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-4 italic">No users defined. Click Add to create one.</div>
                )}
            </div>
        </div>
    );
};
