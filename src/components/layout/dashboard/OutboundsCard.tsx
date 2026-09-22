import React from "react";
import { Button, Icon } from "../../ui";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DashCard } from "./DashCard";
import { SortableOutboundItem } from "./SortableOutboundItem";
import { dndAccessibility } from "../../ui/dndAccessibility";
import { useOutboundSelection } from "../../../hooks/useConfigDashboardLogic";
import { summariseOutboundRouting } from "../../../core/routing/outbound-routing";
import type { EndpointDirection } from "../../../core/generators/endpoint-factory";
import { t, tn } from "../../../i18n";

export const OutboundsCard = ({
config,
    filteredOutbounds,
    obSearch,
    setObSearch,
    onEditOutbound,
    onDeleteOutbound,
    onDeleteOutbounds,
    onMoveOutbound,
    onOpenOutboundJson,
    onAddOutbound,
    onBatchImport,
    onOpenWarpModal,
    setBatch,
}: {
    config: any;
    filteredOutbounds: any[];
    obSearch: string;
    setObSearch: (v: string) => void;
    onEditOutbound: (data: any, index: number | null) => void;
    onDeleteOutbound: (index: number) => void;
    onDeleteOutbounds?: (indices: number[]) => void;
    onMoveOutbound: (fromIndex: number, toIndex: number) => void;
    onOpenOutboundJson: () => void;
    onAddOutbound: () => void;
    onBatchImport: () => void;
    onOpenWarpModal: () => void;
    setBatch: (b: { direction: EndpointDirection; selection: number[] } | null) => void;
}) => {
    // The selection, the search box and the drag ordering are this card's own
    // business — nothing outside it ever read them.
    const {
        selectedIndices,
        isSearchOpen,
        setIsSearchOpen,
        showCheckboxes,
        searchInputRef,
        handleItemClick,
        handleSelectAll,
        handleClearSelection,
        handleDeleteSelected,
        handleDragEnd,
        toggleSelectMode,
    } = useOutboundSelection(
        filteredOutbounds,
        obSearch,
        onEditOutbound,
        onDeleteOutbound,
        onDeleteOutbounds,
        onMoveOutbound,
    );

    // Which rules and balancers reach each outbound, and at which layer.
    // Computed once for the whole list rather than per row: every summary
    // walks all the rules, and a config with a hundred outbounds would walk
    // them a hundred times.
    const outboundRouting = React.useMemo(
        () => summariseOutboundRouting(config),
        [config],
    );

    return (
    <DashCard
      title={`Outbounds (${config.outbounds?.length || 0})`}
      icon="ArrowCircleUp"
      color="bg-blue-600"
      className="md:h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
      actions={
        <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-700/50 gap-1 h-11 shrink-0">
          {/* Desktop Only Buttons: WARP, Batch, JSON, Add + Divider */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenWarpModal}
              icon="Lightning"
              iconClassName="text-sm text-amber-400"
              title={t("Generate WARP Outbound")}
              className="h-9 w-9 p-0 text-amber-400 hover:bg-slate-800/60"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onBatchImport}
              icon="Stack"
              iconClassName="text-sm"
              title={t("Batch Import/Export")}
              className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800/60"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenOutboundJson}
              icon="Code"
              iconClassName="text-sm"
              title={t("Raw JSON Mode")}
              className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800/60"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddOutbound}
              icon="Plus"
              iconClassName="text-sm text-blue-400"
              title={t("Add Outbound")}
              className="h-9 w-9 p-0 text-blue-400 hover:bg-slate-800/60"
            />

            {/* Vertical Divider Line */}
            <div className="w-px h-5 bg-slate-700/50 mx-0.5" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            icon="MagnifyingGlass"
            iconClassName="text-sm"
            title={t("Search Outbounds")}
            className={`h-9 w-9 p-0 transition-all ${
              isSearchOpen || obSearch
                ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectMode}
            icon="ListChecks"
            iconClassName="text-sm"
            title={t("Toggle Multi-select Mode")}
            className={`h-9 w-9 p-0 transition-all ${
              showCheckboxes
                ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          />
        </div>
      }
      subHeader={
        <div className="flex flex-col border-b border-slate-700/50 bg-slate-900/60 shrink-0">
          {/* Mobile-Only Action Toolbar Row */}
          <div className="sm:hidden flex flex-wrap items-center justify-center p-2 px-3 border-b border-slate-800/60 gap-1.5 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenWarpModal}
              icon="Lightning"
              iconClassName="text-xs text-amber-400"
              className="flex-1 h-8 px-2.5 text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 font-bold rounded-xl leading-none transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)]"
              title={t("Generate WARP Outbound")}
            >
              {t("WARP")}
              </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onBatchImport}
              icon="Stack"
              iconClassName="text-xs text-sky-400"
              className="flex-1 h-8 px-2.5 text-xs text-sky-400 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 active:scale-95 font-bold rounded-xl leading-none transition-all shadow-[0_0_10px_rgba(56,189,248,0.1)]"
              title={t("Batch Import/Export")}
            >
              {t("Batch")}
              </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenOutboundJson}
              icon="Code"
              iconClassName="text-xs text-purple-400"
              className="flex-1 h-8 px-2.5 text-xs text-purple-400 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 font-bold rounded-xl leading-none transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)]"
              title={t("Raw JSON Mode")}
            >
              JSON
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddOutbound}
              icon="Plus"
              iconClassName="text-xs text-white"
              className="flex-1 h-8 px-3 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black rounded-xl leading-none transition-all shadow-md shadow-blue-500/20 border border-blue-400/30"
              title={t("Add New Outbound")}
            >
              {t("Add")}
              </Button>
          </div>

          {/* Search Input Bar */}
          <div
            className={`transition-all duration-300 ease-in-out border-b border-slate-700/50 bg-slate-950/80 overflow-hidden ${
              isSearchOpen || obSearch
                ? "max-h-16 opacity-100 p-2.5 px-4"
                : "max-h-0 opacity-0 p-0 border-b-0"
            }`}
          >
            <div className="relative flex items-center w-full gap-2">
              <Icon
                name="MagnifyingGlass"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
              <input
                ref={searchInputRef}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-24 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                placeholder={t("Filter IP, Tag, Protocol...")}
                value={obSearch}
                onChange={(e) => setObSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                  }
                }}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {obSearch && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {filteredOutbounds.length} / {config.outbounds?.length || 0}
                  </span>
                )}
                {obSearch && (
                  <button
                    onClick={() => setObSearch("")}
                    className="text-slate-400 hover:text-white p-0.5"
                    title={t("Clear search")}
                  >
                    <Icon name="X" className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      }
    >
      {selectedIndices.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between p-2 px-3 bg-blue-950/90 border border-blue-500/40 rounded-xl backdrop-blur-md shadow-lg mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-300">
              Selected: <span className="text-white font-mono">{selectedIndices.size}</span>
            </span>
            <span className="text-slate-600">•</span>
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-medium text-slate-300 hover:text-white underline decoration-slate-600 hover:decoration-white transition-colors"
            >
              Select All ({filteredOutbounds.length})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-xs text-slate-400 hover:text-white h-7 px-2"
            >
              {t("Cancel")}
              </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBatch({ direction: 'outbound', selection: [...selectedIndices] })}
              icon="Stack"
              className="text-xs py-1 px-2.5 font-bold"
            >
              {tn(selectedIndices.size, "Edit {n}", "Edit {n}")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteSelected}
              icon="Trash"
              className="text-xs py-1 px-2.5 font-bold shadow-md"
            >
              {tn(selectedIndices.size, "Delete {n}", "Delete {n}")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={dndAccessibility()}
        >
          <SortableContext
            items={filteredOutbounds.map((item) => `ob-${item.originalIndex}`)}
            strategy={verticalListSortingStrategy}
          >
            {filteredOutbounds.length > 0 ? (
              filteredOutbounds.map((item: any, filteredIdx: number) => (
                <SortableOutboundItem
                  key={item.originalIndex}
                  ob={item.ob}
                  routing={outboundRouting.get(item.ob?.tag)}
                  index={item.originalIndex}
                  filteredIndex={filteredIdx}
                  isSelected={selectedIndices.has(item.originalIndex)}
                  isAnySelected={selectedIndices.size > 0}
                  showCheckboxes={showCheckboxes}
                  onEdit={onEditOutbound}
                  onDelete={onDeleteOutbound}
                  onItemClick={handleItemClick}
                />
              ))
            ) : (
              <div className="text-center py-10 opacity-50">
                <Icon
                  name="MagnifyingGlass"
                  className="mx-auto text-3xl mb-2"
                />
                <p className="text-xs">
                  {t("No outbounds match your search")}
                  </p>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </DashCard>
    );
};
