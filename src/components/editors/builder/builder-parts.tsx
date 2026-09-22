import React from "react";
import { Icon } from "../../ui";
import { t } from "../../../i18n";

/** The small pieces both panes of the builder draw with. */

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
        <span className="label-xs">{title}</span>
        {children}
    </div>
);

export const NodeRow = ({ node, onToggle, onRename, onRemove }: any) => (
    <div className={`p-2 rounded-lg border text-xs flex items-start gap-2 mb-1 transition-all ${
        node.include ? 'bg-slate-900 border-slate-700' : 'bg-slate-950 border-transparent opacity-50'
    }`}>
        <button
            onClick={onToggle}
            className={`mt-0.5 shrink-0 p-2 -m-1 ${node.include ? 'text-emerald-400' : 'text-slate-600'}`}
            title={node.include ? t("Exclude from the build") : t("Include in the build")}
        >
            <Icon name={node.include ? 'CheckSquare' : 'Square'} weight={node.include ? 'fill' : 'regular'} className="text-base" />
        </button>
        <div className="min-w-0 flex-1">
            <input
                value={node.label}
                onChange={e => onRename(e.target.value)}
                className="w-full bg-transparent text-slate-200 font-bold outline-none border-b border-transparent focus:border-slate-600 truncate"
                title={t("Label — also the grouping key when splitting by location")}
            />
            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                {node.protocol}{node.address ? ` · ${node.address}` : ''}
            </div>
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-rose-400 p-2 shrink-0" title={t("Remove")}>
            <Icon name="Trash" className="text-base" />
        </button>
    </div>
);

/** Names `entryHostMissing` can report, worded as the fields above word them. */
export const entryFieldLabel = (field: string): string =>
    ({
        "shared tag": t("Shared tag for this location"),
        remark: t("Remark"),
        address: t("Address"),
        port: t("Port"),
        inbound: t("Inbound"),
        "saved template": t("Saved template"),
    })[field] ?? field;
