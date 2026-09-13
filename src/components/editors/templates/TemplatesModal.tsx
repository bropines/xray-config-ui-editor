import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { JsonEditor } from '../../ui/JsonEditor';
import { useTemplatesLibrary, isJsonTemplate, TEMPLATE_TYPES } from '../../../hooks/useTemplatesLibrary';

const TYPE_VARIANT: Record<string, any> = {
    XRAY_JSON: 'primary',
    XRAY_BASE64: 'default',
    MIHOMO: 'info',
    STASH: 'info',
    CLASH: 'info',
    SINGBOX: 'info',
};

/**
 * Subscription Templates editor.
 *
 * The free-form counterpart to the Local Balancer builder: any template the
 * panel holds can be opened as text and saved back, including ones this app
 * did not write. JSON templates are edited as JSON; the YAML kinds are stored
 * base64 and are decoded here so they read as YAML rather than as a blob.
 */
export const TemplatesModal = ({ onClose, onOpenInBuilder }: {
    onClose: () => void;
    onOpenInBuilder?: (uuid: string) => void;
}) => {
    const t = useTemplatesLibrary();
    const { draft } = t;

    return (
        <Modal
            title="Subscription Templates"
            onClose={onClose}
            onSave={draft ? t.save : undefined}
            saveText="Save to panel"
            saveIcon="CloudArrowUp"
            className="h-[90vh] md:h-[88vh] max-h-[92vh] overflow-hidden"
            extraButtons={draft ? (
                <>
                    <Button variant="secondary" icon="Copy" onClick={t.copyBody}>Copy</Button>
                    <Button variant="secondary" icon="FileArrowDown" onClick={t.download}>Download</Button>
                    <Button variant="secondary" icon="CardsThree" onClick={t.duplicate}>Duplicate</Button>
                    {t.confirmDelete ? (
                        <Button variant="danger" icon="Warning" onClick={t.remove}>Confirm delete</Button>
                    ) : (
                        <Button variant="ghost" icon="Trash" onClick={() => t.setConfirmDelete(true)}>Delete</Button>
                    )}
                </>
            ) : null}
        >
            <div className="flex flex-col md:flex-row flex-1 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {/* ─── List ─────────────────────────────────────────── */}
                {/* One pane at a time on a phone — see SnippetsModal. */}
                <div className={`w-full md:w-72 bg-slate-950 border-r border-slate-800 flex-col min-h-0 md:shrink-0 ${draft ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/50 shrink-0">
                        <div className="relative">
                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500"
                                placeholder="Search templates…"
                                value={t.search}
                                onChange={e => t.setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={t.typeFilter}
                            onChange={v => t.setTypeFilter(v as any)}
                            options={[
                                { value: 'all', label: 'All types' },
                                ...TEMPLATE_TYPES.map(type => ({ value: type, label: type })),
                            ]}
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            icon="ArrowsClockwise"
                            className="w-full text-[10px]"
                            loading={t.loading}
                            disabled={!t.connected}
                            onClick={t.refresh}
                        >
                            Refresh
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {!t.connected && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 mb-2">
                                Not connected to Remnawave — connect from the header to load templates.
                            </div>
                        )}
                        {t.items.map((item: any) => (
                            <button
                                key={item.uuid}
                                onClick={() => t.open(item.uuid)}
                                className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all mb-1 ${
                                    draft?.uuid === item.uuid
                                        ? 'bg-indigo-600/20 border-indigo-500/60'
                                        : 'bg-slate-900 border-transparent hover:border-slate-700'
                                }`}
                            >
                                <Icon
                                    name={isJsonTemplate(item.templateType) ? 'BracketsCurly' : 'FileText'}
                                    weight="bold"
                                    className={`mt-0.5 shrink-0 ${isJsonTemplate(item.templateType) ? 'text-indigo-400' : 'text-sky-400'}`}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-slate-200 truncate">{item.name}</span>
                                    <span className="block text-[10px] text-slate-500 font-mono truncate">{item.templateType}</span>
                                </span>
                            </button>
                        ))}
                        {t.items.length === 0 && t.connected && (
                            <div className="text-center text-slate-600 py-8 italic text-[11px] px-3">
                                No templates match.
                            </div>
                        )}
                    </div>

                    {/* Create */}
                    <div className="p-3 border-t border-slate-800 bg-slate-900/50 shrink-0 space-y-2">
                        <span className="label-xs">New template</span>
                        <Input
                            value={t.newName}
                            onChange={(e: any) => t.setNewName(e.target.value)}
                            placeholder="Name"
                        />
                        <Select
                            value={t.newType}
                            onChange={v => t.setNewType(v as any)}
                            options={TEMPLATE_TYPES.map(type => ({ value: type, label: type }))}
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            icon="Plus"
                            className="w-full text-[10px]"
                            disabled={!t.connected}
                            onClick={t.create}
                        >
                            Create empty template
                        </Button>
                    </div>
                </div>

                {/* ─── Editor ───────────────────────────────────────── */}
                <div className={`flex-1 flex-col min-h-0 min-w-0 bg-slate-900/50 ${draft ? 'flex' : 'hidden md:flex'}`}>
                    {!draft ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="FileText" className="text-6xl mb-4 opacity-10" />
                            <p className="text-sm">Pick a template, or create one</p>
                            <p className="text-[11px] text-slate-700 mt-2 max-w-sm">
                                A subscription template is what the panel renders for a subscriber. Hosts
                                point at one; the Local Balancer builder writes a particular shape of it,
                                and this screen edits any of them as text.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 flex flex-col p-4 md:p-5 gap-3">
                            <Button
                                variant="secondary"
                                icon="ArrowLeft"
                                className="md:hidden w-full"
                                onClick={t.closeDraft}
                            >
                                Back to the list
                            </Button>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <Badge variant={TYPE_VARIANT[draft.templateType] || 'default'} size="sm">
                                    {draft.templateType}
                                </Badge>
                                {t.isDirty && <Badge variant="warning" size="sm" icon="PencilSimple">Unsaved changes</Badge>}
                                {t.parseError && <Badge variant="danger" size="sm" icon="Warning">Invalid JSON</Badge>}
                                {t.looksLikeBalancer && onOpenInBuilder && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="Scales"
                                        className="text-[10px] ml-auto"
                                        onClick={() => onOpenInBuilder(draft.uuid)}
                                        title="Open this template in the Local Balancer builder, where its settings become form fields"
                                    >
                                        Edit in Local Balancer
                                    </Button>
                                )}
                            </div>

                            <Input
                                label="Name"
                                value={draft.name}
                                onChange={(e: any) => t.setName(e.target.value)}
                                hint="Letters, digits, spaces, _ and -"
                            />

                            <div className="flex-1 min-h-[200px] flex flex-col">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="label-xs">
                                        {isJsonTemplate(draft.templateType) ? 'Template JSON' : 'Template YAML'}
                                    </span>
                                    {t.parseError && (
                                        <span className="text-[10px] text-rose-400 truncate max-w-[60%]">{t.parseError}</span>
                                    )}
                                </div>
                                <div className={`flex-1 relative rounded-lg overflow-hidden border bg-[#282c34] ${
                                    t.parseError ? 'border-rose-500/50' : 'border-slate-700'
                                }`}>
                                    <div className="absolute inset-0">
                                        <JsonEditor
                                            key={draft.uuid}
                                            value={draft.text}
                                            onChange={t.setText}
                                            schemaMode="full"
                                            mode={isJsonTemplate(draft.templateType) ? 'json' : 'plaintext'}
                                        />
                                    </div>
                                    {t.loadingBody && (
                                        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-xs text-slate-300">
                                            Loading…
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                    {isJsonTemplate(draft.templateType)
                                        ? 'Saving replaces the body for every host that points at this template.'
                                        : 'Stored base64-encoded in the panel; it is decoded here and re-encoded on save.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
