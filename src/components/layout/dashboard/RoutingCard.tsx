import React from "react";
import { Button, Icon } from "../../ui";
import { DashCard } from "./DashCard";
import { getSnippetRefName, type SnippetDefinition } from "../../../core/snippets";
import { t, tn } from "../../../i18n";

export const RoutingCard = ({
config,
    snippetDefsByName,
    onEditRouting,
    onOpenRoutingJson,
    onOpenSnippets,
}: {
    config: any;
    snippetDefsByName: Map<string, SnippetDefinition>;
    onEditRouting: () => void;
    onOpenRoutingJson: () => void;
    onOpenSnippets?: () => void;
}) => {
    return (
    <DashCard
      title={t("Routing")}
      icon="ArrowsSplit"
      color="bg-purple-600"
      className="md:h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
      actions={
        <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-700/50 gap-1 h-11">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenRoutingJson}
            icon="Code"
            iconClassName="text-sm"
            title={t("View JSON")}
            className="h-9 w-9 p-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditRouting}
            icon="PencilSimple"
            iconClassName="text-sm"
            title={t("Edit Routing")}
            className="h-9 w-9 p-0"
          />
        </div>
      }
    >
      <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20 flex justify-between px-4 shrink-0">
        <span className="opacity-70">{t("Strategy:")}</span>
        <span className="font-bold text-white">
          {config.routing?.domainStrategy || "AsIs"}
        </span>
      </div>
      <div className="space-y-2 max-h-[60dvh] overflow-y-auto overscroll-contain custom-scroll md:max-h-none md:overflow-visible">
        {(config.routing?.rules || [])
          .map((rule: any, i: number) => {
            const snippetName = getSnippetRefName(rule);
            if (snippetName) {
              const def = snippetDefsByName.get(snippetName);
              return (
                <div
                  key={i}
                  onClick={onOpenSnippets}
                  className="card-item group flex justify-between items-stretch gap-0 border-fuchsia-500/25 bg-fuchsia-950/10 cursor-pointer"
                >
                  <div className="flex items-center gap-3 shrink-0 py-2 px-3">
                    <div className="flex items-center justify-center w-5">
                      <Icon name="BracketsCurly" weight="bold" className="text-fuchsia-400 text-sm" />
                    </div>
                    <div className="text-xl font-black text-slate-600/40 italic tabular-nums w-6 text-center select-none">
                      {i}
                    </div>
                  </div>

                  <div className="w-px h-8 bg-slate-800/80 self-center shrink-0" />

                  <div className="min-w-0 flex-1 py-2 pl-3 flex flex-col justify-center">
                    <div className="flex justify-between items-center pr-2 gap-2">
                      <span className="text-sm font-bold truncate text-fuchsia-100">{snippetName}</span>
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-fuchsia-500/30 text-fuchsia-300 shrink-0">
                        {t("snippet")}
                        </span>
                    </div>
                    <div className="text-[10px] font-mono truncate opacity-80 mt-0.5">
                      {def && Array.isArray(def.snippet)
                        ? <span className="text-slate-500">
                            {tn(def.snippet.length, "expands to {n} item", "expands to {n} items")}
                          </span>
                        : <span className="text-amber-400/80">{t("body not loaded")}</span>}
                    </div>
                  </div>
                </div>
              );
            }

            const hasName = !!rule.ruleTag;
            // Every matcher the rule actually carries. `network`,
            // `source` and `user` used to be left out, so the common
            // catch-all-by-network rule ({ network: "tcp,udp" } into a
            // balancer) was labelled "match all" — which reads as "no
            // conditions at all" and hid the one condition it had.
            const conditions: string[] = [];
            if (rule.domain) conditions.push(`${rule.domain.length} dom`);
            if (rule.ip) conditions.push(`${rule.ip.length} ip`);
            if (rule.port) conditions.push("port");
            if (rule.sourcePort) conditions.push("src port");
            if (rule.protocol) conditions.push("proto");
            if (rule.network) conditions.push(String(rule.network));
            if (rule.inboundTag) conditions.push("inbound");
            if (rule.source) conditions.push("src ip");
            if (rule.user) conditions.push("user");
            if (rule.attrs) conditions.push("attrs");
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
            {t("Traffic will follow the first outbound.")}
            </div>
        )}
      </div>
    </DashCard>
    );
};
