import React from 'react';
import { Help } from '../../ui/Help';
import { JsonInput } from '../../ui/JsonInput';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { attrsProblems, attrsWrongType, readAttrs } from '../../../core/xray/routing-attrs';
import { t } from '../../../i18n';

/**
 * A routing rule's `attrs`: attribute names to the patterns their values have
 * to match — an object of strings on every line (see core/xray/routing-attrs.ts).
 *
 * The box writes only that: complete JSON that is an object whose values are
 * all strings. Anything else stays in the box, said to be wrong, and the
 * config keeps what it had. What a config already holds is shown whatever it
 * is — a value that is not an object gets the notice with a way out, and an
 * object with a value that is not a string is drawn in the box with that
 * value named under it, because that is what the core fails to decode.
 */
export const RuleAttrs = ({ rule, onChange }: {
    rule: unknown;
    /** `undefined` removes the key. */
    onChange: (value: unknown) => void;
}) => {
    const held = readAttrs(rule);
    const wrong = attrsWrongType(rule);
    const valueProblems = attrsProblems(rule).filter(problem => problem.kind === 'attrs.value');

    return (
        <div className="flex flex-col gap-2 h-full" data-rule-attrs>
            <label className="label-xs flex items-center gap-1.5 text-slate-400">
                {t("HTTP attributes")}
                <Help>{t("Matches a sniffed HTTP request: :method, :path and, on the HTTP inbound, each request header by its lower-case name. Each value is a regular expression the attribute has to match, and every entry has to match. A pattern Go cannot compile stops Xray when it starts.")}</Help>
            </label>
            {wrong && <WrongTypeNotice field="attrs" held={held} onRemove={() => onChange(undefined)} />}
            <JsonInput
                value={wrong ? undefined : held}
                onChange={onChange}
                expects="string-map"
                // The shape to type, not prose: the same in every language.
                placeholder='{ ":method": "GET", ":path": "^/api/" }'
                ariaLabel={t("HTTP attributes")}
            />
            {valueProblems.length > 0 && (
                <ul className="space-y-1" data-attrs-problems>
                    {valueProblems.map(problem => (
                        <li key={problem.name} data-problem={problem.kind} className="text-[10px] leading-relaxed text-rose-300 break-words">
                            {problem.message}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
