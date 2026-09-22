import React from "react";
import { Button, Icon } from "../../ui";
import { DashCard } from "./DashCard";
import type { EndpointDirection } from "../../../core/generators/endpoint-factory";
import { t } from "../../../i18n";

export const InboundsCard = ({
config,
    onEditInbound,
    onDeleteInbound,
    onOpenInboundJson,
    onAddInbound,
    setBatch,
}: {
    config: any;
    onEditInbound: (data: any, index: number | null) => void;
    onDeleteInbound: (index: number) => void;
    onOpenInboundJson: () => void;
    onAddInbound: () => void;
    setBatch: (b: { direction: EndpointDirection; selection: number[] } | null) => void;
}) => {
    return (
    <DashCard
      title={`Inbounds (${config.inbounds?.length || 0})`}
      icon="ArrowCircleDown"
      color="bg-emerald-600"
      className="md:h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink"
      actions={
        <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-700/50 gap-1 h-11">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenInboundJson}
            icon="Code"
            iconClassName="text-sm"
            title={t("View JSON")}
            className="h-9 w-9 p-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBatch({ direction: 'inbound', selection: [] })}
            icon="Stack"
            iconClassName="text-sm"
            title={t("Batch edit inbounds")}
            className="h-9 w-9 p-0"
            disabled={(config.inbounds?.length || 0) === 0}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddInbound}
            icon="Plus"
            iconClassName="text-sm"
            title={t("Add Inbound")}
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
              title={t("Edit")}
              className="h-8 w-8 p-0 text-slate-500 hover:text-white hover:bg-transparent transition-all duration-300"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteInbound(i)}
              icon="Trash"
              iconClassName="text-sm"
              title={t("Delete")}
              className="h-8 w-8 p-0 text-slate-500 hover:!text-rose-500 hover:bg-transparent transition-all duration-300"
            />
          </div>
        </div>
      ))}
    </DashCard>
    );
};
