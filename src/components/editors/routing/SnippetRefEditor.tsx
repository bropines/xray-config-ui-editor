import { useMemo, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SnippetBodyEditor } from '../snippets/SnippetBodyEditor';
import {
    classifySnippet,
    getSnippetRefName,
    makeSnippetRef,
    validateSnippetName,
    type SnippetDefinition,
} from '../../../core/snippets';

interface SnippetRefEditorProps {
    /** The `{ "snippet": "NAME" }` entry being edited. */
    rule: any;
    /** Writes the entry back into routing.rules. */
    onChange: (value: any) => void;
    /** Every known definition — panel snippets plus local templates. */
    snippets: SnippetDefinition[];
    /** Opens the snippet library modal. */
    onOpenSnippets?: () => void;
    /** Replaces this reference with a local copy of the snippet's body. */
    onInlineCopy?: (name: string) => void;
}

/**
 * Detail pane for a snippet reference.
 *
 * A reference has no fields of its own to edit — the body lives in the panel.
 * So instead of the rule form this shows what the reference resolves to,
 * lets the user point it at a different snippet, and offers the one
 * destructive escape hatch (inline the body, losing the link) behind a
 * confirmation.
 */
export const SnippetRefEditor = ({
    rule,
    onChange,
    snippets,
    onOpenSnippets,
    onInlineCopy,
}: SnippetRefEditorProps) => {
    // RuleEditor keys this component by the referenced name, so selecting a
    // different reference remounts it and both drafts below start fresh —
    // no state-syncing effect needed.
    const name = getSnippetRefName(rule) || '';
    const [draftName, setDraftName] = useState(name);
    const [confirmInline, setConfirmInline] = useState(false);

    const definition = useMemo(
        () => snippets.find(s => s.name === name),
        [snippets, name]
    );

    const body = Array.isArray(definition?.snippet) ? definition!.snippet : null;
    const kind = body ? classifySnippet(body) : null;
    const nameError = draftName.trim() === name ? null : validateSnippetName(draftName);
    const knownNames = useMemo(() => snippets.map(s => s.name).sort(), [snippets]);

    const commitName = () => {
        const trimmed = draftName.trim();
        if (!trimmed || trimmed === name || validateSnippetName(trimmed)) return;
        // Keep any sibling keys the user wrote by hand (e.g. a comment field)
        // and swap only the reference itself.
        onChange({ ...rule, ...makeSnippetRef(trimmed) });
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 md:p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/40 flex items-center justify-center shrink-0">
                    <Icon name="BracketsCurly" weight="bold" className="text-fuchsia-300 text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-white font-bold text-base truncate">{name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Snippet reference. Remnawave replaces it with the snippet body before the
                        config reaches a node, so there is nothing to configure here.
                    </p>
                </div>
            </div>

            <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-2.5 text-[11px] ${
                body
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}>
                <Icon name={body ? 'Check' : 'Warning'} weight="fill" className="shrink-0" />
                {body ? (
                    <span>
                        Resolved from {definition!.source === 'panel' ? 'the panel' : 'a local template'} —{' '}
                        <b>{body.length}</b> {kind === 'outbounds' ? 'outbound(s)' : 'entry(ies)'}
                        {kind === 'mixed' && ' (mixed rules and outbounds)'}
                    </span>
                ) : (
                    <span>
                        Body not loaded. Open the snippet library and refresh to fetch it from the panel.
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="label-xs">Referenced snippet</label>
                <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                        <Input
                            value={draftName}
                            list="snippet-names"
                            onChange={(e: any) => setDraftName(e.target.value)}
                            onBlur={commitName}
                            onKeyDown={(e: any) => { if (e.key === 'Enter') commitName(); }}
                            placeholder="Snippet name"
                        />
                        <datalist id="snippet-names">
                            {knownNames.map(n => <option key={n} value={n} />)}
                        </datalist>
                    </div>
                    <Button
                        variant="secondary"
                        icon="Check"
                        onClick={commitName}
                        disabled={!!nameError || draftName.trim() === name || !draftName.trim()}
                    >
                        Apply
                    </Button>
                </div>
                {nameError && <span className="text-[10px] text-rose-400">{nameError}</span>}
            </div>

            {body && (
                <div className="flex flex-col">
                    <SnippetBodyEditor
                        label="Snippet body (read-only)"
                        value={body}
                        readOnly
                        heightClass="h-[32vh]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">
                        Edit this body in the snippet library — it is shared by every profile that
                        references it.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
                {onOpenSnippets && (
                    <Button variant="secondary" icon="BracketsCurly" onClick={onOpenSnippets}>
                        Open snippet library
                    </Button>
                )}
                {onInlineCopy && body && (
                    confirmInline ? (
                        <Button variant="warning" icon="Warning" onClick={() => { onInlineCopy(name); setConfirmInline(false); }}>
                            Confirm: inline {body.length} item(s) and drop the link
                        </Button>
                    ) : (
                        <Button variant="secondary" icon="LinkBreak" onClick={() => setConfirmInline(true)}>
                            Inline a copy
                        </Button>
                    )
                )}
            </div>
            {confirmInline && (
                <p className="text-[10px] text-amber-300/80 -mt-2">
                    The reference is replaced by a copy of its contents. Later changes to the panel
                    snippet will no longer reach this profile.
                </p>
            )}
        </div>
    );
};
