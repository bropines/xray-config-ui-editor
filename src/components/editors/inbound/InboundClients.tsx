import React from 'react';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Help } from '../../ui/Help';
import { Switch } from '../../ui/Switch';
import { generateUUID, generateShortId } from '../../../core/generators';
import { generateShadowsocks2022Key } from '../../../core/generators/crypto';
import { isShadowsocks2022Method } from '../../../core/xray/shadowsocks-keys';
import { text } from '../../../core/xray/shadowsocks-rules';
import { SHADOWSOCKS_METHOD_ALIASES } from '../../../core/xray/versions/features.inbound';
import { useField, useArrayField } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';

import { useConfigStore } from '../../../store/configStore';
import { useShallow } from 'zustand/react/shallow';
import { t } from '../../../i18n';

/** What a chooser lists: the line's values, plus the current one so it is never shown blank. */
const withCurrent = (offered: string[], current: string | undefined): string[] =>
    current !== undefined && current !== '' && !offered.includes(current) ? [...offered, current] : offered;

export const InboundClients = ({ inbound, onChange, errors = {} as any }: any) => {
    const { remnawave } = useConfigStore(useShallow(state => ({ remnawave: state.remnawave })));
    const { values } = useCoreVersion();
    const [ssPassLen, setSsPassLen] = React.useState(32);
    const proto = inbound.protocol;

    // `inbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` — see InboundModal.tsx. useField/useArrayField
    // bind directly on top of that, so every path below is the ONE place the
    // wiring to the config lives; the JSX under it can be restyled freely.
    //
    // Every list is written under the spelling all three supported lines
    // read — `clients`, and `accounts` for socks/http. The 26.7 `users`
    // alias is ignored by 26.3, and by every line once the old key exists;
    // useInboundEditor moves a lone `users` over before this renders.
    const method = useField<string>(inbound, onChange, ['settings', 'method']);
    const password = useField<string>(inbound, onChange, ['settings', 'password']);
    const accounts = useArrayField<{ user?: string; pass?: string }>(inbound, onChange, ['settings', 'accounts']);
    const clients = useArrayField<Record<string, any>>(inbound, onChange, ['settings', 'clients']);
    const auth = useField<string>(inbound, onChange, ['settings', 'auth']);
    const udp = useField<boolean>(inbound, onChange, ['settings', 'udp']);
    const allowTransparent = useField<boolean>(inbound, onChange, ['settings', 'allowTransparent']);

    // Remnawave integration: Hide users if connected (only for multi-user protocols)
    if (remnawave.connected && ['vless', 'vmess', 'trojan', 'hysteria'].includes(proto)) {
        return (
            <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-xl mt-4 flex items-start gap-3">
                <Icon name="Cloud" className="text-indigo-400 text-lg shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-indigo-300 uppercase mb-1">{t("Managed by Remnawave")}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        {t("User management for this inbound is handled dynamically by your Remnawave panel. Manually adding clients here is not required.")}
                        </p>
                </div>
            </div>
        );
    }

    // 1. Shadowsocks / SS-2022
    if (proto === 'shadowsocks' || proto === 'shadowsocks-2022') {
        // The line's cipher list (none/plain only on 26.3), without the
        // aead_* spellings of the same ciphers. `shadowsocks-2022` is not a
        // protocol (the notes above say so, with a button), so it gets the
        // whole list like any other Shadowsocks inbound.
        const offered = values('inbound.shadowsocks.method')
            .filter(name => !SHADOWSOCKS_METHOD_ALIASES.has(name));
        // What the config holds, or nothing: a cipher shown here that the
        // config does not contain would be a default nobody chose, and
        // the diagnostics would then speak of a method the form seems to have.
        const current = text(method.value);
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Icon name="Key" />{" "}
                    {t("{protocol} credentials", { protocol: 'Shadowsocks' })}
                    {remnawave.connected && <span className="text-[10px] text-indigo-400 ml-auto flex items-center gap-1 font-normal"><Icon name="Cloud" /> {t("Remnawave Active")}</span>}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label={t("Method")}
                            hint={t("Encryption algorithm for Shadowsocks.")}
                            value={current}
                            onChange={val => method.onChange(val)}
                            placeholder={t("Choose a method")}
                            options={withCurrent(offered, current).map(name => ({ value: name, label: name }))}
                        />
                    <div>
                        <label className="label-xs flex items-center justify-between">
                            <span>{t("Password / Pre-shared Key")}</span>
                            {/* A 2022 key is as long as its cipher says; only a classic password has a length to pick. */}
                            {!isShadowsocks2022Method(current) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">{t("Length:")}</span>
                                    <input
                                        type="number"
                                        className="w-10 bg-transparent border-none text-[10px] text-indigo-400 font-bold p-0 focus:ring-0"
                                        value={ssPassLen}
                                        onChange={e => setSsPassLen(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            )}
                        </label>
                        <div className="flex gap-2">
                            <input className={`input-base font-mono ${errors.password ? 'border-rose-500 bg-rose-500/10' : ''}`}
                                value={password.value || ""}
                                onChange={e => password.onChange(e.target.value)}
                            />
                            <button onClick={() => password.onChange(isShadowsocks2022Method(current) ? generateShadowsocks2022Key(current) : generateShortId(ssPassLen))}
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
    //
    // HysteriaServerConfig is {version, clients} on 26.3 and adds a `users`
    // alias on 26.7; each user is {auth, level, email} on every line
    // (v26.3.27:infra/conf/hysteria.go:33). The up/down Mbps and
    // "ignore client bandwidth" fields this card used to carry are Hysteria 1
    // keys no supported line reads — bandwidth lives on the transport now.
    if (proto === 'hysteria') {
        const users = clients.items;

        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <Icon name="Users" />
{t("Hysteria 2 Users")}
</h4>
                    <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => clients.add({ auth: generateShortId(16) })} icon="Plus">{t("Add")}</Button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                    {t("Each user signs in with its auth string. Bandwidth is not set here: it belongs to the transport's finalmask (quicParams brutalUp / brutalDown).")}
                </p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scroll pr-1">
                    {users.map((u, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                            <div>
                                <label className="label-xs">{t("Auth")}</label>
                                <div className="flex gap-2">
                                    <input className="input-base py-1.5 text-xs font-mono"
                                        value={u.auth || ""}
                                        onChange={e => clients.update(i, { auth: e.target.value })}
                                    />
                                    <button onClick={() => clients.update(i, { auth: generateShortId(16) })}
                                        title={t("Generate Password")}
                                        className="text-slate-500 hover:text-white transition-colors">
                                        <Icon name="DiceFive" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="label-xs">{t("Email")}</label>
                                <input className="input-base py-1.5 text-xs"
                                    value={u.email || ""}
                                    onChange={e => clients.update(i, { email: e.target.value || undefined })}
                                />
                            </div>
                            <button onClick={() => clients.remove(i)} className="absolute top-2 right-2 p-1 text-slate-600 hover:text-rose-500 transition-colors" title={t("Delete")}>
                                <Icon name="Trash" />
                            </button>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <div className="text-center text-slate-600 text-xs py-4 italic">{t("No users defined. Click Add to create one.")}</div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Socks / Mixed / HTTP
    //
    // `mixed` is not a third kind of proxy: the loader builds it from the
    // struct it builds `socks` from (SocksServerConfig —
    // v26.3.27:infra/conf/xray.go:30-31, v26.7.28:infra/conf/xray.go:27-28,
    // v26.9.9:infra/conf/xray.go:28-29), and that server answers HTTP on the
    // same port under either name (v26.7.28:proxy/socks/server.go:87-89). So
    // it gets the socks card, field for field, rather than one of its own.
    const isSocks = proto === 'socks' || proto === 'mixed';
    if (isSocks || proto === 'http') {
        const accountItems = accounts.items;
        const protocolName = proto.toUpperCase();

        return (
            <div className="space-y-4 mt-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Icon name="Gear" /> {t("{protocol} settings", { protocol: protocolName })}
                    </h4>
                    {proto === 'mixed' && (
                        <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                            {t("One port for SOCKS and HTTP proxy clients alike. Xray builds it exactly as it builds a socks inbound, so the settings are the same.")}
                        </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isSocks && (
                            <Select
                                label={t("Auth Type")}
                                value={auth.value || "noauth"}
                                onChange={val => auth.onChange(val)}
                                options={[
                                    { value: "noauth", label: t("No Auth") },
                                    { value: "password", label: t("Password") },
                                ]}
                            />
                        )}
                        <div className="flex items-center gap-6">
                            {isSocks && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="socks-udp"
                                        checked={udp.value === true}
                                        onChange={checked => udp.onChange(checked)}
                                        label={t("UDP Support")}
                                    />
                                    <Help>{t("Enable UDP associate for SOCKS5.")}</Help>
                                </div>
                            )}
                            {proto === 'http' && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="http-transparent"
                                        checked={allowTransparent.value === true}
                                        onChange={checked => allowTransparent.onChange(checked)}
                                        label={t("Allow Transparent")}
                                    />
                                    <Help>{t("Allow transparent proxying for HTTP.")}</Help>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {(proto === 'http' || (isSocks && auth.value === 'password')) && (
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Icon name="Users" /> {t("{protocol} accounts", { protocol: protocolName })}
                            </h4>
                            <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => accounts.add({ user: 'admin', pass: generateShortId() })} icon="Plus">{t("Add Account")}</Button>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scroll pr-1">
                            {accountItems.map((acc, i) => (
                                <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group flex flex-col md:flex-row items-end gap-3 hover:border-slate-600 transition-colors">
                                    <div className="flex-1 w-full">
                                        <label className="label-xs">{t("Username")}</label>
                                        <input className="input-base py-1.5 text-xs"
                                            value={acc.user || ""}
                                            onChange={e => accounts.update(i, { user: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="label-xs">{t("Password")}</label>
                                        <div className="flex gap-2">
                                            <input className="input-base py-1.5 text-xs font-mono"
                                                value={acc.pass || ""}
                                                onChange={e => accounts.update(i, { pass: e.target.value })}
                                            />
                                            <button onClick={() => accounts.update(i, { pass: generateShortId() })}
                                                title={t("Generate Password")}
                                                className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white transition-colors">
                                                <Icon name="DiceFive" />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => accounts.remove(i)}
                                        className="bg-slate-800/50 p-2 rounded text-slate-600 hover:text-rose-500 transition-colors shrink-0"
                                        title={t("Remove Account")}>
                                        <Icon name="Trash" />
                                    </button>
                                </div>
                            ))}
                            {accountItems.length === 0 && (
                                <div className="text-center text-slate-600 text-xs py-6 italic border border-dashed border-slate-800 rounded-lg">
                                    {t("No accounts defined.")}{" "}
                                    {proto === 'http'
                                        ? t("Auth is disabled.")
                                        : t("Add one to enable password auth.")}
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
    // "" and xtls-rprx-vision on every line; the udp443 variant is a client
    // value that fails the load on an inbound (v26.7.28:infra/conf/vless.go:72).
    const flows = values('inbound.vless.clients.flow');

    const addClient = () => {
        const newClient: any = { email: `user${clientItems.length}@xray` };
        newClient[idKey] = idKey === 'id' ? generateUUID() : generateShortId();
        if (proto === 'vless' && flows.includes('xtls-rprx-vision')) newClient.flow = "xtls-rprx-vision";
        clients.add(newClient);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Users" />
{t("Clients / Users")}
</h4>
                <Button variant="ghost" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={addClient} icon="Plus">{t("Add")}</Button>
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
                                <label className="label-xs">{t("Email")}</label>
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
                                        label={t("Flow")}
                                        value={c.flow || ""}
                                        onChange={val => clients.update(i, { flow: val })}
                                        options={withCurrent(flows, c.flow || "").map(flow => ({ value: flow, label: flow || t("None") }))}
                                    />
                            )}
                        </div>
                    </div>
                ))}
                {clientItems.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-4 italic">{t("No users defined. Click Add to create one.")}</div>
                )}
            </div>
        </div>
    );
};
