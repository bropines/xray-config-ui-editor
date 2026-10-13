import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { FormField } from '../../ui/FormField';
import { useField, useArrayField, type FieldPath } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    generateWireguardKeyPair,
    generateWireguardPresharedKey,
    wireguardPublicKey,
} from '../../../core/generators/crypto';
import {
    CLIENT_ONLY_KEYS,
    WIREGUARD_DEFAULT_ADDRESSES,
    nextPeerAllowedIP,
    serverReadsPeerEndpoint,
    wireguardInboundProblems,
    type WireguardInboundProblem,
} from '../../../core/xray/wireguard-inbound';
import { t } from '../../../i18n';

interface InboundWireguardProps {
    inbound: any;
    /** The editor's `updateField(path, value)` — see InboundModal. */
    onChange: (path: FieldPath, value: any) => void;
}

/** A peer as the server's half of WireGuardPeerConfig reads it. */
interface Peer {
    publicKey?: string;
    preSharedKey?: string;
    allowedIPs?: string[];
    keepAlive?: number;
    email?: string;
    level?: number;
    endpoint?: string;
}

const toInt = (text: string): number | undefined => {
    const parsed = parseInt(text, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const splitList = (text: string): string[] => text.split(/[\s,]+/).filter(Boolean);

const fieldClass = (invalid: boolean, extra = '') =>
    `input-base font-mono ${extra} ${invalid ? 'border-rose-500 bg-rose-500/10' : ''}`;

/**
 * A list typed as one line of text.
 *
 * The config only ever receives whole entries: what is being typed — a
 * trailing comma, a space — lives here until the field is left, so a half
 * finished list never reaches the config as an empty string the core would
 * then refuse. Left alone, the field shows whatever the config holds.
 */
const ListInput = ({ items, onCommit, placeholder, invalid, label }: {
    items: string[] | undefined;
    onCommit: (next: string[]) => void;
    placeholder?: string;
    invalid: boolean;
    label: string;
}) => {
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <input
            className={fieldClass(invalid)}
            aria-label={label}
            aria-invalid={invalid}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={draft ?? (items ?? []).join(', ')}
            onChange={e => {
                setDraft(e.target.value);
                onCommit(splitList(e.target.value));
            }}
            onBlur={() => setDraft(null)}
        />
    );
};

/** What the core refuses about one field, said next to it — the same words the diagnostics use. */
const Problems = ({ items }: { items: WireguardInboundProblem[] }) => (items.length === 0 ? null : (
    <ul className="space-y-1">
        {items.map((problem, index) => (
            <li key={index} data-problem={problem.kind} className="text-[10px] leading-relaxed text-rose-300 break-words">
                {problem.message}
            </li>
        ))}
    </ul>
));

const NoteButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        onClick={onClick}
        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-indigo-500/50 hover:text-white transition-colors"
    >
        {children}
    </button>
);

/**
 * What the chosen line does with a field that is on screen only because the
 * config holds it. Said under the field, in the open — a status tucked behind
 * the "?" is one nobody reads before saving.
 */
const Status = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <p className="text-[10px] leading-relaxed text-amber-200/80 break-words" data-status={field}>{children}</p>
);

/**
 * `[]` is not "left out". Build() fills in a default only for a key that is
 * absent (`== nil`, v26.7.28:infra/conf/wireguard.go:50 and :80); an empty
 * list is kept as it is, and means none. The field looks the same either
 * way, so the difference is said out loud.
 */
const EmptyList = ({ listKey, onRemove }: { listKey: string; onRemove: () => void }) => (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5" data-empty-list={listKey}>
        <p className="text-[10px] leading-relaxed text-amber-200/90 break-words">
            {t("{key} is an empty list, which is not the same as leaving it out: Xray then uses none at all, not its default.", { key: listKey })}
        </p>
        <NoteButton onClick={onRemove}>{t("Remove {alias}", { alias: listKey })}</NoteButton>
    </div>
);

/**
 * The server half of a WireGuard tunnel: this inbound's own key and
 * addresses, and the clients allowed to connect to it.
 *
 * The outbound card draws the same struct from the other end (the core has
 * one WireGuardConfig for both), and this one is not a copy of it: a server
 * has no endpoint to dial, no `reserved` bytes and no domain strategy, and
 * its peers are users with an address each. What only a client uses is not
 * offered here, and is still shown when a config holds it.
 *
 * Which keys each line reads, and everything a line refuses, is in
 * core/xray/wireguard-inbound.ts — the card asks it rather than knowing.
 *
 * Buttons sit at the foot of the block they act on, never in its header: on
 * a phone the top of a card is for reading.
 */
