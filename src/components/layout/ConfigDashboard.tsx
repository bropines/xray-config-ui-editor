import React from "react";
import { Icon } from "../ui";
import { Button } from "../ui";
import { JsonField } from "../ui";
import type { XrayConfig } from "../../core/types";
import { CommitModal } from "../git/CommitModal";
import { collectSnippetRefs, type SnippetDefinition } from '../../core/snippets';
import { useConfigDashboardGit } from "../../hooks/useConfigDashboardLogic";
import { t } from '../../i18n';
import { BatchEditModal } from '../editors/batch/BatchEditModal';
import type { EndpointDirection } from '../../core/generators/endpoint-factory';
import { useConfigStore } from '../../store/configStore';
import { useBackToClose } from '../../hooks/useBackToClose';
import { OutboundsCard } from './dashboard/OutboundsCard';
import { RoutingCard } from './dashboard/RoutingCard';
import { InboundsCard } from './dashboard/InboundsCard';
import { DnsCard } from './dashboard/DnsCard';

interface ConfigDashboardProps {
  config: XrayConfig;
  rawMode: boolean;
  setRawMode: (v: boolean) => void;
  setConfig: (cfg: XrayConfig | null, rawText?: string | null) => void;
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
  onOpenSnippets?: () => void;
  onOpenBuilder?: () => void;
  onOpenTemplates?: () => void;
  onOpenHosts?: () => void;
  /** Panel snippets + local templates, for resolving references on the card. */
  snippetDefs?: SnippetDefinition[];
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
  onOpenSnippets,
  onOpenBuilder,
  onOpenTemplates,
  onOpenHosts,
  snippetDefs = [],
}: ConfigDashboardProps) => {
  // The modules strip is a sheet on a phone; Back should lower it rather than
  // leave the app.
  useBackToClose(modulesVisible, () => setModulesVisible(false));

  const {
    isModified,
    history,
    rawConfigText,
    saveActiveProfile,
    revertToBaseline,
    recordSnapshot,
    commitModalOpen,
    setCommitModalOpen,
    handleCommit,
  } = useConfigDashboardGit();

  // One change across many endpoints. The selection is carried in so the
  // outbounds card's own multi-select can hand over what is already picked.
  const [batch, setBatch] = React.useState<{ direction: EndpointDirection; selection: number[] } | null>(null);
  const applyBatchResult = React.useCallback((next: any[]) => {
    if (!batch) return;
    useConfigStore.getState().updateSection(
      batch.direction === 'inbound' ? 'inbounds' : 'outbounds',
      next,
    );
    setBatch(null);
  }, [batch]);

  // How many `{ "snippet": "NAME" }` references the open config carries, and
  // which of them we can resolve — shown on the Snippets button and used by
  // the Routing card to label each reference.
  const snippetDefsByName = React.useMemo(() => {
    const map = new Map<string, SnippetDefinition>();
    snippetDefs.forEach((def) => { if (def?.name) map.set(def.name, def); });
    return map;
  }, [snippetDefs]);

  // Counts rules, balancers and outbounds alike — a Remnawave profile
  // references a balancer snippet as readily as a rules one.
  const snippetRefCount = React.useMemo(
    () => collectSnippetRefs(config).length,
    [config]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Toolbar */}
      {/* `contents` below md: the strip itself is a sheet raised from the
          dock, so the card around it would only draw an empty box. The
          element has to stay in the tree — the sheet is its child. */}
      <div className="contents md:flex shrink-0 md:flex-row md:justify-between md:items-start md:bg-slate-900 md:border md:border-slate-800 md:p-4 md:rounded-xl md:shadow-lg md:gap-4">
        <div className="flex flex-col md:flex-row items-start gap-4 w-full md:w-auto">
          {/* On a phone this whole strip lives in a sheet raised from the
              dock, so the backdrop and its header render here and the same
              markup serves both. */}
          {modulesVisible && (
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
              onClick={() => setModulesVisible(false)}
            />
          )}
          <div
            className={`${
              modulesVisible
                ? 'fixed md:static inset-x-0 bottom-0 z-50 md:z-auto max-h-[80dvh] md:max-h-none overflow-y-auto custom-scroll rounded-t-3xl md:rounded-none border-t md:border-0 border-slate-700 bg-slate-900 md:bg-transparent p-4 md:p-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-0 flex animate-in slide-in-from-bottom-4 duration-200'
                : 'hidden md:flex'
            } flex-col md:flex-row md:items-start gap-3 md:gap-4 w-full md:w-auto`}
          >
            <div className="flex items-center justify-between md:hidden shrink-0">
              <h2 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                <Icon name="SlidersHorizontal" />
                {t("Modules")}
              </h2>
              <button
                onClick={() => setModulesVisible(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
                title={t("Close")}
              >
                <Icon name="X" weight="bold" />
              </button>
            </div>
            {/* Core: everything that edits the config open in this editor. */}
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <span className="label-xs flex items-center gap-1.5">
                <Icon name="SlidersHorizontal" className="text-xs" />
{t("Core")}
</span>
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                <Button
                  className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2"
                  variant="secondary"
                  onClick={onOpenSettings}
                  icon="Gear"
                >
                  {t("Core Settings")}
                  </Button>
                <Button
                  className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2"
                  variant="secondary"
                  onClick={onOpenReverse}
                  icon="ArrowsLeftRight"
                >
                  {t("Reverse Proxy")}
                  </Button>
                <Button
                  className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2"
                  variant="secondary"
                  onClick={onOpenTopology}
                  icon="GitMerge"
                >
                  {t("Topology")}
                  </Button>
                <Button
                  className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2"
                  variant="secondary"
                  onClick={onOpenGeoViewer}
                  icon="GlobeHemisphereWest"
                >
                  {t("Geo Viewer")}
                  </Button>
                <Button
                  className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
                  variant="secondary"
                  onClick={onOpenConfigInspector}
                  icon="FileMagnifyingGlass"
                >
                  {t("Config Inspector")}
                  </Button>
                {onOpenBuilder && (
                  <Button
                    className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    variant="secondary"
                    onClick={onOpenBuilder}
                    icon="Scales"
                    title={t("Build a client config with a local balancer from a set of nodes")}
                  >
                    {t("Local Balancer")}
                    </Button>
                )}
              </div>
            </div>

            {/* Remnawave: everything that reads or writes the panel. */}
            {(onOpenSnippets || onOpenHosts || onOpenTemplates) && (
              <>
                <div className="hidden md:block w-px self-stretch bg-slate-800" />
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <span className="label-xs flex items-center gap-1.5">
                    <Icon name="Cloud" className="text-xs" />
{t("Remnawave")}
</span>
                  <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                    {onOpenHosts && (
                      <Button
                        className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                        variant="secondary"
                        onClick={onOpenHosts}
                        icon="Broadcast"
                        title={t("Edit the hosts in your panel: address, transport, inbound and template")}
                      >
                        {t("Hosts")}
                        </Button>
                    )}
                    {onOpenTemplates && (
                      <Button
                        className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2 border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                        variant="secondary"
                        onClick={onOpenTemplates}
                        icon="FileText"
                        title={t("Subscription templates — opens the balancer builder in template mode, where they are edited as a form or as JSON")}
                      >
                        {t("Templates")}
                        </Button>
                    )}
                    {onOpenSnippets && (
                      <Button
                        className="w-full md:w-auto whitespace-nowrap text-[10px] md:text-xs py-2 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/10"
                        variant="secondary"
                        onClick={onOpenSnippets}
                        icon="BracketsCurly"
                      >
                        {t("Snippets")}{snippetRefCount > 0 ? ` (${snippetRefCount})` : ""}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={`${modulesVisible ? "flex" : "hidden md:flex"} flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-[22px] border-t border-slate-800 md:border-transparent animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {/* Modified Status Badge */}
          {isModified ? (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in">
              <span className="text-[10px] md:text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                {t("Uncommitted")}
                </span>
              <div className="flex items-center rounded-lg bg-emerald-950/60 border border-emerald-500/50 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={handleCommit}
                  className="px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors flex items-center gap-1 active:scale-95"
                  title={t("Instant Commit (Ctrl+S). Shift+click for custom message")}
                >
                  <Icon name="GitCommit" className="text-xs text-emerald-400" />
                  {t("Commit")}
                  </button>
                <button
                  type="button"
                  onClick={() => setCommitModalOpen(true)}
                  className="px-1.5 py-1.5 md:py-2 text-[10px] md:text-xs text-emerald-400 hover:text-white hover:bg-emerald-900 border-l border-emerald-500/40 transition-colors"
                  title={t("Commit with custom message...")}
                >
                  <Icon name="PencilSimple" className="text-[10px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={revertToBaseline}
                className="px-2.5 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all active:scale-95"
                title={t("Revert working tree to HEAD (git reset --hard)")}
              >
                {t("Reset")}
                </button>
            </div>
          ) : (
            <span className="text-[10px] md:text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {t("Clean (HEAD)")}
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
            {rawMode ? t("UI Mode") : t("JSON Mode")}
          </Button>
        </div>
      </div>

      {/* Content */}
      {rawMode ? (
        <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 shadow-2xl flex flex-col">
          <JsonField
            label={t("Full Configuration (Auto-saved)")}
            value={config}
            onChange={(newConfig: any, rawText?: string) => {
              if (newConfig) setConfig(newConfig, rawText);
            }}
            className="flex-1 relative min-h-0"
            rawConfigText={rawConfigText}
            onSaveShortcut={() => saveActiveProfile()}
            onCommitShortcut={() => recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scroll pb-24 md:pb-6">
          <div className="flex flex-col xl:grid xl:grid-cols-3 gap-3 xl:flex-1 xl:min-h-0">
            {/* Inbounds */}
            <InboundsCard
              config={config}
              onEditInbound={onEditInbound}
              onDeleteInbound={onDeleteInbound}
              onOpenInboundJson={onOpenInboundJson}
              onAddInbound={onAddInbound}
              setBatch={setBatch}
            />

            {/* Routing */}
            <RoutingCard
              config={config}
              snippetDefsByName={snippetDefsByName}
              onEditRouting={onEditRouting}
              onOpenRoutingJson={onOpenRoutingJson}
              onOpenSnippets={onOpenSnippets}
            />

            {/* Outbounds */}
            <OutboundsCard
              config={config}
              filteredOutbounds={filteredOutbounds}
              obSearch={obSearch}
              setObSearch={setObSearch}
              onEditOutbound={onEditOutbound}
              onDeleteOutbound={onDeleteOutbound}
              onDeleteOutbounds={onDeleteOutbounds}
              onMoveOutbound={onMoveOutbound}
              onOpenOutboundJson={onOpenOutboundJson}
              onAddOutbound={onAddOutbound}
              onBatchImport={onBatchImport}
              onOpenWarpModal={onOpenWarpModal}
              setBatch={setBatch}
            />
          </div>

          {/* DNS */}
          <DnsCard config={config} onEditDns={onEditDns} onOpenDnsJson={onOpenDnsJson} />
        </div>
      )}

      {batch && (
        <BatchEditModal
          direction={batch.direction}
          items={(batch.direction === 'inbound' ? config.inbounds : config.outbounds) || []}
          initialSelection={batch.selection}
          onApply={applyBatchResult}
          onClose={() => setBatch(null)}
        />
      )}
    </div>
  );
};
