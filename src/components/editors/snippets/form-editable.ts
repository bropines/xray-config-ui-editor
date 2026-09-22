import type { SnippetKind } from '../../../core/snippets';

/**
 * Kinds the snippet editor can render as a form.
 *
 * `empty` is included because a new snippet starts empty, and sending someone
 * to raw JSON to write their first entry defeats the point — the form asks
 * what they are building instead. `mixed` stays out: there is no single
 * editor for a body of two kinds.
 */
export const FORM_EDITABLE: SnippetKind[] = ['rules', 'outbounds', 'balancers', 'empty'];
