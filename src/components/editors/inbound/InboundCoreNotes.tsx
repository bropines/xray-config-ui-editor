import React from 'react';
import { Icon } from '../../ui/Icon';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { adoptAlias, dropAlias } from '../../../core/generators/endpoint-factory';
import { generateWireguardKeyPair } from '../../../core/generators/crypto';
import type { FieldPath } from '../../../hooks/useField';
import { inboundNotes, topKeyOf, withoutPath, type InboundNote } from './core-notes';
import { t } from '../../../i18n';

interface InboundCoreNotesProps {
    inbound: any;
    /** The editor's updateField(path, value) — see InboundModal. */
    onChange: (path: FieldPath, value: any) => void;
}

/**
 * The keys in this inbound that the chosen core refuses or silently drops,
 * and what it refuses the inbound for lacking, each with the one action that
 * fixes it.
 *
 * Nothing here is deleted behind the user's back: a key that does nothing is
 * shown doing nothing until someone presses Remove. Information on top,
 * the action under it.
 */
export const InboundCoreNotes = ({ inbound, onChange }: InboundCoreNotesProps) => {
    const { version, tag } = useCoreVersion();
    const notes = inboundNotes(inbound, version);
    if (!notes.length) return null;

    const refused = notes.some(note =>
        note.kind === 'problem'
        || (note.kind === 'feature' && note.status === 'rejected')
        || (note.kind === 'value' && note.set.outside === 'rejected'));

    const setSettings = (next: any) => onChange('settings', next.settings);
    const remove = (path: string) => {
        const top = topKeyOf(path);
        onChange(top, (withoutPath(inbound, path) as Record<string, unknown>)[top]);
    };

    const describe = (note: InboundNote): { text: string; hint?: string; actions: { label: string; run: () => void }[] } => {
        if (note.kind === 'problem') {
            const { kind, message, suggestion } = note.problem;
            return {
                text: message,
                hint: suggestion,
                // An empty key has one fix that takes nothing away, so it is
                // offered here as well as on the card: on a phone the card is
                // a screen further down. A key that is there and wrong is
                // somebody's key — replacing it is theirs to decide, below.
                actions: kind === 'secretKey.empty'
                    ? [{ label: t("Generate a key"), run: () => onChange(['settings', 'secretKey'], generateWireguardKeyPair().secretKey) }]
                    : [],
            };
        }
        if (note.kind === 'conflict') {
            const { key, alias } = note.pair;
            return {
                text: t("{key} and {alias} are both set. Every supported Xray reads {key}, so {alias} does nothing.", { key, alias }),
                hint: note.keyEmpty ? t("{key} is empty, which leaves this inbound with no users on any supported Xray.", { key }) : undefined,
                actions: [
                    ...(note.pair.list ? [{ label: t("Use {alias} instead", { alias }), run: () => setSettings(adoptAlias(inbound, note.pair)) }] : []),
                    { label: t("Remove {alias}", { alias }), run: () => setSettings(dropAlias(inbound, note.pair)) },
                ],
            };
        }
        if (note.kind === 'value') {
            const what = `${note.set.path} = "${note.value}"`;
            const replacement = note.set.replacedBy?.[note.value.toLowerCase()] ?? note.set.replacedBy?.[note.value];
            return {
                text: note.set.outside === 'rejected'
                    ? t("{what} is refused by Xray {tag} — the config will not load.", { what, tag })
                    : t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what, tag }),
                hint: replacement ? t("Use {replacement} instead.", { replacement }) : undefined,
                actions: [],
            };
        }
        const { feature, status, everywhere, action, pair } = note;
        const what = feature.value !== undefined ? `${feature.path} = "${feature.value}"` : feature.path;
        const text = status === 'rejected'
            ? t("{what} is refused by Xray {tag} — the config will not load.", { what, tag })
            : status === 'deprecated'
                ? t("{what} is deprecated in Xray {tag}. It still works, and the log will ask you to move off it.", { what, tag })
                : everywhere
                    ? t("{what} is not read by any supported Xray version — it does nothing.", { what })
                    : t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what, tag });
        const actions = action === 'adopt' && pair
            ? [{ label: t("Rename to {key}", { key: pair.key }), run: () => setSettings(adoptAlias(inbound, pair)) }]
            : action === 'remove'
                ? [{ label: t("Remove"), run: () => remove(feature.path) }]
                : [];
        return {
            text,
            hint: feature.replacement ? t("Use {replacement} instead.", { replacement: feature.replacement }) : undefined,
            actions,
        };
    };

    const tone = refused
        ? { box: 'bg-rose-950/20 border-rose-500/30', title: 'text-rose-300', icon: 'WarningOctagon' }
        : { box: 'bg-amber-950/20 border-amber-500/30', title: 'text-amber-300', icon: 'Warning' };

    return (
        <div className={`p-4 rounded-xl border space-y-3 ${tone.box}`}>
            <h4 className={`label-xs flex items-center gap-1.5 ${tone.title}`}>
                <Icon name={tone.icon} weight="fill" />
                {t("Checked against Xray {tag}", { tag })}
            </h4>
            <ul className="space-y-3">
                {notes.map((note, index) => {
                    const { text, hint, actions } = describe(note);
                    return (
                        <li key={index} className="space-y-2">
                            <p className="text-[11px] leading-relaxed text-slate-300 break-words">{text}</p>
                            {hint && <p className="text-[10px] leading-relaxed text-slate-500 break-words">{hint}</p>}
                            {actions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {actions.map(({ label, run }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={run}
                                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-indigo-500/50 hover:text-white transition-colors"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
