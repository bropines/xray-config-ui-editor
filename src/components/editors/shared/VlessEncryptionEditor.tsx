import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { FormField } from '../../ui/FormField';
import { Icon } from '../../ui/Icon';
import { RadioGroup } from '../../ui/RadioGroup';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { useField, type FieldPath } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    APPEARANCES,
    DEFAULT_LIFETIME,
    DEFAULT_PADDING,
    NO_VLESS_ENCRYPTION,
    RESUMPTIONS,
    VLESS_DECRYPTION_PATH,
    composeVlessEncryption,
    paddingIssue,
    pathText,
    readLifetime,
    readVlessEncryption,
    splitVlessEncryption,
    vlessEncryptionOffered,
    vlessEncryptionPath,
    vlessInboundEncryptionProblems,
    vlessOutboundEncryptionProblems,
    type Resumption,
    type VlessEncryptionProblem,
    type VlessKeyKind,
} from '../../../core/xray/vless-encryption';
import {
    DEFAULT_VLESS_ENCRYPTION_OPTIONS,
    deriveClientEncryption,
    generateVlessEncryption,
    type VlessAuthentication,
} from '../../../core/generators/vless-encryption';
import { t } from '../../../i18n';

interface VlessEncryptionEditorProps {
    /** `inbound` edits `settings.decryption`; `outbound` edits the `encryption` its shape keeps. */
    side: 'inbound' | 'outbound';
    /** The inbound or outbound being edited. */
    item: any;
    /** The editor's `updateField(path, value)`. */
    onChange: (path: FieldPath, value: any) => void;
    /**
     * Whether the chosen line has VLESS Encryption at all. Left out, the
     * version table decides (every supported line has it today). Given, it
     * overrides the table — so the one branch that table never reaches can be
     * drawn and tested.
     */
    offered?: boolean;
}

const fieldClass = (invalid: boolean, extra = '') =>
    `input-base font-mono ${extra} ${invalid ? 'border-rose-500 bg-rose-500/10' : ''}`;

/** What the core refuses about this string, said beside it — the words the diagnostics use. */
const Problems = ({ items }: { items: VlessEncryptionProblem[] }) => (items.length === 0 ? null : (
    <ul className="space-y-1.5">
        {items.map((problem, index) => (
            <li
                key={index}
                data-problem={problem.kind}
                className={`text-[11px] leading-relaxed break-words ${problem.severity === 'critical' ? 'text-rose-300' : 'text-amber-200/90'}`}
            >
                {problem.message}
                {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
            </li>
        ))}
    </ul>
));

const keyLabel = (kind: VlessKeyKind, server: boolean): string => {
    if (kind === 'x25519') return server ? t("X25519 private key") : t("X25519 public key");
    return server ? t("ML-KEM-768 seed") : t("ML-KEM-768 public key");
};

const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(t("Copied to clipboard"));
};

interface Draft {
    appearance: string;
    lifetime: string;
    resumption: string;
    padding: string;
}

/**
 * VLESS Encryption, as `xray vlessenc` makes it, from either end.
 *
 * On an inbound it holds the server string (`settings.decryption`) and works
 * out the one every client needs from it; on an outbound it holds the client
 * string and can work it out from a server's. What the string is, and what the
 * core refuses of it, is in core/xray/vless-encryption.ts; the keys are
 * made in core/generators/vless-encryption.ts. This card draws them.
 *
 * The string is the single source of truth. The choices — how it looks, the
 * ticket, the padding — are read out of it and written back into it with the
 * keys left alone, so a hand-edited string and the controls never disagree.
 * Before there is a string to read, they are held here and used for the next
 * key that is generated.
 *
 * Buttons sit at the foot of the block they act on, never in its header: on a
 * phone the top of a card is for reading.
 */
