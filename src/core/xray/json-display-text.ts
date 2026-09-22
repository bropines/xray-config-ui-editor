// ============================================================
// Which text to show for a value that changed elsewhere
// ============================================================

import { parseJsonc, stringifyJsonc } from '../../utils/jsonc';

/**
 * A JSON field shows text, but it is driven by a parsed value.
 *
 * When that value changes — an undo, a form edit, a profile switch — the box
 * has to be refilled, and the question is what with. Re-printing the object
 * would throw away every comment and every line the author arranged, so the
 * candidates are tried in order of how much of that they preserve: the raw
 * text handed down for this exact value, then the text already on screen if
 * it still means the same thing, then the stored text of the whole config,
 * and only then a fresh print.
 *
 * Returns null when what is on screen should stay — including while it is
 * mid-edit and does not parse, which is the case that must never be
 * overwritten.
 */

export interface DisplayTextInput {
    /** The value the field is now bound to. */
    value: unknown;
    /** What the editor is showing right now. */
    text: string;
    /** Text the caller says belongs to this value, if it has any. */
    rawText?: string | null;
    /** The whole config as stored, comments and all. */
    rawConfigText?: string | null;
    /** Which slice of the config this field edits. */
    schemaMode?: string;
}

const same = (a: unknown, b: unknown): boolean => {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
};

/** comment-json marks the parsed root with `i`; it is not part of the value. */
const withoutMarker = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('i' in (value as object))) {
        return value;
    }
    const copy: Record<PropertyKey, unknown> = { ...(value as Record<string, unknown>) };
    for (const symbol of Object.getOwnPropertySymbols(value)) {
        copy[symbol] = (value as Record<PropertyKey, unknown>)[symbol];
    }
    delete copy.i;
    return copy;
};

/** The key a section mode reads out of the whole config. */
const sectionKeyFor = (schemaMode?: string): string | null => {
    if (!schemaMode || schemaMode === 'full') return null;
    if (schemaMode === 'inbound') return 'inbounds';
    if (schemaMode === 'outbound') return 'outbounds';
    return schemaMode;
};

export const pickDisplayText = ({
    value,
    text,
    rawText,
    rawConfigText,
    schemaMode,
}: DisplayTextInput): string | null => {
    const displayValue = withoutMarker(value);

    // 1. Text the caller says is this value's own.
    if (rawText && rawText.trim() !== '') {
        try {
            if (same(parseJsonc(rawText), displayValue)) return rawText;
        } catch { /* not usable; try the next candidate */ }
    }

    // 2. What is on screen, if it already says the same thing — this is what
    //    keeps comments and formatting through an edit made elsewhere.
    try {
        if (text.trim() !== '' && same(parseJsonc(text), displayValue)) return null;
    } catch {
        // Mid-edit and unparseable: never overwrite what is being typed.
        return null;
    }

    // 3. The stored config, for a field that shows all or part of it.
    if (rawConfigText && rawConfigText.trim() !== '') {
        try {
            const full = parseJsonc(rawConfigText) as Record<string, unknown>;
            const key = sectionKeyFor(schemaMode);
            if (key === null) {
                if (same(full, displayValue)) return rawConfigText;
            } else if (key in full) {
                if (same(full[key], displayValue)) return stringifyJsonc(full[key], 2);
            }
        } catch { /* not usable; fall through to printing */ }
    }

    // 4. Print it.
    return stringifyJsonc(displayValue, 2);
};
