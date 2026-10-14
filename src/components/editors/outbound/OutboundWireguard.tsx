import React, { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { toast } from 'sonner';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { FormField } from '../../ui/FormField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { generateWarpAccount, withWarpAccount, toAwgConf } from '../../../core/generators';
import { describeRelayError } from '../../../core/generators/warp-relay';
import { useConfigStore } from '../../../store/configStore';
import { useShallow } from 'zustand/react/shallow';
import { useField, useArrayField } from '../../../hooks/useField';
import { ListTextInput } from '../../ui/ListTextInput';
import { wireguardOutboundProblems, type WireguardOutboundProblem } from '../../../core/xray/wireguard-outbound';
import { useWarpRelay } from '../../../hooks/useWarpRelay';
import { WG_DOMAIN_STRATEGIES } from './wireguard-strategies';
import { t } from '../../../i18n';

/**
 * What the core refuses about one field, said next to it — the same words the
 * diagnostics use (core/xray/wireguard-outbound.ts), so a check the panel save
 * runs is one the form shows while it is being typed.
 */
const Problems = ({ items }: { items: WireguardOutboundProblem[] }) => (items.length === 0 ? null : (
    <ul className="space-y-1">
        {items.map((problem, index) => (
            <li key={index} data-problem={problem.kind} className="text-[10px] leading-relaxed text-rose-300 break-words">
                {problem.message}
                {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
            </li>
        ))}
    </ul>
));

const invalidClass = (invalid: boolean) => (invalid ? 'border-rose-500 bg-rose-500/10' : '');

export const OutboundWireguard = ({ outbound, onChange, errors = {} as any }: any) => {
    // Pre-existing rules-of-hooks violation, caught by the new ESLint config:
    // this used to `return null` BEFORE the hooks below, so every hook here
    // would silently stop being called whenever an outbound's protocol was
    // ever anything other than wireguard — a real risk if this component
    // stays mounted across a protocol switch (React requires the exact same
    // hooks, in the exact same order, on every render of the same instance).
    // Hooks now run unconditionally; the early return moves below them.
    // The selector returns the stored array itself, never a derived one: a
    // fresh array fails useShallow's comparison every time and puts this
    // editor back to re-rendering on every change anywhere in the app.
    const { servers } = useConfigStore(useShallow(state => ({
        servers: state.config?.dns?.servers,
    })));
    const relay = useWarpRelay();
    // Plain addresses only: a DoH URL is an Xray server object, not something
    // a WireGuard client knows what to do with.
    const dnsServers = useMemo(
        () => (Array.isArray(servers) ? servers : [])
            .filter((server: unknown): server is string => typeof server === 'string' && !server.includes('://')),
        [servers],
    );
    // Only the WARP button reads this, and it writes the addresses itself:
    // no made-up interface address here (the one this used to carry, a /24,
    // is refused by 26.3 — see core/xray/wireguard-config.ts).
    const settings = outbound.settings || { secretKey: "", peers: [] };
    const [loading, setLoading] = useState(false);

    // `outbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` (see OutboundModal.tsx). Every leaf below
    // binds directly to its settings path so the JSX can be restyled freely.
    const secretKey = useField<string>(outbound, onChange, ['settings', 'secretKey']);
    const address = useField<string[] | undefined>(outbound, onChange, ['settings', 'address']);
    const mtu = useField<number>(outbound, onChange, ['settings', 'mtu']);
    const reserved = useField<number[] | undefined>(outbound, onChange, ['settings', 'reserved']);
    const noKernelTun = useField<boolean>(outbound, onChange, ['settings', 'noKernelTun']);
    const domainStrategy = useField<string>(outbound, onChange, ['settings', 'domainStrategy']);

    // A value the core would refuse is still shown rather than hidden behind
    // an empty chooser: seeing what is set is the first step to fixing it.
    const strategies = WG_DOMAIN_STRATEGIES();
    const current = domainStrategy.value;
    const domainStrategyOptions = current && !strategies.some(o => o.value === current)
        ? [{ value: current, label: current, description: t("Not accepted by Xray-core — the config will not start") }, ...strategies]
        : strategies;
    const workers = useField<number>(outbound, onChange, ['settings', 'workers']);
    const remoteDNS = useField<string[] | undefined>(outbound, onChange, ['settings', 'remoteDNS']);

    // `workers` is read by 26.3 only and `remoteDNS` by 26.9 only
    // (infra/conf/wireguard.go per tag); elsewhere the decoder drops them.
    // Each is offered where it works and shown wherever a config already has
    // it, with a note on the lines where it does nothing.
    const { offersAt, tag: coreTag, version } = useCoreVersion();
    const workersWork = offersAt('outbound', 'settings.workers', 'wireguard');
    const remoteDnsWorks = offersAt('outbound', 'settings.remoteDNS', 'wireguard');
    // `domainStrategy` is the other way round: every line before 26.10 reads it and 26.10 dropped
    // the field (v26.10.10:infra/conf/wireguard.go:59-69), so it is offered where it works.
    const strategyWorks = offersAt('outbound', 'settings.domainStrategy', 'wireguard');
    const showStrategy = strategyWorks || domainStrategy.value !== undefined;
    const showWorkers = workersWork || workers.value !== undefined;
    const showRemoteDns = remoteDnsWorks || (Array.isArray(remoteDNS.value) && remoteDNS.value.length > 0);
    const peers = useArrayField<any>(outbound, onChange, ['settings', 'peers']);

    // The same list the diagnostics run on this outbound, for the line the
    // config is being written for; each field shows its own.
    const problems = wireguardOutboundProblems(outbound, version);
    const problemsAt = (field: string) => problems.filter(problem => problem.field === field);

    if (outbound.protocol !== 'wireguard') return null;

    /**
     * The outbound as the `.conf` an AmneziaWG or WireGuard client loads — the
     * import in reverse. The decoys go out as `I1..I5` and `Jc/Jmin/Jmax`;
     * anything that has no AmneziaWG equivalent is reported rather than
     * dropped quietly, because a profile that looks complete and connects to
     * nothing is the worst outcome here.
     */
    const handleExportConf = () => {
        const { conf, notes } = toAwgConf(outbound, { dns: dnsServers });
        void navigator.clipboard?.writeText(conf);
        toast.success(t("AmneziaWG profile copied"), { description: t("Paste it into a .conf file.") });
        for (const note of notes) {
            const show = note.severity === 'critical' ? toast.error
                : note.severity === 'warning' ? toast.warning : toast.info;
            show(note.message, { duration: note.severity === 'info' ? 6000 : 14000 });
        }
    };

    const handleGenerateWarp = async () => {
        setLoading(true);
        try {
            const warp = await generateWarpAccount(relay);
            // Into the peer that is there: replacing the list used to drop
            // its allowedIPs, so a profile that left local networks out
            // started routing them through WARP.
            onChange('settings', withWarpAccount(settings, warp));
            toast.success(t("WARP account generated successfully"));
        } catch (e: any) {
            toast.error(t("Failed to generate WARP account"), { description: describeRelayError(e) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-xs uppercase text-slate-400 font-bold flex items-center gap-2">
                    <Icon name="Shield" />
{t("WireGuard Settings")}
</h4>
                <Button variant="secondary" className="px-3 py-1.5 text-xs bg-indigo-600/20 text-indigo-400 border-indigo-500/50 hover:bg-indigo-600 hover:text-white" onClick={handleGenerateWarp} disabled={loading}>
                    {loading ? t("Generating...") : t("Generate WARP")}
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" icon="Export" onClick={handleExportConf}>
                    {t("Export .conf")}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <FormField label={t("Secret Key")} error={errors.secretKey}>
                        <input
                            className={`input-base font-mono text-rose-300 ${invalidClass(!!errors.secretKey || problemsAt('settings.secretKey').length > 0)}`}
                            aria-label={t("Secret Key")}
                            aria-invalid={problemsAt('settings.secretKey').length > 0}
                            autoComplete="off"
                            spellCheck={false}
                            value={secretKey.value || ""}
                            onChange={e => secretKey.onChange(e.target.value)}
                            placeholder={t("Private Key")}
                        />
                    </FormField>
                    <Problems items={problemsAt('settings.secretKey')} />
                </div>
                <div className="space-y-1.5">
                    <FormField label={t("Local Address (CIDR)")}>
                        {/* One host per family — /32 and /128 — is what every line takes
                            (26.3 refuses a wider prefix, which this used to suggest). */}
                        <ListTextInput
                            className={`input-base font-mono ${invalidClass(problemsAt('settings.address').length > 0)}`}
                            aria-label={t("Local Address (CIDR)")}
                            aria-invalid={problemsAt('settings.address').length > 0}
                            value={address.value}
                            onChange={address.onChange}
                            placeholder="10.0.0.2/32, fd00::2/128"
                        />
                    </FormField>
                    <Problems items={problemsAt('settings.address')} />
                </div>
            </div>

            {/* Advanced WG Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                <FormField label={t("MTU")} help={t("Maximum Transmission Unit. Default is 1280 for WARP.")}>
                    <input type="number" className="input-base" placeholder="1280" value={mtu.value || ""} onChange={e => mtu.onChange(parseInt(e.target.value) || 0)} />
                </FormField>
                <div className="space-y-1.5">
                    <FormField label={t("Reserved (CSV)")} help={t("[n,n,n] — header byte substitution. Use [0,0,0] for standard WARP.")}>
                        {/* The comma stays in the box until the next number follows it;
                            a list of any length is kept and reported, not cut to three. */}
                        <ListTextInput<number>
                            className={`input-base font-mono ${invalidClass(problemsAt('settings.reserved').length > 0)}`}
                            aria-label={t("Reserved (CSV)")}
                            aria-invalid={problemsAt('settings.reserved').length > 0}
                            placeholder="0, 0, 0"
                            allowed="0-9"
                            read={Number}
                            value={reserved.value}
                            onChange={reserved.onChange}
                        />
                    </FormField>
                    <Problems items={problemsAt('settings.reserved')} />
                </div>
                <div className="flex flex-col justify-center pt-5">
                    <Switch
                        checked={noKernelTun.value || false}
                        onChange={checked => noKernelTun.onChange(checked)}
                        label={t("No Kernel TUN")}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">{t("Enabled: use gVisor (no root). Disabled: system (faster).")}</p>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs uppercase text-slate-500 font-bold">{t("Peers")}</h4>
                    <Button variant="ghost" onClick={() => peers.add({ endpoint: "", publicKey: "", keepAlive: 0 })} className="px-2 py-1 text-xs" icon="Plus">{t("Add Peer")}</Button>
                </div>
                {errors.peers && (
                    <div className="mb-3 p-3 bg-rose-900/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                        <Icon name="Warning" /> {errors.peers}
                    </div>
                )}
                <div className="mb-3">
                    <Problems items={problemsAt('settings.peers')} />
                </div>
                <div className="space-y-4">
                    {peers.items.map((peer: any, i: number) => {
                        const epErr = errors[`peer_${i}_endpoint`] as string | undefined;
                        const pkErr = errors[`peer_${i}_publicKey`] as string | undefined;
                        const at = `settings.peers[${i}]`;
                        const endpointProblems = problemsAt(`${at}.endpoint`);
                        const publicKeyProblems = problemsAt(`${at}.publicKey`);
                        const preSharedProblems = problemsAt(`${at}.preSharedKey`);
                        const allowedProblems = problemsAt(`${at}.allowedIPs`);
                        return (
                            <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-4 relative group">
                                <button onClick={() => peers.remove(i)} className="absolute top-2 right-2 p-2 text-slate-600 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Icon name="Trash" />
                                </button>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-6">
                                    <div className="space-y-1.5">
                                        <FormField label={t("Endpoint")} error={epErr}>
                                            <input
                                                className={`input-base font-mono ${invalidClass(!!epErr || endpointProblems.length > 0)}`}
                                                aria-label={t("Endpoint")}
                                                aria-invalid={endpointProblems.length > 0}
                                                spellCheck={false}
                                                value={peer.endpoint || ""}
                                                onChange={e => peers.update(i, { endpoint: e.target.value })}
                                                placeholder={t("engage.cloudflareclient.com:2408")}
                                            />
                                        </FormField>
                                        <Problems items={endpointProblems} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <FormField label={t("Public Key")} error={pkErr}>
                                            <input
                                                className={`input-base font-mono text-emerald-300 ${invalidClass(!!pkErr || publicKeyProblems.length > 0)}`}
                                                aria-label={t("Public Key")}
                                                aria-invalid={publicKeyProblems.length > 0}
                                                autoComplete="off"
                                                spellCheck={false}
                                                value={peer.publicKey || ""}
                                                onChange={e => peers.update(i, { publicKey: e.target.value })}
                                                placeholder={t("Public Key")}
                                            />
                                        </FormField>
                                        <Problems items={publicKeyProblems} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                    <div className="col-span-1 lg:col-span-3">
                                        <FormField label={t("Pre-shared Key")}>
                                            <input
                                                className={`input-base font-mono ${invalidClass(preSharedProblems.length > 0)}`}
                                                aria-label={t("Pre-shared Key")}
                                                aria-invalid={preSharedProblems.length > 0}
                                                autoComplete="off"
                                                spellCheck={false}
                                                value={peer.preSharedKey || ""}
                                                onChange={e => peers.update(i, { preSharedKey: e.target.value })}
                                                placeholder={t("Optional")}
                                            />
                                        </FormField>
                                        <Problems items={preSharedProblems} />
                                    </div>
                                    <div className="col-span-1 lg:col-span-2">
                                        <FormField label={t("Keep-alive (s)")}>
                                            <input type="number" className="input-base font-mono" value={peer.keepAlive || 0} onChange={e => peers.update(i, { keepAlive: parseInt(e.target.value) || 0 })} />
                                        </FormField>
                                    </div>
                                    <div className="col-span-1 lg:col-span-7">
                                        <div className="flex flex-col gap-1.5 h-full">
                                            <div className="flex justify-between items-center h-[18px]">
                                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{t("Allowed IPs")}</label>
                                                <button
                                                    onClick={() => {
                                                        const isExcluding = peer.allowedIPs?.length > 2;
                                                        const newList = isExcluding ? ["0.0.0.0/0", "::/0"] : [
                                                            "0.0.0.0/5", "8.0.0.0/7", "11.0.0.0/8", "12.0.0.0/6", "16.0.0.0/4", "32.0.0.0/3",
                                                            "64.0.0.0/2", "128.0.0.0/3", "160.0.0.0/5", "168.0.0.0/6", "172.0.0.0/12",
                                                            "172.32.0.0/11", "172.64.0.0/10", "172.128.0.0/9", "173.0.0.0/8", "174.0.0.0/7",
                                                            "176.0.0.0/4", "192.0.0.0/9", "192.64.0.0/10", "192.128.0.0/11", "192.160.0.0/13",
                                                            "192.169.0.0/16", "192.170.0.0/15", "192.172.0.0/14", "192.176.0.0/12",
                                                            "192.192.0.0/10", "193.0.0.0/8", "194.0.0.0/7", "196.0.0.0/6", "200.0.0.0/5",
                                                            "208.0.0.0/4", "::/0"
                                                        ];
                                                        peers.update(i, { allowedIPs: newList });
                                                    }}
                                                    className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors uppercase ${peer.allowedIPs?.length > 2 ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                                >
                                                    {peer.allowedIPs?.length > 2 ? t("Restore 0.0.0.0/0") : t("Exclude Local")}
                                                </button>
                                            </div>
                                            {/* Emptied, the key is left out and the core's own
                                                default, everything, applies - what the placeholder says. */}
                                            <ListTextInput
                                                multiline
                                                className={`input-base font-mono text-xs h-full min-h-[42px] custom-scroll resize-y ${invalidClass(allowedProblems.length > 0)}`}
                                                aria-label={t("Allowed IPs")}
                                                aria-invalid={allowedProblems.length > 0}
                                                value={peer.allowedIPs}
                                                onChange={next => peers.update(i, { allowedIPs: next })}
                                                placeholder="0.0.0.0/0, ::/0"
                                            />
                                            <Problems items={allowedProblems} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {peers.items.length === 0 && <div className="text-sm text-slate-500 text-center py-6 italic border border-dashed border-slate-700 rounded-xl">{t("No peers added")}</div>}
                </div>
            </div>

            {/* General WG Engine Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                {showStrategy && (
                    <Select
                        label={t("Domain Strategy")}
                        hint={strategyWorks
                            ? t("How the peer's endpoint domain is resolved. WireGuard accepts only the Force variants; anything else stops the core from starting.")
                            : t("Xray 26.10 dropped this setting; {tag} ignores it, so it does nothing here.", { tag: coreTag })}
                        value={domainStrategy.value || "ForceIP"}
                        onChange={val => domainStrategy.onChange(val)}
                        options={domainStrategyOptions}
                    />
                )}
                {showWorkers && (
                    <FormField
                        label={t("Workers")}
                        help={workersWork
                            ? t("Number of concurrent workers. Default is CPU core count.")
                            : t("Only Xray 26.3 reads this; {tag} drops it, so it does nothing here.", { tag: coreTag })}
                    >
                        <input type="number" className="input-base h-[42px]" placeholder={t("Auto")} value={workers.value || ""} onChange={e => workers.onChange(parseInt(e.target.value) || 0)} />
                    </FormField>
                )}
                {showRemoteDns && (
                    <div className="space-y-1.5">
                        <FormField
                            label={t("Remote DNS")}
                            help={remoteDnsWorks
                                ? t("DNS server(s) resolved through the WireGuard tunnel itself (not Xray's DNS module) — comma-separated. Useful when the peer's network only resolves internal names.")
                                : t("Arrived in Xray 26.9; {tag} drops it, so it does nothing here.", { tag: coreTag })}
                        >
                            {/* The comma is kept while the next address is typed: this used
                                to filter empty entries on every keystroke, which took the
                                comma out of the box as it went in. */}
                            <ListTextInput
                                className={`input-base font-mono ${invalidClass(problemsAt('settings.remoteDNS').length > 0)}`}
                                aria-label={t("Remote DNS")}
                                aria-invalid={problemsAt('settings.remoteDNS').length > 0}
                                placeholder="1.1.1.1, 1.0.0.1"
                                value={remoteDNS.value}
                                onChange={remoteDNS.onChange}
                            />
                        </FormField>
                        <Problems items={problemsAt('settings.remoteDNS')} />
                    </div>
                )}
            </div>
        </div>
    );
};
