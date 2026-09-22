import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { SnippetBodyEditor } from './SnippetBodyEditor';
import { useSnippetsLibrary, type SnippetEntry } from '../../../hooks/useSnippetsLibrary';
import type { SnippetSource } from '../../../core/snippets';
import { perLanguage, t } from '../../../i18n';
import { RemnawaveGuide } from '../remnawave/RemnawaveGuide';
import { SnippetFormEditor, FORM_EDITABLE } from './SnippetFormEditor';

// perLanguage, not a plain const: a module-level table of labels is built once
// at import and would keep whatever language was active then.
const kindLabels = perLanguage((): Record<string, string> => ({
    rules: t("routing rules"),
    outbounds: t("outbounds"),
    balancers: t("balancers"),
    mixed: t("mixed contents"),
    empty: t("empty"),
    unknown: t("unrecognised contents"),
}));

const EntryRow = ({ entry, active, onClick }: { entry: SnippetEntry; active: boolean; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all mb-1 ${
            active
                ? 'bg-fuchsia-600/20 border-fuchsia-500/60'
                : 'bg-slate-900 border-transparent hover:border-slate-700'
        }`}
    >
        <Icon
            name={entry.source === 'panel' ? 'BracketsCurly' : 'CardsThree'}
            weight="bold"
            className={`mt-0.5 shrink-0 ${entry.source === 'panel' ? 'text-fuchsia-400' : 'text-sky-400'}`}
        />
        <span className="min-w-0 flex-1">
            <span className="block font-bold text-slate-200 truncate">{entry.name}</span>
            <span className="block text-[10px] text-slate-500 font-mono truncate">
                {Array.isArray(entry.snippet) ? entry.snippet.length : 0} entry(ies)
                {entry.usage > 0 && <span className="text-emerald-400"> · used {entry.usage}×</span>}
            </span>
        </span>
    </button>
);

/**
 * Snippets & Templates library.
 *
 * Left: the two libraries — snippets stored in Remnawave, and templates
 * stored in this browser. Right: one editor for whichever is selected, with
 * every write to the panel behind an explicit button.
 */
/** The snippet kinds, named the way the badge above names them. */
const kindName = (kind: string | null): string =>
    (kind && kindLabels()[kind]) || String(kind ?? "");

export const SnippetsModal = ({ onClose }: { onClose: () => void }) => {
    const lib = useSnippetsLibrary(true);
    const { draft } = lib;

    // A snippet body is an array of the very objects the routing editor
    // already edits, so it can be edited as a form instead of as raw JSON —
    // but only when every entry is of one kind. A mixed body has no single
    // editor to show, and JSON stays the honest answer there.
    const formEditable = !!lib.draftKind && FORM_EDITABLE.includes(lib.draftKind as any);
    const [bodyView, setBodyView] = React.useState<'form' | 'json'>('form');
    const view = formEditable ? bodyView : 'json';

    const tabButton = (id: SnippetSource, label: string, count: number) => (
        <button
            onClick={() => lib.setTab(id)}
            className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                lib.tab === id ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
            {label} ({count})
        </button>
    );

    return (
        <Modal
            title={t("Snippets & Templates")}
            onClose={onClose}
            className="md:h-[88vh] md:max-h-[92dvh] overflow-hidden"
            hideFooter
        >
            <RemnawaveGuide module="snippets" />

            <div className="flex flex-col md:flex-row flex-1 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {/* ─── Library list ─────────────────────────────────── */}
                {/* One pane at a time on a phone: with both mounted the editor
                    column collapses to zero height and its buttons — including
                    every save action — become unreachable. */}
                <div className={`w-full md:w-72 bg-slate-950 border-r border-slate-800 flex-col min-h-0 md:shrink-0 ${draft ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/50 shrink-0">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                            {tabButton('panel', t("Panel"), lib.panelEntries.length)}
                            {tabButton('local', t("This browser"), lib.localEntries.length)}
                        </div>

                        <div className="relative">
                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-fuchsia-500 transition-colors"
                                placeholder={t("Search snippets...")}
                                value={lib.search}
                                onChange={e => lib.setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-1.5">
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="Plus"
                                className="flex-1 text-[10px]"
                                onClick={() => lib.startNew(lib.tab)}
                            >
                                {t("New")}
                                </Button>
                            {lib.tab === 'panel' && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon="ArrowsClockwise"
                                    className="flex-1 text-[10px]"
                                    loading={lib.loading}
                                    onClick={lib.refresh}
                                    disabled={!lib.connected}
                                >
                                    {t("Refresh")}
                                    </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {lib.tab === 'panel' && !lib.connected && (
                            <div className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3 mb-2">
                                {t("Not connected to Remnawave. These are the last cached copies, and saving to the panel is disabled until you connect.")}
                                </div>
                        )}
                        {lib.tab === 'panel' && lib.supported === false && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 mb-2">
                                {t("This panel has no snippets API. Local templates still work.")}
                                </div>
                        )}

                        {lib.filteredEntries.map(entry => (
                            <EntryRow
                                key={`${entry.source}-${entry.name}`}
                                entry={entry}
                                active={draft?.originalName === entry.name && draft?.source === entry.source}
                                onClick={() => lib.openEntry(entry)}
                            />
                        ))}

                        {lib.filteredEntries.length === 0 && (
                            <div className="text-center text-slate-600 py-8 italic text-[11px] px-3">
                                {lib.tab === 'panel'
                                    ? 'No panel snippets loaded — press Refresh, or New to create the first one.'
                                    : t("No templates in this browser yet. Create one to reuse blocks across configs.")}
                            </div>
                        )}

                        {lib.missingNames.length > 0 && (
                            <div className="mt-3 border-t border-slate-800 pt-3">
                                <div className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold px-1 mb-1.5">
                                    {t("Referenced by this config, body not found")}
                                    </div>
                                {lib.missingNames.map(name => (
                                    <div
                                        key={name}
                                        className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/25 rounded-lg px-2.5 py-1.5 mb-1 font-mono truncate"
                                        title={t("{name} is referenced by this config but is in neither library", { name })}
                                    >
                                        {name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Editor ───────────────────────────────────────── */}
                <div className={`flex-1 flex-col min-h-0 min-w-0 bg-slate-900/50 ${draft ? 'flex' : 'hidden md:flex'}`}>
                    {!draft ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="BracketsCurly" className="text-6xl mb-4 opacity-10" />
                            <p className="text-sm">{t("Select a snippet, or create one")}</p>
                            <p className="text-[11px] text-slate-700 mt-2 max-w-sm">
                                {t("A snippet is a reusable array of routing rules or outbounds. Remnawave expands the reference into its body before a node ever sees the config.")}
</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 md:p-5 flex flex-col gap-4">
                            <Button
                                variant="secondary"
                                icon="ArrowLeft"
                                className="md:hidden w-full"
                                onClick={() => lib.startNew(lib.tab)}
                                title={t("Back to the library list")}
                            >
                                {t("Back to the list")}
                                </Button>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant={draft.source === 'panel' ? 'primary' : 'info'}
                                    icon={draft.source === 'panel' ? 'BracketsCurly' : 'CardsThree'}
                                    size="sm"
                                >
                                    {draft.source === 'panel' ? t("Panel snippet") : t("Local template")}
                                </Badge>
                                {lib.draftKind && (
                                    <Badge variant="default" size="sm">
                                        {draft.body.length} × {kindLabels()[lib.draftKind] || lib.draftKind}
                                    </Badge>
                                )}
                                {!draft.originalName && (
                                    <Badge variant="warning" size="sm" icon="PencilSimple">{t("Unsaved draft")}</Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label={t("Name")}
                                    value={draft.name}
                                    error={lib.draftNameError || undefined}
                                    onChange={(e: any) => lib.updateDraft({ name: e.target.value })}
                                    placeholder={t("Block Private")}
                                    hint={t("Letters, digits, spaces, _ - and / (folders)")}
                                />
                                {draft.source === 'local' && (
                                    <Input
                                        label={t("Note (local only)")}
                                        value={draft.description}
                                        onChange={(e: any) => lib.updateDraft({ description: e.target.value })}
                                        placeholder={t("What this template is for")}
                                    />
                                )}
                            </div>

                            <div className="flex flex-col shrink-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="label-xs">{t("Body — a JSON array of rules or outbounds")}</span>
                                    {formEditable && (
                                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 shrink-0">
                                            {([['form', t("Form")], ['json', t("JSON")]] as const).map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setBodyView(key)}
                                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                                        view === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {view === 'form' ? (
                                    <div className="h-[320px] md:h-[38vh] flex shrink-0">
                                        <SnippetFormEditor
                                            kind={lib.draftKind as any}
                                            body={draft.body}
                                            onChange={body => lib.updateDraft({ body })}
                                        />
                                    </div>
                                ) : (
                                    <SnippetBodyEditor
                                        key={`${draft.source}-${draft.originalName ?? 'new'}`}
                                        value={draft.body}
                                        onChange={body => lib.updateDraft({ body })}
                                        onSyntaxError={lib.setBodySyntaxError}
                                        heightClass="h-[240px] md:h-[34vh]"
                                    />
                                )}
                                {lib.draftBodyError && (
                                    <span className="text-[10px] text-rose-400 mt-1.5">{lib.draftBodyError}</span>
                                )}
                            </div>

                            {/* Save / library actions */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800 pt-3">
                                <Button
                                    variant={lib.confirmEmpty ? 'warning' : 'success'}
                                    icon={lib.confirmEmpty ? 'Warning' : 'FloppyDisk'}
                                    disabled={!lib.canSave || (draft.source === 'panel' && !lib.connected)}
                                    onClick={lib.saveDraft}
                                    title={lib.saveBlockedReason
                                        || (draft.source === 'panel' && !lib.connected ? 'Connect to Remnawave to write to the panel' : undefined)}
                                >
                                    {lib.confirmEmpty
                                        ? t("Confirm: empty “{name}”", { name: draft.name })
                                        : draft.source === 'panel' ? t("Save to panel") : t("Save template")}
                                </Button>

                                {draft.source === 'panel' ? (
                                    <>
                                        <Button variant="secondary" icon="CardsThree" onClick={lib.copyToLocal}>
                                            {t("Copy to local")}
                                            </Button>
                                        <Button
                                            variant={lib.confirmSync ? 'warning' : 'secondary'}
                                            icon={lib.confirmSync ? 'Warning' : 'Broadcast'}
                                            onClick={lib.syncDraft}
                                            disabled={!draft.originalName || !lib.connected}
                                            title={t("Re-apply this snippet to every profile that references it (restarts affected nodes)")}
                                        >
                                            {lib.confirmSync ? t("Confirm: re-apply and restart nodes") : t("Sync to profiles")}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="secondary"
                                            icon="CloudArrowUp"
                                            onClick={lib.pushToPanel}
                                            disabled={!lib.canSave || !lib.connected}
                                            title={t("Create or update this snippet in Remnawave")}
                                        >
                                            {t("Push to panel")}
                                            </Button>
                                        <Button
                                            variant="secondary"
                                            icon="ArrowsSplit"
                                            onClick={lib.useCurrentRules}
                                            title={t("Overwrites the body above with the plain rules from the open config")}
                                        >
                                            {t("Replace body with config rules")}
                                            </Button>
                                    </>
                                )}

                                {draft.originalName && (
                                    lib.confirmDelete ? (
                                        <Button variant="danger" icon="Warning" onClick={lib.removeDraftEntry}>
                                            {t("Confirm delete")}
                                            </Button>
                                    ) : (
                                        <Button variant="ghost" icon="Trash" onClick={() => lib.setConfirmDelete(true)}>
                                            {t("Delete")}
                                            </Button>
                                    )
                                )}
                            </div>

                            {/* Insertion into the open config */}
                            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <span className="label-xs">{t("Insert into the open config")}</span>
                                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                        {(['rules', 'balancers', 'outbounds'] as const).map(target => (
                                            <button
                                                key={target}
                                                onClick={() => lib.setTarget(target)}
                                                className={`px-3 py-2 md:py-1 text-[10px] font-bold rounded-md transition-all ${
                                                    lib.target === target ? 'bg-slate-700 text-white' : 'text-slate-500'
                                                }`}
                                            >
                                                {target === 'rules'
                                                    ? t("Rules")
                                                    : target === 'balancers' ? t("Balancers") : t("Outbounds")}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="primary"
                                        icon="Link"
                                        onClick={lib.insertRef}
                                        disabled={!draft.name.trim() || !!lib.draftNameError || !draft.originalName}
                                        title={draft.originalName
                                            ? 'Add a { snippet: NAME } reference the panel will expand'
                                            : 'Save the snippet first — a reference to an unsaved name expands to nothing'}
                                    >
                                        {t("Insert reference")}
                                        </Button>
                                    <Button
                                        variant="secondary"
                                        icon="LinkBreak"
                                        onClick={lib.insertCopy}
                                        disabled={!draft.originalName || draft.body.length === 0}
                                        title={draft.originalName
                                            ? 'Paste the body in as ordinary items — no longer linked to the snippet'
                                            : 'Save this draft first — the copy is taken from the saved body'}
                                    >
                                        {t("Insert a detached copy")}
                                        </Button>
                                </div>
                                {lib.draftKind && ['rules', 'outbounds', 'balancers'].includes(lib.draftKind) && lib.draftKind !== lib.target && (
                                    <p className="text-[10px] text-amber-300/80">
                                        {t("This body looks like {kind} — inserting it into {target} will not do what you expect.", {
                                            kind: kindName(lib.draftKind),
                                            target: kindName(lib.target),
                                        })}
                                    </p>
                                )}
                                <p className="text-[10px] text-slate-500">
                                    {t("A reference stays managed by the panel. A detached copy is a one-off: later changes to the snippet will not reach this config.")}
                                    </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
