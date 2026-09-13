import { JsonEditor } from '../../ui/JsonEditor';
import type { useTemplatesLibrary } from '../../../hooks/useTemplatesLibrary';

/**
 * Raw view of the template the builder is editing — the same JSON/UI pair the
 * rest of this app offers (routing rules, inbounds, outbounds all have it).
 *
 * The form and this view edit one object: switching here shows what the form
 * would save, and switching back parses this text into the form. Anything the
 * form cannot represent is reported rather than dropped, so hand-written
 * templates stay editable without being forced through the builder's model.
 */
export const TemplateJsonView = ({
    tpl,
    generatedJson,
    isExisting,
}: {
    tpl: ReturnType<typeof useTemplatesLibrary>;
    /** What the form would produce, shown when no saved template is open. */
    generatedJson: string;
    isExisting: boolean;
}) => {
    const text = isExisting && tpl.draft ? tpl.draft.text : generatedJson;

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-end mb-1.5 gap-2">
                <span className="label-xs">
                    {isExisting ? `Template JSON — ${tpl.draft?.name || ''}` : 'Template JSON (from the form)'}
                </span>
                {tpl.parseError && (
                    <span className="text-[10px] text-rose-400 truncate max-w-[55%]">{tpl.parseError}</span>
                )}
            </div>

            <div className={`flex-1 min-h-[240px] relative rounded-lg overflow-hidden border bg-[#282c34] ${
                tpl.parseError ? 'border-rose-500/50' : 'border-slate-700'
            }`}>
                <div className="absolute inset-0">
                    <JsonEditor
                        key={tpl.draft?.uuid || 'generated'}
                        value={text}
                        onChange={tpl.setText}
                        schemaMode="full"
                        readOnly={!isExisting}
                    />
                </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-1.5">
                {isExisting
                    ? 'Edits here are saved to the panel as-is. Switch back to Form to read them into the fields.'
                    : 'Read-only until the template exists: save it from the Form view first, then edit the JSON directly.'}
            </p>
        </div>
    );
};
