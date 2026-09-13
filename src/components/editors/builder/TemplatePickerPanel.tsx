import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import type { useTemplatesLibrary } from '../../../hooks/useTemplatesLibrary';

/**
 * Template list for the builder's panel-template mode.
 *
 * In that mode the node list on the left is meaningless — the panel injects
 * hosts when it renders the template — so this takes its place and answers the
 * question that actually applies there: which template am I editing.
 */
export const TemplatePickerPanel = ({
    tpl,
    selectedUuid,
    onSelect,
    onNew,
}: {
    tpl: ReturnType<typeof useTemplatesLibrary>;
    selectedUuid: string;
    onSelect: (uuid: string) => void;
    onNew: () => void;
}) => (
    <>
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 shrink-0">
            <span className="label-xs">Panel templates</span>
            <div className="relative">
                <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                <input
                    className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500"
                    placeholder="Search templates…"
                    value={tpl.search}
                    onChange={e => tpl.setSearch(e.target.value)}
                />
            </div>
            <div className="flex gap-1.5">
                <Button variant="secondary" size="sm" icon="Plus" className="flex-1 text-[10px]" onClick={onNew}>
                    New template
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="ArrowsClockwise"
                    className="flex-1 text-[10px]"
                    loading={tpl.loading}
                    disabled={!tpl.connected}
                    onClick={tpl.refresh}
                >
                    Refresh
                </Button>
            </div>
            {!tpl.connected && (
                <p className="text-[10px] text-amber-300/80">
                    Not connected to Remnawave — connect in the header to load or save templates.
                </p>
            )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
            {tpl.items.length === 0 ? (
                <div className="text-center text-slate-600 italic text-[11px] py-8 px-3">
                    {tpl.connected
                        ? 'No templates yet — build one on the right and save it, or press New template.'
                        : 'Connect to the panel to see its templates.'}
                </div>
            ) : (
                tpl.items.map((item: any) => (
                    <button
                        key={item.uuid}
                        onClick={() => onSelect(item.uuid)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all mb-1 ${
                            selectedUuid === item.uuid
                                ? 'bg-indigo-600/20 border-indigo-500/60'
                                : 'bg-slate-900 border-transparent hover:border-slate-700'
                        }`}
                    >
                        <Icon
                            name={item.templateType === 'XRAY_JSON' ? 'BracketsCurly' : 'FileText'}
                            weight="bold"
                            className={`mt-0.5 shrink-0 ${item.templateType === 'XRAY_JSON' ? 'text-indigo-400' : 'text-sky-400'}`}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block font-bold text-slate-200 truncate">{item.name}</span>
                            <span className="block text-[10px] text-slate-500 font-mono truncate">{item.templateType}</span>
                        </span>
                    </button>
                ))
            )}
        </div>

        {tpl.draft && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 shrink-0">
                <Input
                    label="Template name"
                    value={tpl.draft.name}
                    onChange={(e: any) => tpl.setName(e.target.value)}
                />
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="primary" size="sm">{tpl.draft.templateType}</Badge>
                    {tpl.isDirty && <Badge variant="warning" size="sm">Unsaved JSON edits</Badge>}
                </div>
                <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm" icon="CardsThree" className="flex-1 text-[10px]" onClick={tpl.duplicate}>
                        Duplicate
                    </Button>
                    {tpl.confirmDelete ? (
                        <Button variant="danger" size="sm" icon="Warning" className="flex-1 text-[10px]" onClick={tpl.remove}>
                            Confirm delete
                        </Button>
                    ) : (
                        <Button variant="ghost" size="sm" icon="Trash" className="flex-1 text-[10px]" onClick={() => tpl.setConfirmDelete(true)}>
                            Delete
                        </Button>
                    )}
                </div>
            </div>
        )}
    </>
);
