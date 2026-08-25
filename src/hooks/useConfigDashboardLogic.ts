/**
 * Store access + derived state + handlers for ConfigDashboard.tsx.
 *
 * ConfigDashboard is a composition of dashboard sub-sections (Inbounds /
 * Routing / Outbounds / DNS cards + toolbar), not a path-based field editor,
 * so it doesn't fit the useField/useArrayField model (see useField.ts). It
 * fits the same shape as useRuleEditor.ts instead: pull the store reads,
 * the dirty/"modified" diff, and every handler that does real branching
 * logic out of the component, so the component only ever consumes plain
 * values and callbacks and never reaches into useConfigStore itself.
 *
 * Split into two hooks along the two concerns the component actually has:
 *  - useConfigDashboardGit: store-backed profile/history state, the
 *    isModified dirty-diff, and the commit/revert handlers (previously an
 *    inline `useConfigStore.getState().recordSnapshot(...)` call sitting
 *    inside an onClick deep in the render tree).
 *  - useOutboundSelection: the Outbounds card's local UI state — search,
 *    multi-select, drag-to-reorder, and the keyboard delete shortcut.
 */
import React from "react";
import { toast } from "sonner";
import { useConfigStore, type ConfigHistorySnapshot } from "../store/configStore";

export interface ConfigDashboardGit {
  isModified: boolean;
  history: ConfigHistorySnapshot[];
  rawConfigText: string | null;
  saveActiveProfile: () => void;
  revertToBaseline: () => void;
  recordSnapshot: (label?: string) => ConfigHistorySnapshot | null;
  commitModalOpen: boolean;
  setCommitModalOpen: (open: boolean) => void;
  handleCommit: (e: React.MouseEvent) => void;
}

export function useConfigDashboardGit(): ConfigDashboardGit {
  const {
    profiles,
    activeProfileId,
    saveActiveProfile,
    revertToBaseline,
    baselineConfigJson,
    config: storeConfig,
    history,
    rawConfigText,
    recordSnapshot,
  } = useConfigStore();

  const histories = useConfigStore((state) => state.histories);
  const remnawave = useConfigStore((state) => state.remnawave);

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

    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    const baseline = baselineConfigJson || (activeProfile?.config ? JSON.stringify(activeProfile.config) : null);
    if (!baseline) return false;
    try {
      return JSON.stringify(storeConfig) !== baseline;
    } catch (e) {
      return false;
    }
  }, [baselineConfigJson, storeConfig, profiles, activeProfileId, histories, remnawave.activeProfileUuid]);

  const [commitModalOpen, setCommitModalOpen] = React.useState(false);

  const handleCommit = (e: React.MouseEvent) => {
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
  };

  return {
    isModified,
    history,
    rawConfigText,
    saveActiveProfile,
    revertToBaseline,
    recordSnapshot,
    commitModalOpen,
    setCommitModalOpen,
    handleCommit,
  };
}

export interface OutboundSelection {
  selectedIndices: Set<number>;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showCheckboxes: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleItemClick: (e: React.MouseEvent, filteredIdx: number, originalIdx: number, ob: any) => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleDeleteSelected: () => void;
  handleDragEnd: (event: any) => void;
  toggleSelectMode: () => void;
}

export function useOutboundSelection(
  filteredOutbounds: any[],
  obSearch: string,
  onEditOutbound: (data: any, index: number | null) => void,
  onDeleteOutbound: (index: number) => void,
  onDeleteOutbounds: ((indices: number[]) => void) | undefined,
  onMoveOutbound: (fromIndex: number, toIndex: number) => void
): OutboundSelection {
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
    const all = new Set<number>(filteredOutbounds.map((item) => item.originalIndex));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndices, filteredOutbounds, onDeleteOutbounds]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = parseInt(active.id.replace("ob-", ""));
    const newIdx = parseInt(over.id.replace("ob-", ""));

    onMoveOutbound(oldIdx, newIdx);
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIndices(new Set());
        setLastClickedFilteredIdx(null);
      }
      return next;
    });
  };

  return {
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
  };
}
