import React, { useId, useState } from 'react';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import {
    DEFAULT_TESTSEED,
    SEED_INDEXES,
    parseUint32,
    readTestseed,
    seedWords,
    withSeedEntry,
    type VisionProblem,
} from '../../../core/xray/vless-vision';
import { t } from '../../../i18n';

export type VisionSeedScope = 'inbound' | 'client' | 'outbound';

/**
 * What each scope's numbers do and who they reach, from the code that applies
 * them (see core/xray/vless-vision, VISION_EVIDENCE, for every line):
 *
 *   - a client's list stands in for the inbound's only when it has four
 *     entries; with fewer, the client gets the inbound's list and the writer
 *     then drops anything under four for Xray's own
 *     (v26.7.28:infra/conf/vless.go:80-82, v26.7.28:proxy/proxy.go:307-309);
 *   - the inbound's pad what the server sends, the outbound's what the client
 *     sends (v26.7.28:proxy/vless/inbound/inbound.go:622,
 *     v26.7.28:proxy/vless/outbound/outbound.go:330), and the receiving side
 *     reads each block's length from the block (v26.7.28:proxy/proxy.go:574-576),
 *     so nothing has to match;
 *   - the inbound's list is applied by the JSON loader to the clients in the
 *     file; its protobuf config has no such field
 *     (v26.7.28:proxy/vless/inbound/config.proto:21).
 */
const words = (scope: VisionSeedScope): { line: string; help: string } => {
    switch (scope) {
        case 'inbound': return {
            line: t("Padding added to what the server sends back. Clients with no numbers of their own use these."),
            help: t("Xray applies these when it loads this config, to the clients written in it. A user added to a running Xray through its API arrives with its own account and does not get them."),
        };
        case 'client': return {
            line: t("Replaces the inbound's numbers for this client when all four are set."),
            help: t("With fewer than four numbers Xray ignores the list and uses the inbound's, or its own where the inbound has none."),
        };
        case 'outbound': return {
            line: t("Padding added to what this client sends. The server needs no matching numbers."),
            help: t("Each padded block carries its own length, so the server reads it whatever numbers it pads with."),
        };
    }
};

/**
 * Vision's four padding numbers (`testseed`), as four boxes.
 *
 * The core reads either a list of four or nothing: fewer than four is thrown
 * away whole and replaced by its own 900, 500, 900, 256. So the boxes are
 * all-or-nothing as well. Typing in any of them writes the whole list, the
 * other three taken from what is held (or, failing that, from the placeholders
 * — the numbers that would apply otherwise), so what the boxes show is what
 * the config says; emptying a box and leaving it puts the held number back,
 * and the button at the foot removes the key.
 *
 * Numbers are written as numbers: the core decodes uint32s and a string, a
 * fraction or a negative number fails the decode of the whole config. What a
 * config already holds that the core cannot decode is shown as what it is,
 * with a way out, and the boxes start empty.
 */
export const VisionSeedEditor = ({ value, onChange, scope, problems = [], fallback, collapsible = false, field = 'testseed' }: {
    /** Whatever the config holds at the key — not necessarily a list. */
    value: unknown;
    /** `undefined` removes the key. */
    onChange: (next: number[] | undefined) => void;
    scope: VisionSeedScope;
    /** The key's own problems, from core/xray/vless-vision. */
    problems?: VisionProblem[];
    /** What applies when this key has none: the inbound's list for a client. Xray's own by default. */
    fallback?: readonly number[];
    /** Start as one line, for a row in a list. Opens by itself while something needs attention. */
    collapsible?: boolean;
    /** The key as it is spelled in the config (for the notice). */
    field?: string;
}) => {
    const id = useId();
    const read = readTestseed(value);
    const entries = read.state === 'list' ? read.entries : [];
    const base = fallback ?? DEFAULT_TESTSEED;
    // Text typed into a box and not yet settled; an emptied box is not a number.
    const [draft, setDraft] = useState<Record<number, string>>({});
    const [chosen, setChosen] = useState<boolean | null>(null);
    const shown = problems.filter(problem => problem.kind !== 'testseed.type');
    const attention = read.state === 'wrong' || shown.length > 0;
    const open = !collapsible || (chosen ?? attention);
    const text = words(scope);

    const settle = (index: number) => setDraft(({ [index]: _gone, ...rest }) => rest);
    const type = (index: (typeof SEED_INDEXES)[number], typed: string) => {
        setDraft(current => ({ ...current, [index]: typed }));
        const amount = parseUint32(typed);
        if (amount !== undefined) onChange(withSeedEntry(entries, index, amount, base));
    };

    const summary = read.state === 'list' && entries.length >= SEED_INDEXES.length
        ? entries.slice(0, SEED_INDEXES.length).join(' · ')
        : read.state === 'absent' || (read.state === 'list' && entries.length === 0)
            ? (scope === 'client' ? t("Same as the inbound") : t("Xray's defaults"))
            : t("Needs attention");

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3" data-vision-seed={scope}>
            {collapsible ? (
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setChosen(!open)}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer select-none"
                >
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 min-w-0">
                        <Icon name="CaretDown" className={`shrink-0 transition-transform ${open ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
                        {t("Vision padding")}
                    </span>
                    <span className={`text-[10px] font-mono truncate ${attention ? 'text-rose-300' : 'text-slate-500'}`} data-vision-seed-summary>{summary}</span>
                </button>
            ) : (
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    {t("Vision padding")}
                    <Help>{text.help}</Help>
                </span>
            )}

            {open && (
                <>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        {text.line}
                        {collapsible && <Help>{text.help}</Help>}
                    </p>

                    {read.state === 'wrong' && (
                        <WrongTypeNotice field={field} held={value} expects="numbers" onRemove={() => onChange(undefined)} />
                    )}

                    <div className="space-y-2.5">
                        {SEED_INDEXES.map(index => {
                            const label = seedWords(index);
                            const held = entries[index];
                            const problem = shown.find(found => found.entry === index);
                            return (
                                <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3 items-start" data-seed-entry={index}>
                                    <label htmlFor={`${id}-${index}`} className="min-w-0">
                                        <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">{label.label}</span>
                                        <span className="block text-[10px] leading-snug text-slate-500">{label.help}</span>
                                    </label>
                                    <input
                                        id={`${id}-${index}`}
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        step={1}
                                        className={`input-base text-right ${problem?.severity === 'critical' ? 'border-rose-500 bg-rose-500/10' : ''}`}
                                        placeholder={String(base[index] ?? DEFAULT_TESTSEED[index])}
                                        value={draft[index] ?? (held !== undefined ? String(held) : '')}
                                        onChange={event => type(index, event.target.value)}
                                        onBlur={() => settle(index)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {shown.length > 0 && (
                        <ul className="space-y-1">
                            {shown.map((problem, at) => (
                                <li
                                    key={at}
                                    data-problem={problem.kind}
                                    className={`text-[10px] leading-relaxed break-words ${problem.severity === 'critical' ? 'text-rose-300' : 'text-amber-200/80'}`}
                                >
                                    {problem.message}
                                    {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* At the foot: on a phone the top of a card is for reading. */}
                    {read.state !== 'absent' && read.state !== 'wrong' && (
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                        >
                            {scope === 'client' ? t("Use the inbound's numbers") : t("Use Xray's numbers")}
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