export const VlessEncryptionEditor = ({ side, item, onChange, offered }: VlessEncryptionEditorProps) => {
    const { version, tag } = useCoreVersion();
    const isServer = side === 'inbound';
    const available = offered ?? vlessEncryptionOffered(version);

    const path = isServer ? [...VLESS_DECRYPTION_PATH] : vlessEncryptionPath(item);
    const what = pathText(path);
    const key = isServer ? 'decryption' : 'encryption';
    const field = useField<unknown>(item, onChange, path);
    const held = field.value;
    const text = typeof held === 'string' ? held : '';
    const wrongType = held !== undefined && held !== null && typeof held !== 'string';

    const reading = readVlessEncryption(held, isServer ? 'server' : 'client', what);
    const problems = isServer ? vlessInboundEncryptionProblems(item, version) : vlessOutboundEncryptionProblems(item);
    const parts = splitVlessEncryption(text);
    const isNone = text === NO_VLESS_ENCRYPTION;
    const encrypted = reading.usable;

    // The choices, from the string when it has them, otherwise held here.
    const [draft, setDraft] = useState<Draft>({
        appearance: DEFAULT_VLESS_ENCRYPTION_OPTIONS.appearance,
        lifetime: DEFAULT_VLESS_ENCRYPTION_OPTIONS.lifetime,
        // Empty until chosen: a string worked out from a server's picks 0rtt or
        // 1rtt itself (1rtt where the server issues no tickets), and only a
        // choice made here overrides that.
        resumption: '',
        padding: DEFAULT_VLESS_ENCRYPTION_OPTIONS.padding,
    });
    const appearance = parts ? parts.appearance : draft.appearance;
    const ticket = parts ? parts.ticket : isServer ? draft.lifetime : draft.resumption;
    const padding = parts ? parts.padding : draft.padding;

    const edit = (change: { appearance?: string; ticket?: string; padding?: string }) => {
        if (parts) {
            onChange(path, composeVlessEncryption({ ...parts, ...change }));
            return;
        }
        setDraft(current => ({
            appearance: change.appearance ?? current.appearance,
            lifetime: isServer && change.ticket !== undefined ? change.ticket : current.lifetime,
            resumption: !isServer && change.ticket !== undefined ? change.ticket : current.resumption,
            padding: change.padding ?? current.padding,
        }));
    };

    // Generating with a choice that is not valid would write a string the core
    // refuses; those fall back to what `vlessenc` writes. (Only a server
    // generates, so `ticket` is a lifetime here.)
    const generationOptions = () => ({
        appearance: (APPEARANCES as readonly string[]).includes(appearance)
            ? (appearance as (typeof APPEARANCES)[number])
            : DEFAULT_VLESS_ENCRYPTION_OPTIONS.appearance,
        lifetime: readLifetime(ticket) ? ticket : DEFAULT_LIFETIME,
        padding: paddingIssue(padding) ? '' : padding,
    });

    // Replacing a key that is in use cuts off every client holding the old one,
    // so it takes a second press. An empty field has nothing to lose.
    const [replacing, setReplacing] = useState<VlessAuthentication | null>(null);
    const generate = (authentication: VlessAuthentication) => {
        onChange(path, generateVlessEncryption(authentication, generationOptions()).decryption);
        setReplacing(null);
    };
    const askToGenerate = (authentication: VlessAuthentication) => (encrypted ? setReplacing(authentication) : generate(authentication));

    // What the clients need, worked out from the server's string.
    const [clientResumption, setClientResumption] = useState<Resumption | null>(null);
    const derived = useMemo(
        () => (isServer ? deriveClientEncryption(text, clientResumption ? { resumption: clientResumption } : {}) : null),
        [isServer, text, clientResumption],
    );
    const clientString = encrypted && derived && derived.ok ? derived.encryption : '';
    const shownResumption: Resumption = (clientString ? splitVlessEncryption(clientString)?.ticket : undefined) === '1rtt' ? '1rtt' : '0rtt';

    // A server's string pasted into an outbound, turned into the client's.
    const [pasted, setPasted] = useState('');
    const pastedText = useMemo(() => {
        // Whole lines from `xray vlessenc` — `"decryption": "…",` — are welcome.
        const quoted = /"(?:decryption|encryption)"\s*:\s*"([^"]*)"/.exec(pasted);
        return (quoted ? quoted[1]! : pasted).trim().replace(/^"|",?$|"$/g, '');
    }, [pasted]);
    const fromServer = useMemo(() => {
        if (isServer || pastedText === '') return null;
        const asClient = readVlessEncryption(pastedText, 'client', 'encryption');
        if (asClient.usable) return { kind: 'client' as const };
        const result = deriveClientEncryption(
            pastedText,
            // The choice already made on this card, when there is one.
            (RESUMPTIONS as readonly string[]).includes(ticket) ? { resumption: ticket as Resumption } : {},
        );
        return result.ok ? { kind: 'derived' as const, encryption: result.encryption } : { kind: 'refused' as const, problems: result.problems };
    }, [isServer, pastedText, ticket]);

    if (!available) {
        // The line has no VLESS Encryption: nothing is offered, and a string
        // that is there is shown with what this line does with it.
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3" data-vless-encryption={side}>
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="LockKey" /> {t("VLESS Encryption")}
                </h4>
                <p className="text-[11px] leading-relaxed text-amber-200/90" data-status="unavailable">
                    {t("Xray {tag} has no VLESS Encryption, so {what} is not read as one there.", { tag, what })}
                </p>
                {text !== '' && <p className="text-[11px] font-mono text-slate-400 break-all">{text}</p>}
                {held !== undefined && (
                    <button
                        type="button"
                        onClick={() => onChange(path, undefined)}
                        className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                    >
                        {t("Remove {alias}", { alias: key })}
                    </button>
                )}
            </div>
        );
    }

    const status = isNone
        ? t("Off")
        : encrypted
            ? reading.keys.some(k => k.kind === 'mlkem768') && reading.keys.some(k => k.kind === 'x25519')
                ? t("On · X25519 and ML-KEM-768")
                : reading.keys[0]?.kind === 'mlkem768' ? t("On · ML-KEM-768") : t("On · X25519")
            : text === '' ? t("Not set") : t("Needs attention");
    const statusClass = isNone || text === ''
        ? 'bg-slate-800 text-slate-300 border-slate-700'
        : encrypted ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border-rose-500/30';

    const fieldLabel = isServer ? t("Decryption") : t("Encryption");
    const showOptions = parts !== null || isNone || text === '';

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4" data-vless-encryption={side}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="LockKey" /> {t("VLESS Encryption")}
                </h4>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusClass}`} data-status="state">
                    {status}
                </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
                {isServer
                    ? t("Encrypts the VLESS stream itself, with a key exchange that holds up against quantum computers — what xray vlessenc sets up. This server keeps the private key in decryption; each client is given the matching public key in its outbound's encryption.")
                    : t("The client half of VLESS Encryption. It has to match the server's decryption: the same appearance, and the public key that goes with the server's private one.")}
            </p>

            {wrongType ? (
                <WrongTypeNotice field={what} held={held} expects="text" onRemove={() => onChange(path, undefined)} />
            ) : (
                <div className="space-y-1.5">
                    <FormField
                        label={fieldLabel}
                        help={isServer
                            ? t("\"none\" for plain VLESS, or a string of the form mlkem768x25519plus.appearance.ticket.key that this inbound decrypts with.")
                            : t("\"none\" for plain VLESS, or the string the server's operator gives out: mlkem768x25519plus.appearance.0rtt.key.")}
                    >
                        <input
                            className={fieldClass(problems.some(problem => problem.field === what && problem.severity === 'critical'), encrypted ? 'text-emerald-300' : '')}
                            aria-label={fieldLabel}
                            aria-invalid={problems.some(problem => problem.field === what && problem.severity === 'critical')}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={isServer ? 'none' : 'mlkem768x25519plus.native.0rtt.…'}
                            value={text}
                            onChange={e => onChange(path, e.target.value === '' ? undefined : e.target.value)}
                        />
                    </FormField>
                    <Problems items={problems} />
                </div>
            )}

            {isNone && (
                <p className="text-[11px] leading-relaxed text-slate-400" data-status="plain">
                    {isServer
                        ? t("No VLESS Encryption: the stream is plain VLESS, so it relies on TLS or REALITY underneath, or runs unprotected.")
                        : t("No VLESS Encryption: the stream is plain VLESS. Xray 26.7 and later refuse that to a public address unless TLS or REALITY is on.")}
                </p>
            )}

            {!wrongType && showOptions && (
                <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-vless-options>
                    {!parts && (
                        <p className="text-[10px] leading-relaxed text-slate-500">
                            {t("These apply to the next key you generate.")}
                        </p>
                    )}

                    <RadioGroup
                        label={t("How it looks")}
                        variant="pills"
                        direction="horizontal"
                        value={appearance}
                        onChange={value => edit({ appearance: value })}
                        options={APPEARANCES.map(value => ({ value, label: value }))}
                    />
                    <p className="text-[10px] leading-relaxed text-slate-500">
                        {t("native leaves the handshake as it is. xorpub masks the public keys in it so they pass for random bytes. random masks the whole connection, record headers included.")}
                    </p>
                    {!(APPEARANCES as readonly string[]).includes(appearance) && (
                        <p className="text-[10px] text-rose-300" data-status="appearance">
                            {t("{value} is not one of these; Xray refuses it.", { value: JSON.stringify(appearance) })}
                        </p>
                    )}

                    {isServer ? (
                        <FormField
                            label={t("Ticket lifetime")}
                            help={t("How long a client may resume a session without repeating the whole handshake: seconds, like 600s, or a range such as 300-600s. A single number means a random lifetime between half of it and all of it. 0s turns resumption off.")}
                        >
                            <input
                                className={fieldClass(readLifetime(ticket) === null)}
                                aria-label={t("Ticket lifetime")}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder={DEFAULT_LIFETIME}
                                value={ticket}
                                onChange={e => edit({ ticket: e.target.value })}
                            />
                        </FormField>
                    ) : (
                        <>
                            <RadioGroup
                                label={t("Session resumption")}
                                variant="pills"
                                direction="horizontal"
                                value={ticket === '' && !parts ? '0rtt' : ticket}
                                onChange={value => edit({ ticket: value })}
                                options={RESUMPTIONS.map(value => ({ value, label: value }))}
                            />
                            <p className="text-[10px] leading-relaxed text-slate-500">
                                {t("0rtt reuses a ticket the server handed out and saves a round trip while it lasts; 1rtt always does the full handshake.")}
                            </p>
                        </>
                    )}

                    <FormField
                        label={t("Padding")}
                        help={t("Extra random bytes sent with the handshake, so its size and timing are not always the same. Blocks are written chance-min-max and separated by dots: the first, third, ... are lengths in bytes, the second, fourth, ... are waits in milliseconds. The first block needs a chance of 100 and at least 35 bytes. Left empty, Xray uses its own: {default}.", { default: DEFAULT_PADDING })}
                    >
                        <input
                            className={fieldClass(paddingIssue(padding) !== null)}
                            aria-label={t("Padding")}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={t("Xray's own")}
                            value={padding}
                            onChange={e => edit({ padding: e.target.value })}
                        />
                    </FormField>
                </div>
            )}

            {!wrongType && reading.keys.length > 0 && (
                <ul className="space-y-1" data-keys>
                    {reading.keys.map((k, index) => (
                        <li key={index} className="text-[11px] text-slate-400 flex items-center gap-2">
                            <Icon name="Key" className="text-slate-500 shrink-0" />
                            <span>{t("Key {n}", { n: index + 1 })}</span>
                            <span className="text-slate-300">{keyLabel(k.kind, isServer)}</span>
                            <span className="text-slate-500">{t("{bytes} bytes", { bytes: k.bytes.length })}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* ── The inbound: what the clients are given ─────────────── */}
            {isServer && encrypted && (
                <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3" data-vless-clients>
                    <FormField
                        label={t("What the clients need")}
                        help={t("The string for each client's outbound encryption. It is worked out from the key above — the public half of each private key — and is not stored in this config.")}
                    >
                        <textarea
                            readOnly
                            rows={clientString.length > 200 ? 5 : 2}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono break-all resize-none outline-none"
                            aria-label={t("Client encryption")}
                            data-client-encryption
                            value={clientString}
                            onFocus={e => e.target.select()}
                        />
                    </FormField>
                    <RadioGroup
                        label={t("Session resumption")}
                        variant="pills"
                        direction="horizontal"
                        value={shownResumption}
                        onChange={value => setClientResumption(value)}
                        options={RESUMPTIONS.map(value => ({ value, label: value }))}
                    />
                    <p className="text-[10px] leading-relaxed text-slate-500">
                        {reading.keys.some(k => k.kind === 'mlkem768')
                            ? t("Paste it into each client's VLESS Encryption card, in its outbound. An ML-KEM-768 public key is 1184 bytes, so this string is long; copy it rather than typing it.")
                            : t("Paste it into each client's VLESS Encryption card, in its outbound.")}
                    </p>
                    <div className="flex flex-wrap gap-2 border-t border-emerald-500/10 pt-3">
                        <Button type="button" variant="secondary" size="sm" icon="Copy" disabled={!clientString} onClick={() => copy(clientString)}>
                            {t("Copy client string")}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── The outbound: the server's string, turned into this one ─ */}
            {!isServer && !wrongType && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3" data-vless-from-server>
                    <FormField
                        label={t("From the server's decryption")}
                        help={t("Paste the decryption of the inbound this connects to. This works out the public key that goes with its private one and fills in the Encryption field above.")}
                    >
                        <textarea
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono break-all resize-none outline-none focus:border-indigo-500"
                            aria-label={t("Server's decryption")}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="mlkem768x25519plus.native.600s.…"
                            value={pasted}
                            onChange={e => setPasted(e.target.value)}
                        />
                    </FormField>
                    {fromServer?.kind === 'client' && (
                        <p className="text-[11px] leading-relaxed text-amber-200/90" data-status="already-client">
                            {t("That is already a client string. Paste it into the Encryption field above.")}
                        </p>
                    )}
                    {fromServer?.kind === 'refused' && <Problems items={fromServer.problems.slice(0, 3)} />}
                    {fromServer?.kind === 'derived' && (
                        <p className="text-[11px] leading-relaxed text-emerald-300" data-status="derived">
                            {t("That is a server string. The client's version of it is ready.")}
                        </p>
                    )}
                </div>
            )}

            {/* ── Actions, at the foot ────────────────────────────────── */}
            {!wrongType && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
                    {isServer && replacing ? (
                        <>
                            <p className="basis-full text-[11px] leading-relaxed text-amber-200/90" data-status="replace">
                                {t("A new key replaces the one in use. Every client set up with the old one stops connecting until it is given the new string.")}
                            </p>
                            <Button type="button" variant="warning" size="sm" onClick={() => generate(replacing)}>{t("Replace the key")}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setReplacing(null)}>{t("Cancel")}</Button>
                        </>
                    ) : (
                        <>
                            {isServer && (
                                <>
                                    <Button type="button" variant="secondary" size="sm" icon="Key" onClick={() => askToGenerate('x25519')}>
                                        {encrypted ? t("New X25519 key") : t("Generate X25519 key")}
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" icon="Key" onClick={() => askToGenerate('mlkem768')}>
                                        {encrypted ? t("New ML-KEM-768 key") : t("Generate ML-KEM-768 key")}
                                    </Button>
                                </>
                            )}
                            {!isServer && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    icon="Key"
                                    disabled={fromServer?.kind !== 'derived'}
                                    onClick={() => {
                                        if (fromServer?.kind === 'derived') onChange(path, fromServer.encryption);
                                        setPasted('');
                                    }}
                                >
                                    {t("Use it")}
                                </Button>
                            )}
                            {!isNone && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(path, NO_VLESS_ENCRYPTION)}>
                                    {t("Switch off")}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}
            {isServer && !wrongType && (
                <p className="text-[10px] leading-relaxed text-slate-500">
                    {t("X25519 keys are short. ML-KEM-768 keys make the authentication post-quantum too, at the cost of a client string of about 1.6 KB. The key exchange itself is post-quantum either way.")}
                </p>
            )}
        </div>
    );
};