export const InboundWireguard = ({ inbound, onChange }: InboundWireguardProps) => {
    const { version, tag, offersAt } = useCoreVersion();
    // Replacing a key that is already in use cuts off every client, so it
    // takes a second press. An empty field has nothing to lose.
    const [replacing, setReplacing] = useState(false);

    const settings: Record<string, unknown> = inbound.settings ?? {};
    const secretKey = useField<string | undefined>(inbound, onChange, ['settings', 'secretKey']);
    const address = useField<string[] | undefined>(inbound, onChange, ['settings', 'address']);
    const mtu = useField<number | undefined>(inbound, onChange, ['settings', 'mtu']);
    const workers = useField<number | undefined>(inbound, onChange, ['settings', 'workers']);
    const peers = useArrayField<Peer>(inbound, onChange, ['settings', 'peers']);

    // `workers` is read by 26.3 only, and a peer's `email` and `level` from
    // 26.7 (see the table in wireguard-inbound.ts). Each is offered where it
    // works and shown wherever a config already has it.
    const workersWork = offersAt('inbound', 'settings.workers', 'wireguard');
    const emailWorks = offersAt('inbound', 'settings.peers[].email', 'wireguard');
    const levelWorks = offersAt('inbound', 'settings.peers[].level', 'wireguard');
    const endpointRead = serverReadsPeerEndpoint(version);
    const since267 = t("Arrived in Xray 26.7; {tag} drops it, so it does nothing here.", { tag });

    const publicKey = wireguardPublicKey(secretKey.value);
    const problems = wireguardInboundProblems(inbound, version);
    const problemsAt = (field: string) => problems.filter(problem => problem.field === field);
    const heldClientKeys = CLIENT_ONLY_KEYS.filter(key => settings[key] !== undefined && settings[key] !== null);

    const generate = () => {
        secretKey.onChange(generateWireguardKeyPair().secretKey);
        setReplacing(false);
    };

    const copyPublicKey = () => {
        if (!publicKey) return;
        void navigator.clipboard?.writeText(publicKey);
        toast.success(t("Copied to clipboard"));
    };

    // Its own address, not the "everything" a peer without the key is given —
    // see nextPeerAllowedIP for why that default is wrong on a server.
    const addPeer = () => {
        const allowed = nextPeerAllowedIP(settings);
        peers.add({ publicKey: '', ...(allowed ? { allowedIPs: [allowed] } : {}) });
    };

    const secretProblems = problemsAt('settings.secretKey');
    const addressProblems = problemsAt('settings.address');

    return (
        <div className="space-y-4 mt-4">
            {/* ── This server ─────────────────────────────────────────── */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4" data-wireguard="interface">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Shield" /> {t("WireGuard interface")}
                </h4>

                <div className="space-y-1.5">
                    <FormField
                        label={t("Secret Key")}
                        help={t("This server's private key. It stays in this config; clients are given the public key under it.")}
                    >
                        <input
                            className={fieldClass(secretProblems.length > 0, 'text-rose-300')}
                            aria-label={t("Secret Key")}
                            aria-invalid={secretProblems.length > 0}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={t("Private Key")}
                            value={secretKey.value ?? ''}
                            onChange={e => secretKey.onChange(e.target.value)}
                        />
                    </FormField>
                    <Problems items={secretProblems} />
                </div>

                <div className="space-y-1.5">
                    <FormField label={t("Public Key")}>
                        <input
                            readOnly
                            className="input-base font-mono text-emerald-300"
                            aria-label={t("Public Key")}
                            placeholder="—"
                            value={publicKey ?? ''}
                            onFocus={e => e.target.select()}
                        />
                    </FormField>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        {publicKey
                            ? t("Worked out from the secret key, not stored in the config. Every client needs it as the public key of its peer.")
                            : t("Appears once the secret key is a valid one. Every client needs it as the public key of its peer.")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <FormField
                            label={t("Interface address")}
                            help={t("The server's own addresses inside the tunnel, separated by commas. Left empty, Xray uses {v4} and {v6}.", {
                                v4: WIREGUARD_DEFAULT_ADDRESSES[0],
                                v6: WIREGUARD_DEFAULT_ADDRESSES[1],
                            })}
                        >
                            <ListInput
                                label={t("Interface address")}
                                items={address.value}
                                // Cleared means left out, so the core's default applies — never `[]`.
                                onCommit={next => address.onChange(next.length ? next : undefined)}
                                placeholder={`${WIREGUARD_DEFAULT_ADDRESSES[0]}/32`}
                                invalid={addressProblems.length > 0}
                            />
                        </FormField>
                        <Problems items={addressProblems} />
                        {Array.isArray(address.value) && address.value.length === 0 && (
                            <EmptyList listKey="address" onRemove={() => address.onChange(undefined)} />
                        )}
                    </div>

                    <FormField label={t("MTU")} help={t("The largest packet the tunnel carries. Left empty, Xray uses 1420.")}>
                        <input
                            type="number"
                            inputMode="numeric"
                            className="input-base"
                            aria-label={t("MTU")}
                            placeholder="1420"
                            value={mtu.value ?? ''}
                            onChange={e => mtu.onChange(toInt(e.target.value))}
                        />
                    </FormField>

                    {(workersWork || workers.value !== undefined) && (
                        <div className="space-y-1.5">
                            <FormField
                                label={t("Workers")}
                                help={workersWork ? t("Number of concurrent workers. Default is CPU core count.") : undefined}
                            >
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="input-base"
                                    aria-label={t("Workers")}
                                    placeholder={t("Auto")}
                                    value={workers.value ?? ''}
                                    onChange={e => workers.onChange(toInt(e.target.value))}
                                />
                            </FormField>
                            {!workersWork && (
                                <Status field="workers">{t("Only Xray 26.3 reads this; {tag} drops it, so it does nothing here.", { tag })}</Status>
                            )}
                        </div>
                    )}
                </div>

                {heldClientKeys.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3" data-wireguard="client-only">
                        {heldClientKeys.map(key => (
                            <div key={key} className="space-y-2">
                                <p className="text-[11px] leading-relaxed text-slate-300 break-words">
                                    {t("{key} is set to {value}. Only a WireGuard outbound uses it — on an inbound it changes nothing.", {
                                        key,
                                        value: JSON.stringify(settings[key]),
                                    })}
                                </p>
                                <NoteButton onClick={() => onChange(['settings', key], undefined)}>
                                    {t("Remove {alias}", { alias: key })}
                                </NoteButton>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
                    {replacing ? (
                        <>
                            <p className="basis-full text-[11px] leading-relaxed text-amber-200/90">
                                {t("A new key gives this server a new public key. Every client set up with the old one stops connecting until it is given the new one.")}
                            </p>
                            <Button type="button" variant="warning" size="sm" onClick={generate}>{t("Replace the key")}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setReplacing(false)}>{t("Cancel")}</Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                icon="Key"
                                onClick={() => (secretKey.value ? setReplacing(true) : generate())}
                            >
                                {secretKey.value ? t("Generate a new key") : t("Generate a key")}
                            </Button>
                            <Button type="button" variant="secondary" size="sm" icon="Copy" disabled={!publicKey} onClick={copyPublicKey}>
                                {t("Copy public key")}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* ── The clients ─────────────────────────────────────────── */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4" data-wireguard="peers">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Users" /> {t("Peers")}
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    {t("Each peer is one client. It is recognised by its public key and may only send from the addresses listed for it, so give every client an address of its own.")}
                </p>

                {peers.items.map((entry, i) => {
                    const peer: Peer = entry && typeof entry === 'object' ? entry : {};
                    const at = `settings.peers[${i}]`;
                    const keyProblems = problemsAt(`${at}.publicKey`);
                    const allowedProblems = problemsAt(`${at}.allowedIPs`);
                    const pskProblems = problemsAt(`${at}.preSharedKey`);
                    return (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3" data-peer={i}>
                            <div className="label-xs !mb-0 flex flex-wrap items-center gap-x-2">
                                <span>{t("Peer {n}", { n: i + 1 })}</span>
                                {peer.email && <span className="normal-case tracking-normal font-normal text-slate-400 break-all">{peer.email}</span>}
                            </div>

                            <div className="space-y-1.5">
                                <FormField
                                    label={t("Public Key")}
                                    help={t("The client's own public key — the one its WireGuard app shows for its interface, not this server's.")}
                                >
                                    <input
                                        className={fieldClass(keyProblems.length > 0, 'text-emerald-300')}
                                        aria-label={t("Public Key")}
                                        aria-invalid={keyProblems.length > 0}
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder={t("Public Key")}
                                        value={peer.publicKey ?? ''}
                                        onChange={e => peers.update(i, { publicKey: e.target.value })}
                                    />
                                </FormField>
                                <Problems items={keyProblems} />
                            </div>

                            <div className="space-y-1.5">
                                <FormField
                                    label={t("Allowed IPs")}
                                    help={t("The tunnel addresses this client may send from, as networks: a single address is written with /32. Left empty, Xray lets the peer use every address.")}
                                >
                                    <ListInput
                                        label={t("Allowed IPs")}
                                        items={peer.allowedIPs}
                                        onCommit={next => peers.update(i, { allowedIPs: next.length ? next : undefined })}
                                        placeholder="0.0.0.0/0, ::/0"
                                        invalid={allowedProblems.length > 0}
                                    />
                                </FormField>
                                <Problems items={allowedProblems} />
                                {Array.isArray(peer.allowedIPs) && peer.allowedIPs.length === 0 && (
                                    <EmptyList listKey="allowedIPs" onRemove={() => peers.update(i, { allowedIPs: undefined })} />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FormField
                                        label={t("Pre-shared Key")}
                                        help={t("An extra secret shared with this one client, which must hold the same value. Optional.")}
                                    >
                                        <div className="flex gap-2">
                                            <input
                                                className={fieldClass(pskProblems.length > 0, 'min-w-0')}
                                                aria-label={t("Pre-shared Key")}
                                                aria-invalid={pskProblems.length > 0}
                                                autoComplete="off"
                                                spellCheck={false}
                                                placeholder={t("Optional")}
                                                value={peer.preSharedKey ?? ''}
                                                onChange={e => peers.update(i, { preSharedKey: e.target.value || undefined })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => peers.update(i, { preSharedKey: generateWireguardPresharedKey() })}
                                                title={t("Generate a pre-shared key")}
                                                aria-label={t("Generate a pre-shared key")}
                                                className="bg-slate-800 px-3 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
                                            >
                                                <Icon name="DiceFive" />
                                            </button>
                                        </div>
                                    </FormField>
                                    <Problems items={pskProblems} />
                                </div>

                                <FormField
                                    label={t("Keep-alive (s)")}
                                    help={t("Seconds between the packets this server sends to keep the peer's path open. Empty or 0 sends none.")}
                                >
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="input-base"
                                        aria-label={t("Keep-alive (s)")}
                                        placeholder="0"
                                        value={peer.keepAlive ?? ''}
                                        onChange={e => peers.update(i, { keepAlive: toInt(e.target.value) })}
                                    />
                                </FormField>

                                {(emailWorks || peer.email !== undefined) && (
                                    <div className="space-y-1.5">
                                        <FormField
                                            label={t("Email")}
                                            help={emailWorks ? t("The user this peer's traffic is counted and routed as.") : undefined}
                                        >
                                            <input
                                                className="input-base"
                                                aria-label={t("Email")}
                                                autoComplete="off"
                                                spellCheck={false}
                                                value={peer.email ?? ''}
                                                onChange={e => peers.update(i, { email: e.target.value || undefined })}
                                            />
                                        </FormField>
                                        {!emailWorks && <Status field="email">{since267}</Status>}
                                    </div>
                                )}

                                {(levelWorks || peer.level !== undefined) && (
                                    <div className="space-y-1.5">
                                        <FormField
                                            label={t("User Level")}
                                            help={levelWorks ? t("The policy level this peer's connections run at. Empty is level 0.") : undefined}
                                        >
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                className="input-base"
                                                aria-label={t("User Level")}
                                                placeholder="0"
                                                value={peer.level ?? ''}
                                                onChange={e => peers.update(i, { level: toInt(e.target.value) })}
                                            />
                                        </FormField>
                                        {!levelWorks && <Status field="level">{since267}</Status>}
                                    </div>
                                )}
                            </div>

                            {/* Never offered — a server waits to be called. One a config holds is shown. */}
                            {peer.endpoint !== undefined && (
                                <div className="space-y-2">
                                    <FormField label={t("Endpoint")}>
                                        <input
                                            className="input-base font-mono"
                                            aria-label={t("Endpoint")}
                                            autoComplete="off"
                                            spellCheck={false}
                                            value={peer.endpoint ?? ''}
                                            onChange={e => peers.update(i, { endpoint: e.target.value })}
                                        />
                                    </FormField>
                                    <Status field="endpoint">
                                        {endpointRead
                                            ? t("Where Xray {tag} first sends to this peer. A server usually leaves it out and learns the address when the peer calls.", { tag })
                                            : t("Xray {tag} does not use a peer's endpoint on an inbound: it learns the address when the peer calls. It does nothing here.", { tag })}
                                    </Status>
                                    <NoteButton onClick={() => peers.update(i, { endpoint: undefined })}>
                                        {t("Remove {alias}", { alias: 'endpoint' })}
                                    </NoteButton>
                                </div>
                            )}

                            <div className="flex justify-end border-t border-slate-800/60 pt-3">
                                <Button type="button" variant="ghost" size="sm" icon="Trash" className="hover:!text-rose-400" onClick={() => peers.remove(i)}>
                                    {t("Remove peer")}
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {peers.items.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-4 italic border border-dashed border-slate-800 rounded-lg px-3">
                        {t("No peers yet. The inbound loads without any — and nobody can connect to it.")}
                    </div>
                )}

                <div className="border-t border-slate-800/60 pt-3">
                    <Button type="button" variant="secondary" size="sm" icon="Plus" className="w-full md:w-auto" onClick={addPeer}>
                        {t("Add Peer")}
                    </Button>
                </div>
            </div>
        </div>
    );
};
