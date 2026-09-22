import React from "react";
import { Button, Icon } from "../../ui";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OutboundRoutingBadge } from "../OutboundRoutingBadge";
import { getSnippetRefName } from "../../../core/snippets";
import { t } from "../../../i18n";

export const SortableOutboundItem = ({
  ob,
  routing,
  index,
  filteredIndex,
  isSelected,
  isAnySelected,
  showCheckboxes,
  onEdit,
  onDelete,
  onItemClick,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ob-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => onItemClick(e, filteredIndex, index, ob)}
      className={`card-item group flex justify-between items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? "ring-2 ring-blue-500 bg-blue-950/50 border-blue-500/60 shadow-lg shadow-blue-500/10"
          : isDragging
          ? "opacity-50 ring-2 ring-indigo-500 bg-indigo-950/20"
          : "hover:border-slate-600"
      }`}
    >
      <div className="flex items-center gap-2.5 shrink-0 py-2 px-2 sm:px-3">
        <div
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-slate-700 hover:text-slate-400 transition-colors duration-300 touch-none"
        >
          <Icon name="DotsSixVertical" weight="bold" className="text-xl" />
        </div>

        {showCheckboxes && (
          <div
            className={`flex items-center justify-center transition-all ${
              isSelected
                ? "text-blue-400"
                : isAnySelected
                ? "text-slate-600 group-hover:text-slate-400"
                : "text-slate-700 group-hover:text-slate-400 opacity-60 group-hover:opacity-100"
            }`}
          >
            <Icon
              name={isSelected ? "CheckSquare" : "Square"}
              weight={isSelected ? "fill" : "regular"}
              className="text-xl"
            />
          </div>
        )}

        {/* Decorative index: on a phone those 20px are the difference
            between a readable tag and six truncated characters. */}
        <div className="hidden sm:block text-xs font-black text-slate-600/60 italic tabular-nums w-5 text-center select-none">
          {index}
        </div>
      </div>

      <div className="w-px h-8 bg-slate-800/80 self-center shrink-0" />

      <div className="min-w-0 flex-1 py-2 pl-3 flex flex-col justify-center">
        {/* An outbound slot can also hold a Remnawave snippet reference, which
            has no tag or protocol of its own — label it as what it is instead
            of rendering "no-tag / no-address". See core/snippets. */}
        {getSnippetRefName(ob) ? (
          <>
            <div className="font-bold text-fuchsia-200 text-sm flex items-center gap-2 truncate">
              <Icon name="BracketsCurly" weight="bold" className="text-xs text-fuchsia-400" />
              {getSnippetRefName(ob)}
            </div>
            <div className="text-[10px] text-fuchsia-300/70 mt-0.5 font-mono truncate">
              {t("snippet — expanded by the panel")}
              </div>
          </>
        ) : (
          <>
            <div className="font-bold text-blue-400 text-sm flex items-center gap-2 truncate">
              <Icon name="PaperPlaneRight" weight="bold" className="text-xs opacity-40" />
              {ob.tag || "no-tag"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate opacity-80">
              {ob.protocol}
              {ob.protocol !== "freedom" && ob.protocol !== "blackhole" && (
                <>
                  <span className="mx-1 text-slate-700">•</span>
                  {ob.settings?.vnext?.[0]?.address ||
                    ob.settings?.servers?.[0]?.address ||
                    ob.settings?.address ||
                    "no-address"}
                </>
              )}
            </div>
            <OutboundRoutingBadge summary={routing} />
          </>
        )}
      </div>

      <div
        className="flex items-center gap-1 shrink-0 px-2 self-center md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={(e: any) => {
            e.stopPropagation();
            onEdit(ob, index);
          }}
          icon="PencilSimple"
          iconClassName="text-sm"
          title={t("Edit")}
          className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-transparent transition-all duration-300"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e: any) => {
            e.stopPropagation();
            onDelete(index);
          }}
          icon="Trash"
          iconClassName="text-sm"
          title={t("Delete")}
          className="h-8 w-8 p-0 text-slate-500 hover:!text-rose-500 hover:bg-transparent transition-all duration-300"
        />
      </div>
    </div>
  );
};
