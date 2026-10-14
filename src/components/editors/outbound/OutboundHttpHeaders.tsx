import React from 'react';
import { FormField } from '../../ui/FormField';
import { JsonInput } from '../../ui/JsonInput';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { useField, type FieldPath } from '../../../hooks/useField';
import { httpHeadersProblems, readHttpHeaders } from '../../../core/xray/http-outbound-headers';
import { isPlainObject } from '../../../core/xray/string-map';
import { t } from '../../../i18n';

/**
 * The extra headers an HTTP outbound sends to its proxy: `settings.headers`,
 * an object of header names to strings, beside `address` whichever shape the
 * outbound has (see core/xray/http-outbound-headers.ts).
 *
 * Free-form JSON is the honest shape for a map of names the core does not
 * enumerate, and the box writes the parsed object — never text, which the
 * core could not decode (a string under this key fails the outbound and the
 * config with it). What a config already holds is shown whatever it is: a
 * value that is not an object gets the notice with a way out, and a value
 * inside the object that is not a string is named under the box.
 */
export const OutboundHttpHeaders = ({ outbound, onChange }: {
    outbound: unknown;
    /** The editor's `updateField(path, value)` — see OutboundModal. */
    onChange: (path: FieldPath, value: any) => void;
}) => {
    const headers = useField<unknown>(outbound, onChange, ['settings', 'headers']);
    const held = readHttpHeaders(outbound);
    const wrong = held !== undefined && held !== null && !isPlainObject(held);
    const valueProblems = httpHeadersProblems(outbound).filter(problem => problem.kind === 'headers.value');

    return (
        <div className="md:col-span-2" data-http-headers>
            <FormField
                label={t("Headers")}
                help={t("Extra headers sent with the request that opens the tunnel through this proxy, after the login. A value may use {source} and {target}, which Xray fills in for each connection.", {
                    source: '{{ .Source }}',
                    target: '{{ .Target }}',
                })}
            >
                <div className="flex flex-col gap-2">
                    {wrong && <WrongTypeNotice field="headers" held={held} onRemove={() => headers.onChange(undefined)} />}
                    <JsonInput
                        value={wrong ? undefined : held}
                        onChange={headers.onChange}
                        expects="object"
                        // The shape to type, not prose: the same in every language.
                        placeholder='{ "User-Agent": "Mozilla/5.0" }'
                        ariaLabel={t("Headers")}
                    />
                    {valueProblems.length > 0 && (
                        <ul className="space-y-1">
                            {valueProblems.map((problem, index) => (
                                <li key={index} data-problem={problem.kind} className="text-[10px] leading-relaxed text-rose-300 break-words">
                                    {problem.message}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </FormField>
        </div>
    );
};
