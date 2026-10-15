import React from 'react';
import { Icon } from './Icon';
import { t } from '../../i18n';

/** A held value, short enough for one line. */
const preview = (value: unknown): string => {
    let text: string;
    try {
        text = JSON.stringify(value) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.length > 48 ? `${text.slice(0, 47)}…` : text;
};

/**
 * A key that holds a value of the wrong JSON type — a string where the core
 * reads an object.
 *
 * Xray decodes its config with Go's encoding/json into typed structs, and a
 * string in a struct, pointer or map field is a type error that fails the
 * decode of the whole document, not of that key
 * (v26.7.28:infra/conf/serial/loader.go:57-69, the same lines at v26.9.9;
 * v26.3.27:infra/conf/serial/loader.go:54-66). The form used to write exactly
 * that for every object-typed key,
 * so configs holding one exist. Such a value is shown rather than dropped —
 * it is in the config, and it is why the config does not load — and the way
 * out is at the bottom, where a thumb finds it on a phone.
 *
 * The same goes the other way round for a key the core reads as a string
 * (`expects="text"`): a boolean there fails the decode just as a string does
 * where an object is read. And for the numbers Vision is tuned with: a list of
 * whole numbers (`expects="numbers"`, `testseed`) and one whole number
 * (`expects="number"`, `testpre`), both unsigned 32-bit in the core.
 */
export const WrongTypeNotice = ({ field, held, onRemove, expects = 'object' }: {
    /**
     * The key, as it is spelled in the config. Not called `name`: the icon
     * test reads every `name="…"` literal in a file that draws icons as an
     * icon name, and a config key is not one.
     */
    field: string;
    held: unknown;
    onRemove: () => void;
    /** What the core reads at this key. Objects are the usual case. */
    expects?: 'object' | 'text' | 'numbers' | 'number';
}) => (
    <div className="p-3 rounded-xl border space-y-3 bg-rose-950/20 border-rose-500/40" data-wrong-type={field}>
        <div className="flex gap-2 text-[11px] leading-relaxed">
            <Icon name="WarningOctagon" weight="fill" className="shrink-0 mt-0.5 text-rose-400" />
            <p className="text-rose-200/90 break-words min-w-0">
                {expects === 'text'
                    ? t("{name} holds {value}, and Xray reads text here — it cannot read the config until this is replaced or removed.", { name: field, value: preview(held) })
                    : expects === 'numbers'
                        ? t("{name} holds {value}, and Xray reads a list of whole numbers here — it cannot read the config until this is replaced or removed.", { name: field, value: preview(held) })
                        : expects === 'number'
                            ? t("{name} holds {value}, and Xray reads a whole number here — it cannot read the config until this is replaced or removed.", { name: field, value: preview(held) })
                            : t("{name} holds {value}, and Xray reads an object here — it cannot read the config until this is replaced or removed.", { name: field, value: preview(held) })}
            </p>
        </div>
        <button
            type="button"
            onClick={onRemove}
            className="h-9 px-4 rounded-lg border bg-slate-950/40 text-[11px] font-bold transition-colors border-rose-500/40 text-rose-200 hover:border-rose-400"
        >
            {t("Remove it")}
        </button>
    </div>
);
