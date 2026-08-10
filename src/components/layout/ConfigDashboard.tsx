import React from "react";
import { Icon } from "../ui";
import { Button } from "../ui";
import { JsonField } from "../ui";
import { toast } from "sonner";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { XrayConfig } from "../../core/types";
import { useConfigStore } from "../../store/configStore";
import { Select } from "../ui/Select";
import { CommitModal } from "../git/CommitModal";

// Re-usable column Card for the dashboard
interface DashCardProps {
  title: string;
  icon: string;
  color: string;
  actions: React.ReactNode;
  subHeader?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const DashCard = ({
  title,
  icon,
  color,
  children,
  actions,
  subHeader,
  className = "",
}: DashCardProps) => (
  <div
    className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}
  >
    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center p-3 sm:p-4 border-b border-slate-700/50 bg-slate-800/50 shrink-0 min-h-16 gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-2 rounded-xl ${color} text-white shadow-lg ring-1 ring-white/10 shrink-0`}>
          <Icon name={icon} className="text-lg sm:text-xl" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {actions}
      </div>
    </div>
    {subHeader}
    <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-900/30 min-h-0">
      {children}
    </div>
  </div>
);

const SortableOutboundItem = ({
  ob,
  index,
  filteredIndex,
  isSelected,
  isAnySelected,
  showCheckboxes,
  onEdit,
  onDelete,
  onMove,
  onItemClick,
  totalCount,
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
      <div className="flex items-center gap-2.5 shrink-0 py-2 px-3">
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

        <div className="text-xs font-black text-slate-600/60 italic tabular-nums w-5 text-center select-none">
          {index}
        </div>
      </div>

      <div className="w-px h-8 bg-slate-800/80 self-center shrink-0" />

      <div className="min-w-0 flex-1 py-2 pl-3 flex flex-col justify-center">
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
          title="Edit"
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
          title="Delete"
          className="h-8 w-8 p-0 text-slate-500 hover:!text-rose-500 hover:bg-transparent transition-all duration-300"
        />
      </div>
    </div>
  );
};

interface ConfigDashboardProps {
  config: XrayConfig;
  rawMode: boolean;
  setRawMode: (v: boolean) => void;
  setConfig: (cfg: XrayConfig | null) => void;
  onEditInbound: (data: any, index: number | null) => void;
  onDeleteInbound: (index: number) => void;
  onOpenInboundJson: () => void;
  onAddInbound: () => void;
  onEditRouting: () => void;
  onOpenRoutingJson: () => void;
  onEditOutbound: (data: any, index: number | null) => void;
  onDeleteOutbound: (index: number) => void;
  onDeleteOutbounds?: (indices: number[]) => void;
  onMoveOutbound: (fromIndex: number, toIndex: number) => void;
  onOpenOutboundJson: () => void;
  onAddOutbound: () => void;
  onBatchImport: () => void;
  onOpenWarpModal: () => void;
  onEditDns: () => void;
  onOpenDnsJson: () => void;
  filteredOutbounds: any[];
  obSearch: string;
  setObSearch: (v: string) => void;
  modulesVisible: boolean;
  setModulesVisible: (v: boolean) => void;
  onOpenSettings: () => void;
  onOpenReverse: () => void;
  onOpenTopology: () => void;
  onOpenGeoViewer: () => void;
  onOpenConfigInspector: () => void;
  onOpenHistory?: () => void;
  onOpenEditorSettings?: () => void;
}

export const ConfigDashboard = ({
  config,
  rawMode,
  setRawMode,
  setConfig,
  onEditInbound,
  onDeleteInbound,
  onOpenInboundJson,
  onAddInbound,
  onEditRouting,
  onOpenRoutingJson,
  onEditOutbound,
  onDeleteOutbound,
  onDeleteOutbounds,
  onMoveOutbound,
  onOpenOutboundJson,
  onAddOutbound,
  onBatchImport,
  onOpenWarpModal,
  onEditDns,
  onOpenDnsJson,
  filteredOutbounds,
  obSearch,
  setObSearch,
  modulesVisible,
  setModulesVisible,
  onOpenSettings,
  onOpenReverse,
  onOpenTopology,
  onOpenGeoViewer,
  onOpenConfigInspector,
  onOpenHistory,
  onOpenEditorSettings,
}: ConfigDashboardProps) => {
  const {
    profiles,
    activeProfileId,
    switchProfile,
    saveActiveProfile,
    revertToBaseline,
    baselineConfigJson,
    config: storeConfig,
    history
  } = useConfigStore();

  const histories = useConfigStore(state => state.histories);
  const remnawave = useConfigStore(state => state.remnawave);

  const isModified = React.useMemo(() => {
    if (!storeConfig) return false;
    const activeKey = remnawave.activeProfileUuid ? `rw:${remnawave.activeProfileUuid}` : activeProfileId;
    const currentHistory = histories[activeKey] || [];

    if (currentHistory.length > 0) {
      try {
        return JSON.stringify(storeConfig) !== JSON.stringify(currentHistory[0].config);
      } catch (e) {
        return false;
      }
    }

    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const baseline = baselineConfigJson || (activeProfile?.config ? JSON.stringify(activeProfile.config) : null);
    if (!baseline) return false;
    try {
      return JSON.stringify(storeConfig) !== baseline;
    } catch (e) {
      return false;
    }
  }, [baselineConfigJson, storeConfig, profiles, activeProfileId, histories, remnawave.activeProfileUuid]);

  const [commitModalOpen, setCommitModalOpen] = React.useState(false);
  const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set());
  const [lastClickedFilteredIdx, setLastClickedFilteredIdx] = React.useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSelectMode, setIsSelectMode] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const showCheckboxes = isSelectMode || selectedIndices.size > 0;

  React.useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  React.useEffect(() => {
    if (obSearch && !isSearchOpen) {
      setIsSearchOpen(true);
    }
  }, [obSearch]);

  const handleItemClick = (
    e: React.MouseEvent,
    filteredIdx: number,
    originalIdx: number,
    ob: any
  ) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(originalIdx)) {
          next.delete(originalIdx);
        } else {
          next.add(originalIdx);
        }
        return next;
      });
      setLastClickedFilteredIdx(filteredIdx);
      return;
    }

    if (e.shiftKey) {
      const start = lastClickedFilteredIdx !== null ? lastClickedFilteredIdx : 0;
      const end = filteredIdx;
      const min = Math.min(start, end);
      const max = Math.max(start, end);

      const next = new Set(selectedIndices);
      for (let i = min; i <= max; i++) {
        if (filteredOutbounds[i]) {
          next.add(filteredOutbounds[i].originalIndex);
        }
      }
      setSelectedIndices(next);
      setLastClickedFilteredIdx(filteredIdx);
      return;
    }

    if (isSelectMode || selectedIndices.size > 0) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(originalIdx)) {
          next.delete(originalIdx);
        } else {
          next.add(originalIdx);
        }
        return next;
      });
      setLastClickedFilteredIdx(filteredIdx);
      return;
    }

    // Default action when multi-select is OFF and no modifier keys pressed: open Edit modal
    onEditOutbound(ob, originalIdx);
  };

  const handleSelectAll = () => {
    const all = new Set(filteredOutbounds.map((item) => item.originalIndex));
    setSelectedIndices(all);
  };

  const handleClearSelection = () => {
    setSelectedIndices(new Set());
    setLastClickedFilteredIdx(null);
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    const indicesToDelete = Array.from(selectedIndices);
    const count = indicesToDelete.length;
    if (confirm(`Delete ${count} selected outbound${count > 1 ? "s" : ""}?`)) {
      if (onDeleteOutbounds) {
        onDeleteOutbounds(indicesToDelete);
      } else {
        const sorted = indicesToDelete.sort((a, b) => b - a);
        sorted.forEach((idx) => onDeleteOutbound(idx));
      }
      setSelectedIndices(new Set());
      setLastClickedFilteredIdx(null);
      toast.success(`Deleted ${count} outbound${count > 1 ? "s" : ""}`);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndices.size === 0) return;

      const activeEl = document.activeElement;
      const isEditingText =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (isEditingText) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndices, filteredOutbounds, onDeleteOutbounds]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = parseInt(active.id.replace("ob-", ""));
    const newIdx = parseInt(over.id.replace("ob-", ""));

    onMoveOutbound(oldIdx, newIdx);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-xl shadow-lg gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h2 className="font-bold text-slate-300 flex items-center gap-2 text-sm md:text-base">
              <Icon name="SlidersHorizontal" /> Core Modules
            </h2>
            <button
              onClick={() => setModulesVisible(!modulesVisible)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Icon
                name={modulesVisible ? "CaretUp" : "CaretDown"}
                weight="bold"
              />
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-800" />

          <div
            className={`${modulesVisible ? "flex" : "hidden md:flex"} flex-wrap gap-2 w-full md:w-auto animate-in fade-in slide-in-from-top-1 duration-200`}
          >
            <Button
              className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2"
              variant="secondary"
              onClick={onOpenSettings}
              icon="Gear"
            >
              Core Settings
            </Button>
            <Button
              className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2"
              variant="secondary"
              onClick={onOpenReverse}
              icon="ArrowsLeftRight"
            >
              Reverse Proxy
            </Button>
            <Button
              className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2"
              variant="secondary"
              onClick={onOpenTopology}
              icon="GitMerge"
            >
              Topology
            </Button>
            <Button
              className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2"
              variant="secondary"
              onClick={onOpenGeoViewer}
              icon="GlobeHemisphereWest"
            >
              Geo Viewer
            </Button>
            <Button
              className="flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
              variant="secondary"
              onClick={onOpenConfigInspector}
              icon="FileSearch"
            >
              Config Inspector
            </Button>
          </div>
        </div>

        <div
          className={`${modulesVisible ? "flex" : "hidden md:flex"} flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-slate-800 md:border-transparent animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {/* Modified Status Badge */}
          {isModified ? (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in">
              <span className="text-[10px] md:text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                Uncommitted
              </span>
              <div className="flex items-center rounded-lg bg-emerald-950/60 border border-emerald-500/50 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    if (e.shiftKey) {
                      setCommitModalOpen(true);
                      return;
                    }
                    const inbounds = storeConfig?.inbounds?.length || 0;
                    const outbounds = storeConfig?.outbounds?.length || 0;
                    const rules = storeConfig?.routing?.rules?.length || 0;
                    const msg = `Save (${inbounds} inbounds, ${outbounds} outbounds, ${rules} rules)`;
                    const snapshot = useConfigStore.getState().recordSnapshot(msg);
                    saveActiveProfile();
                    if (snapshot) {
                      toast.success(`✓ Committed: ${snapshot.id.substring(0, 7)}`);
                    } else {
                      toast.info(`Already at HEAD (no changes to commit)`);
                    }
                  }}
                  className="px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors flex items-center gap-1 active:scale-95"
                  title="Instant Commit (Ctrl+S). Shift+click for custom message"
                >
                  <Icon name="GitCommit" className="text-xs text-emerald-400" />
                  Commit
                </button>
                <button
                  type="button"
                  onClick={() => setCommitModalOpen(true)}
                  className="px-1.5 py-1.5 md:py-2 text-[10px] md:text-xs text-emerald-400 hover:text-white hover:bg-emerald-900 border-l border-emerald-500/40 transition-colors"
                  title="Commit with custom message..."
                >
                  <Icon name="PencilSimple" className="text-[10px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={revertToBaseline}
                className="px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all active:scale-95"
                title="Revert working tree to HEAD (git reset --hard)"
              >
                Reset
              </button>
            </div>
          ) : (
            <span className="text-[10px] md:text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              Clean (HEAD)
            </span>
          )}

          {/* History Timeline / Git Log */}
          {onOpenHistory && (
            <Button
              className="text-[10px] md:text-xs py-1.5 md:py-2 px-2.5 border-indigo-500/40 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60"
              variant="secondary"
              onClick={onOpenHistory}
              icon="GitBranch"
            >
              Git Log ({history.length})
            </Button>
          )}

          {commitModalOpen && (
            <CommitModal onClose={() => setCommitModalOpen(false)} />
          )}

          <Button
            variant="secondary"
            onClick={() => setRawMode(!rawMode)}
            icon={rawMode ? "Layout" : "Code"}
            className={`flex-1 md:flex-none text-[10px] md:text-xs py-1.5 md:py-2 ${rawMode ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : ""}`}
          >
            {rawMode ? "UI Mode" : "JSON Mode"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {rawMode ? (
        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 shadow-2xl flex flex-col">
          <JsonField
            label="Full Configuration (Auto-saved)"
            value={config}
            onChange={(newConfig: any) => {
              if (newConfig) setConfig(newConfig);
            }}
            className="flex-1 relative min-h-0"
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scroll pb-6">
          <div className="flex flex-col xl:grid xl:grid-cols-3 gap-3 xl:flex-1 xl:min-h-0">
            {/* Inbounds */}
            <DashCard
              title={`Inbounds (${config.inbounds?.length || 0})`}
              icon="ArrowCircleDown"
              color="bg-emerald-600"
              className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
              actions={
                <div className="flex items-center bg-slate-950/50 p-1 rounded-lg border border-slate-700/50 gap-1 h-11">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenInboundJson}
                    icon="Code"
                    iconClassName="text-sm"
                    title="View JSON"
                    className="h-9 w-9 p-0"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddInbound}
                    icon="Plus"
                    iconClassName="text-sm"
                    title="Add Inbound"
                    className="h-9 w-9 p-0"
                  />
                </div>
              }
            >
              {(config.inbounds || []).map((ib: any, i: number) => (
                <div
                  key={i}
                  className="card-item group flex justify-between items-stretch gap-0"
                >
                  <div className="flex items-center gap-3 shrink-0 py-2 px-3">
                    <div className="text-slate-700 py-1">
                      <Icon name="Hash" weight="bold" className="text-lg" />
                    </div>
                    <div className="text-xl font-black text-slate-600/40 italic tabular-nums w-6 text-center select-none">
                      {i}
                    </div>
                  </div>

                  <div className="w-px h-8 bg-slate-800/80 self-center shrink-0" />

                  <div className="min-w-0 flex-1 py-2 pl-3 flex flex-col justify-center">
                    <div className="font-bold text-emerald-400 text-sm flex items-center gap-2 truncate">
                      <Icon name="ArrowCircleDown" weight="bold" className="text-[10px] opacity-40" />
                      {ib.tag || "no-tag"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate opacity-80">
                      {ib.protocol} <span className="mx-1 text-slate-700">•</span> {ib.port}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 ease-in-out self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditInbound(ib, i)}
                      icon="PencilSimple"
                      iconClassName="text-sm"
                      title="Edit"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-transparent transition-all duration-300"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteInbound(i)}
                      icon="Trash"
                      iconClassName="text-sm"
                      title="Delete"
                      className="h-8 w-8 p-0 text-slate-500 hover:!text-rose-500 hover:bg-transparent transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </DashCard>

            {/* Routing */}
            <DashCard
              title="Routing"
              icon="ArrowsSplit"
              color="bg-purple-600"
              className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
              actions={
                <div className="flex items-center bg-slate-950/50 p-1 rounded-lg border border-slate-700/50 gap-1 h-11">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenRoutingJson}
                    icon="Code"
                    iconClassName="text-sm"
                    title="View JSON"
                    className="h-9 w-9 p-0"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditRouting}
                    icon="PencilSimple"
                    iconClassName="text-sm"
                    title="Edit Routing"
                    className="h-9 w-9 p-0"
                  />
                </div>
              }
            >
              <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20 flex justify-between px-4 shrink-0">
                <span className="opacity-70">Strategy:</span>
                <span className="font-bold text-white">
                  {config.routing?.domainStrategy || "AsIs"}
                </span>
              </div>
              <div className="space-y-2">
                {(config.routing?.rules || [])
                  .slice(0, 20)
                  .map((rule: any, i: number) => {
                    const hasName = !!rule.ruleTag;
                    const conditions: string[] = [];
                    if (rule.domain) conditions.push(`${rule.domain.length} dom`);
                    if (rule.ip) conditions.push(`${rule.ip.length} ip`);
                    if (rule.port) conditions.push("port");
                    if (rule.protocol) conditions.push("proto");
                    if (rule.inboundTag) conditions.push("inbound");
                    if (conditions.length === 0) conditions.push("match all");
                    
                    const isBalancer = !!rule.balancerTag;
                    const target = rule.outboundTag || rule.balancerTag || "null";
                    
                    return (
                      <div
                        key={i}
                        className="card-item group flex justify-between items-stretch gap-0"
                      >
                        <div className="flex items-center gap-3 shrink-0 py-2 px-3">
                          <div className="flex items-center justify-center w-5">
                             <div className={`w-2.5 h-2.5 rounded-full ring-4 ${isBalancer ? "bg-purple-500 ring-purple-500/10" : "bg-blue-500 ring-blue-500/10"}`} />
                          </div>
                          <div className="text-xl font-black text-slate-600/40 italic tabular-nums w-6 text-center select-none">
                            {i}
                          </div>
                        </div>

                        <div className="w-px h-8 bg-slate-800/80 self-center shrink-0" />

                        <div className="min-w-0 flex-1 py-2 pl-3 flex flex-col justify-center">
                          <div className="flex justify-between items-center pr-2 gap-2">
                            <span className={`text-sm font-bold truncate ${hasName ? "text-white" : "text-slate-400 font-mono"}`}>
                              {rule.ruleTag || conditions.join(", ")}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Icon name="ArrowRight" className="text-slate-700 text-[10px]" />
                              <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 max-w-[100px] truncate ${isBalancer ? "text-purple-400" : "text-blue-400"}`}>
                                {target}
                              </span>
                            </div>
                          </div>
                          {hasName && (
                            <div className="text-[10px] text-slate-500 font-mono truncate opacity-80 mt-0.5">
                              {conditions.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {(config.routing?.rules || []).length === 0 && (
                  <div className="text-center text-slate-600 py-8 italic text-xs">
                    No routing rules.
                    <br />
                    Traffic will follow the first outbound.
                  </div>
                )}
                {(config.routing?.rules || []).length > 20 && (
                  <div className="text-center text-xs text-slate-500 italic pt-2 border-t border-slate-800">
                    ... +{(config.routing?.rules || []).length - 20} more rules
                  </div>
                )}
              </div>
            </DashCard>

            {/* Outbounds */}
            <DashCard
              title={`Outbounds (${config.outbounds?.length || 0})`}
              icon="ArrowCircleUp"
              color="bg-blue-600"
              className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
              actions={
                <div className="flex gap-1 items-center shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    icon="MagnifyingGlass"
                    iconClassName="text-xs sm:text-sm"
                    title="Search Outbounds"
                    className={`h-8 w-8 sm:h-9 sm:w-9 p-0 transition-all ${
                      isSearchOpen || obSearch
                        ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSelectMode((prev) => {
                        const next = !prev;
                        if (!next) {
                          setSelectedIndices(new Set());
                          setLastClickedFilteredIdx(null);
                        }
                        return next;
                      });
                    }}
                    icon="ListChecks"
                    iconClassName="text-xs sm:text-sm"
                    title="Toggle Multi-select Mode"
                    className={`h-8 w-8 sm:h-9 sm:w-9 p-0 transition-all ${
                      isSelectMode || selectedIndices.size > 0
                        ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  />
                  <div className="flex items-center bg-slate-950/50 p-0.5 sm:p-1 rounded-xl border border-slate-700/50 gap-0.5 sm:gap-1 h-8 sm:h-9">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onOpenWarpModal}
                      icon="Lightning"
                      iconClassName="text-xs"
                      title="Generate WARP Outbound"
                      className="h-7 w-7 p-0 text-amber-500 hover:text-amber-400"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onBatchImport}
                      icon="Stack"
                      iconClassName="text-xs"
                      title="Batch Import/Export"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onOpenOutboundJson}
                      icon="Code"
                      iconClassName="text-xs"
                      title="View JSON"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onAddOutbound}
                      icon="Plus"
                      iconClassName="text-xs"
                      title="Add New Outbound"
                      className="h-7 w-7 p-0 text-indigo-400 hover:text-white font-bold"
                    />
                  </div>
                </div>
              }
              subHeader={
                <div
                  className={`transition-all duration-300 ease-in-out border-b border-slate-700/50 bg-slate-900/90 overflow-hidden ${
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
                      className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-9 pr-24 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                      placeholder="Filter IP, Tag, Protocol..."
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
                          title="Clear search"
                        >
                          <Icon name="X" className="text-xs" />
                        </button>
                      )}
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
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteSelected}
                      icon="Trash"
                      className="text-xs py-1 px-2.5 font-bold shadow-md"
                    >
                      Delete ({selectedIndices.size})
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
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
                          index={item.originalIndex}
                          filteredIndex={filteredIdx}
                          isSelected={selectedIndices.has(item.originalIndex)}
                          isAnySelected={selectedIndices.size > 0}
                          showCheckboxes={showCheckboxes}
                          totalCount={config.outbounds?.length || 0}
                          onEdit={onEditOutbound}
                          onDelete={onDeleteOutbound}
                          onMove={onMoveOutbound}
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
                          No outbounds match your search
                        </p>
                      </div>
                    )}
                  </SortableContext>
                </DndContext>
              </div>
            </DashCard>
          </div>

          {/* DNS */}
          <DashCard
            title="DNS"
            icon="Globe"
            color="bg-indigo-600"
            className="shrink-0 w-full"
            actions={
              <div className="flex items-center bg-slate-950/50 p-1 rounded-lg border border-slate-700/50 gap-1 h-11">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenDnsJson}
                  icon="Code"
                  iconClassName="text-sm"
                  title="View JSON"
                  className="h-9 w-9 p-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditDns}
                  icon="PencilSimple"
                  iconClassName="text-sm"
                  title="Edit DNS"
                  className="h-9 w-9 p-0"
                />
              </div>
            }
          >
            {config.dns ? (
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                  <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                    <span className="text-slate-500 block text-[10px] uppercase">
                      Servers
                    </span>
                    <span className="text-white font-bold font-mono text-lg">
                      {config.dns.servers?.length || 0}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                    <span className="text-slate-500 block text-[10px] uppercase">
                      Hosts
                    </span>
                    <span className="text-white font-bold font-mono text-lg">
                      {Object.keys(config.dns.hosts || {}).length}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 md:border-l border-slate-800 md:pl-4 flex flex-col gap-1 min-w-[200px]">
                  <div className="flex justify-between">
                    <span>Strategy:</span>
                    <span className="text-indigo-300 font-bold">
                      {config.dns.queryStrategy || "UseIP"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client IP:</span>
                    <span className="font-mono text-slate-500">
                      {config.dns.clientIp || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-xs">
                DNS not configured. Click Edit to initialize defaults.
              </div>
            )}
          </DashCard>
        </div>
      )}
    </div>
  );
};
