import React from 'react';
import { NumberInput } from '../../ui/NumberInput';
import { Help } from '../../ui/Help';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    FALLBACK_LIMIT_KEYS,
    fallbackLimitIsInert,
    fallbackLimitProblems,
    formatByteCount,
    readFallbackLimit,
    withFallbackLimit,
    type FallbackLimitKey,
} from '../../../core/xray/security-fields';
import { perLanguage, t } from '../../../i18n';

/**
 * What each number does, from the code that applies it rather than from its
 * name — `burstBytesPerSec` in particular is a size, not a rate. See
 * core/xray/security-fields for the source lines.
 */
const FIELDS = perLanguage((): Record<FallbackLimitKey, { label: string; unit: string; help: string; perSecond: boolean }> => ({
    bytesPerSec: {
        label: t("Rate"),
        unit: t("bytes/s"),
        help: t("How fast the forwarded traffic may flow once the limit applies. Empty or 0 is no limit at all, and the two fields beside it then do nothing."),
        perSecond: true,
    },
    afterBytes: {
        label: t("Free allowance"),
        unit: t("bytes"),
        help: t("This much of each connection passes at full speed before the limit starts."),
        perSecond: false,
    },
    burstBytesPerSec: {
        label: t("Burst"),
        unit: t("bytes"),
        help: t("How much may pass in one go after a quiet moment — the size of the token bucket, in bytes despite the key's name. Raised to the rate when set lower."),
        perSecond: false,
    },
}));

export type FallbackLimitName = 'limitFallbackUpload' | 'limitFallbackDownload';

/**
 * One of REALITY's two fallback limits, drawn as the three numbers it is.
 *
 * The form used to hand these to a text input, which wrote a string; the
 * core decodes the key into a struct of three uint64 and cannot read a
 * config with a string there (see core/xray/security-fields). So each number
 * is its own field and is written as a number, an emptied field removes its
 * sub-key, and the key itself goes once nothing is left in it.
 *
 * A config that already holds something else here — the old form's string —
 * is shown as what it is, with a way out, and the fields below start empty:
 * filling one in replaces it with a proper object.
 */
export const FallbackLimitEditor = ({ limit, value, onChange, error }: {
    /** Which of the two keys this is. (Not `name`: see WrongTypeNotice.) */
    limit: FallbackLimitName;
    /** Whatever the config holds — not necessarily an object. */
    value: unknown;
    /** `undefined` removes the key. */
    onChange: (next: unknown) => void;
    error?: string;
}) => {
    const { tag } = useCoreVersion();
    const upload = limit === 'limitFallbackUpload';
    const held = value !== undefined && value !== null;
    const wrongType = held && (typeof value !== 'object' || Array.isArray(value));
    // What the fields read and write: never the wrong-typed value itself.
    const settings = wrongType ? undefined : value;
    const problems = fallbackLimitProblems(settings, limit, tag);
    const fields = FIELDS();

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3" data-fallback-limit={limit}>
            <div>
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    {upload ? t("Fallback upload limit") : t("Fallback download limit")}
                    <Help>{t("REALITY hands every connection that is not one of its own clients on to the target site. These limits apply to those forwarded connections only, never to your clients' traffic — they keep the server from being a free relay to the target.")}</Help>
                </span>
                <p className="text-[11px] text-slate-500">
                    {upload
                        ? t("Caps what a forwarded connection may send on to the target — visitor to target.")
                        : t("Caps what the target may send back over a forwarded connection — target to visitor.")}
                </p>
                {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
            </div>

            {wrongType && <WrongTypeNotice field={limit} held={value} onRemove={() => onChange(undefined)} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {FALLBACK_LIMIT_KEYS.map(key => {
                    const field = fields[key];
                    const current = readFallbackLimit(settings, key);
                    const readable = formatByteCount(current);
                    const problem = problems.find(found => found.key === key);
                    return (
                        <div key={key} className="flex flex-col gap-1.5" data-limit-field={key}>
                            <label className="label-xs flex items-center gap-1">
                                <span>{field.label}</span>
                                <span className="normal-case tracking-normal font-normal text-slate-600">· {field.unit}</span>
                                <Help>{field.help}</Help>
                            </label>
                            <NumberInput
                                value={typeof current === 'number' ? current : undefined}
                                onChange={amount => onChange(withFallbackLimit(settings, key, amount))}
                                placeholder="0"
                                min={0}
                            />
                            {problem
                                ? <p className="text-[10px] text-rose-400 leading-snug">{problem.message}</p>
                                : readable && (
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        = {readable}{field.perSecond ? '/s' : ''}
                                    </p>
                                )}
                        </div>
                    );
                })}
            </div>

            {fallbackLimitIsInert(settings) && (
                <p className="text-[11px] text-amber-200/80">
                    {t("With no rate set, Xray does not limit this direction — the other values here do nothing.")}
                </p>
            )}

            {/* At the foot: on a phone the top of a card is for reading. */}
            {held && !wrongType && (
                <button
                    type="button"
                    onClick={() => onChange(undefined)}
                    className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                >
                    {t("Remove this limit")}
                </button>
            )}
        </div>
    );
};
