import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { SnippetBodyEditor } from './SnippetBodyEditor';
import { useSnippetsLibrary, type SnippetEntry } from '../../../hooks/useSnippetsLibrary';
import type { SnippetSource } from '../../../core/snippets';

const KIND_LABEL: Record<string, string> = {
    rules: 'routing rules',
    outbounds: 'outbounds',
    balancers: 'balancers',
    mixed: 'mixed contents',
    empty: 'empty',
    unknown: 'unrecognised contents',
};

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
export const SnippetsModal = ({ onClose }: { onClose: () => void }) => {
    const lib = useSnippetsLibrary(true);
    const { draft } = lib;

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
            title="Snippets & Templates"
            onClose={onClose}
            className="h-[90vh] md:h-[88vh] max-h-[92vh] overflow-hidden"
            hideFooter
        >
            <div className="flex flex-col md:flex-row flex-1 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {/* ─── Library list ─────────────────────────────────── */}
                <div className="w-full md:w-72 bg-slate-950 border-r border-slate-800 flex flex-col min-h-0 shrink-0">
                    <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/50 shrink-0">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                            {tabButton('panel', 'Panel', lib.panelEntries.length)}
                            {tabButton('local', 'Local', lib.localEntries.length)}
                        </div>

                        <div className="relative">
                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-fuchsia-500 transition-colors"
                                placeholder="Search snippets..."
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
                                New
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
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {lib.tab === 'panel' && !lib.connected && (
                            <div className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3 mb-2">
                                Not connected to Remnawave. Panel snippets shown here are the last
                                cached copy.
                            </div>
                        )}
                        {lib.tab === 'panel' && lib.supported === false && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 mb-2">
                                This panel has no snippets API. Local templates still work.
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
                                    ? 'No panel snippets loaded.'
                                    : 'No local templates yet. Create one to reuse blocks across configs.'}
                            </div>
                        )}

                        {lib.missingNames.length > 0 && (
                            <div className="mt-3 border-t border-slate-800 pt-3">
                                <div className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold px-1 mb-1.5">
                                    Referenced but not loaded
                                </div>
                                {lib.missingNames.map(name => (
                                    <div
                                        key={name}
                                        className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/25 rounded-lg px-2.5 py-1.5 mb-1 font-mono truncate"
                                        title={`${name} is referenced by this config but is in neither library`}
                                    >
                                        {name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Editor ───────────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/50">
                    {!draft ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="BracketsCurly" className="text-6xl mb-4 opacity-10" />
                            <p className="text-sm">Select a snippet, or create one</p>
                            <p className="text-[11px] text-slate-700 mt-2 max-w-sm">
                                A snippet is a reusable array of routing rules or outbounds. Remnawave
                                expands <span className="font-mono">{'{ "snippet": "NAME" }'}</span> into
                                its body before a node ever sees the config.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 md:p-5 flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant={draft.source === 'panel' ? 'primary' : 'info'}
                                    icon={draft.source === 'panel' ? 'BracketsCurly' : 'CardsThree'}
                                    size="sm"
                                >
                                    {draft.source === 'panel' ? 'Panel snippet' : 'Local template'}
                                </Badge>
                                {lib.draftKind && (
                                    <Badge variant="default" size="sm">
                                        {draft.body.length} × {KIND_LABEL[lib.draftKind] || lib.draftKind}
                                    </Badge>
                                )}
                                {!draft.originalName && (
                                    <Badge variant="warning" size="sm" icon="PencilSimple">Unsaved draft</Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label="Name"
                                    value={draft.name}
                                    error={lib.draftNameError || undefined}
                                    onChange={(e: any) => lib.updateDraft({ name: e.target.value })}
                                    placeholder="Block Private"
                                    hint="Letters, digits, spaces, _ - and / (folders)"
                                />
                                {draft.source === 'local' && (
                                    <Input
                                        label="Note (local only)"
                                        value={draft.description}
                                        onChange={(e: any) => lib.updateDraft({ description: e.target.value })}
                                        placeholder="What this template is for"
                                    />
                                )}
                            </div>

                            <div className="flex flex-col">
                                <SnippetBodyEditor
                                    key={`${draft.source}-${draft.originalName ?? 'new'}`}
                                    label="Body — a JSON array of rules or outbounds"
                                    value={draft.body}
                                    onChange={body => lib.updateDraft({ body })}
                                    heightClass="h-[34vh]"
                                />
                                {lib.draftBodyError && (
                                    <span className="text-[10px] text-rose-400 mt-1.5">{lib.draftBodyError}</span>
                                )}
                            </div>

                            {/* Save / library actions */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800 pt-3">
                                <Button
                                    variant="success"
                                    icon="FloppyDisk"
                                    disabled={!lib.canSave}
                                    onClick={lib.saveDraft}
                                >
                                    {draft.source === 'panel' ? 'Save to panel' : 'Save template'}
                                </Button>

                                {draft.source === 'panel' ? (
                                    <>
                                        <Button variant="secondary" icon="CardsThree" onClick={lib.copyToLocal}>
                                            Copy to local
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            icon="Broadcast"
                                            onClick={lib.syncDraft}
                                            disabled={!draft.originalName || !lib.connected}
                                            title="Re-apply this snippet to every profile that references it (restarts affected nodes)"
                                        >
                                            Sync to profiles
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="secondary"
                                            icon="CloudArrowUp"
                                            onClick={lib.pushToPanel}
                                            disabled={!lib.canSave || !lib.connected}
                                            title="Create or update this snippet in Remnawave"
                                        >
                                            Push to panel
                                        </Button>
                                        <Button variant="secondary" icon="ArrowsSplit" onClick={lib.useCurrentRules}>
                                            Capture current rules
                                        </Button>
                                    </>
                                )}

                                {draft.originalName && (
                                    lib.confirmDelete ? (
                                        <Button variant="danger" icon="Warning" onClick={lib.removeDraftEntry}>
                                            Confirm delete
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" icon="Trash" onClick={() => lib.setConfirmDelete(true)}>
                                            Delete
                                        </Button>
                                    )
                                )}
                            </div>

                            {/* Insertion into the open config */}
                            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <span className="label-xs">Insert into the open config</span>
                                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                        {(['rules', 'balancers', 'outbounds'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => lib.setTarget(t)}
                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                                    lib.target === t ? 'bg-slate-700 text-white' : 'text-slate-500'
                                                }`}
                                            >
                                                {t === 'rules' ? 'Rules' : t === 'balancers' ? 'Balancers' : 'Outbounds'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="primary"
                                        icon="Link"
                                        onClick={lib.insertRef}
                                        disabled={!draft.name.trim() || !!lib.draftNameError}
                                        title="Add a { snippet: NAME } reference the panel will expand"
                                    >
                                        Insert reference
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        icon="LinkBreak"
                                        onClick={lib.insertCopy}
                                        disabled={!draft.originalName || draft.body.length === 0}
                                        title="Paste the body in as ordinary items — no longer linked to the snippet"
                                    >
                                        Insert a copy
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    A reference stays managed by the panel. A copy is a one-off: later
                                    changes to the snippet will not reach this config.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
