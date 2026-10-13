import React from 'react';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { generateXrayLink } from '../../utils/link-generator';
import { useOutboundEditor } from '../../hooks/useOutboundEditor';
import { EditorLayout } from '../ui/EditorLayout';

import { Icon } from '../ui/Icon';
import { getSnippetRefName } from '../../core/snippets';
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundWireguard } from './outbound/OutboundWireguard';
import { OutboundLoopback } from './outbound/OutboundLoopback';
import { OutboundFreedom } from './outbound/OutboundFreedom';
import { OutboundMasque } from './outbound/OutboundMasque';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';
import { outboundShape } from '../../core/xray/outbound-shape';
import { chainOf } from '../../core/xray/outbound-chain';
import { TransportSettings } from './shared/TransportSettings';
import { t, tn } from '../../i18n';

export const OutboundModal = ({ data, onSave, onClose, index }: any) => {
    const { config, addItem, rawConfigText } = useConfigStore(useShallow(state => ({ config: state.config, addItem: state.addItem, rawConfigText: state.rawConfigText })));
    const allInboundTags = (config?.inbounds || []).map((i: any) => i.tag).filter((tag: any) => tag);
    // Every outbound this one could go through: all of them but itself. By
    // position, not by tag — the tag is one of the fields being edited here.
    const otherOutboundTags: string[] = (config?.outbounds || [])
        .filter((_: any, at: number) => at !== index)
        .map((o: any) => o?.tag)
        .filter((tag: any): tag is string => typeof tag === 'string' && tag !== '');

    const {
        local,
        setLocal,
        rawText,
        updateField,
        handleProtocolChange,
        handleSave,
        rawMode,
        setRawMode,
        errors,
        getError,
        wgPeerErrors
    } = useOutboundEditor(data, onSave, index);

    const shape = outboundShape(local.protocol);
    // What the protocol is offered, or what the config already holds. The
    // second half is not optional: a value the form will not draw is still in
    // the JSON and still built by the core, so hiding it only hides the cause
    // when something goes wrong.
    const show = {
        sendThrough: shape.transport || local.sendThrough !== undefined,
        chain: shape.transport || chainOf(local) !== null,
        mux: shape.mux || local.mux !== undefined,
        strategy: shape.strategy || local.targetStrategy !== undefined,
    };
    const strayStream = !shape.transport && local.streamSettings !== undefined;

    const handleImport = (parsed: any) => {
        if (parsed.multiple && Array.isArray(parsed.outbounds)) {
            const [primary, ...others] = parsed.outbounds;
            setLocal(primary);
            others.forEach((outbound: any) => addItem('outbounds', outbound));
            toast.success(tn(parsed.outbounds.length, "Imported {n} outbound (chained)", "Imported {n} outbounds (chained)"));
        } else {
            setLocal(parsed);
            toast.success(t("Configuration imported successfully"));
        }
        setRawMode(false);
    };

    const handleCopyLink = () => {
        const link = generateXrayLink(local);
        if (!link) {
            toast.error(t("Error generating link"), { description: t("Protocol might not be supported.") });
            return;
        }
        navigator.clipboard.writeText(link).then(() => toast.success(t("Copied to clipboard!")));
    };

    const extraButtons = (
        <Button variant="success" className="text-xs py-1 px-3" onClick={handleCopyLink} icon="Copy">
            {t("Copy Link")}
            </Button>
    );

    return (
        <EditorLayout
            title={t("Outbound Editor")}
            local={local}
            setLocal={setLocal}
            rawText={rawText}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={errors}
            onSave={handleSave}
            onClose={onClose}
            schemaMode="outbound"
            extraButtons={extraButtons}
            rawConfigText={rawConfigText}
            onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
            onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
        >
            <div className="space-y-6 pb-10">
                {/* A snippet reference occupies an outbound slot but has no
                    protocol, address or transport of its own — the panel
                    replaces it with real outbounds. Showing the outbound form
                    for one would invite edits that quietly turn the reference
                    into an ordinary (and broken) outbound, so show what it is
                    instead. Raw JSON mode is still available in the header for
                    anyone who really wants to hand-edit it. */}
                {getSnippetRefName(local) && (
                    <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-4 flex items-start gap-3">
                        <Icon name="BracketsCurly" weight="bold" className="text-fuchsia-300 text-xl shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-fuchsia-100 font-bold text-sm">
                                Snippet reference: {getSnippetRefName(local)}
                            </p>
                            <p className="text-[11px] text-fuchsia-200/70 mt-1">
                                {t("Remnawave replaces this entry with the snippet's outbounds before the config reaches a node. Edit the body in Snippets — filling in the fields below would turn the reference into an ordinary outbound.")}
                                </p>
                        </div>
                    </div>
                )}

                {/* Импорт из ссылки */}
                <div className="relative z-50">
                    <OutboundImport onImport={handleImport} />
                </div>

                {/* Тег + протокол */}
                <div className="relative z-40">
                    <OutboundGeneral 
                        outbound={local} 
                        onChange={updateField} 
                        onProtocolChange={handleProtocolChange}
                        errors={{ tag: getError('tag') }}
                        showSendThrough={show.sendThrough}
                    />
                </div>
                
                {/* Редактор, зависящий от протокола */}
                <div className="relative z-30">
                    {local.protocol === 'wireguard' ? (
                        <OutboundWireguard
                            outbound={local}
                            onChange={updateField}
                            errors={{
                                secretKey: getError('secretKey'),
                                peers:     getError('peers'),
                                ...wgPeerErrors,
                            }}
                        />
                    ) : local.protocol === 'loopback' ? (
                        <OutboundLoopback
                            outbound={local}
                            onChange={updateField}
                            inboundTags={allInboundTags}
                        />
                    ) : local.protocol === 'freedom' ? (
                        <OutboundFreedom outbound={local} onChange={updateField} />
                    ) : local.protocol === 'masque' ? (
                        <OutboundMasque
                            outbound={local}
                            onChange={updateField}
                            errors={{ address: getError('address'), port: getError('port') }}
                        />
                    ) : (
                        <OutboundServer
                            outbound={local}
                            onChange={updateField}
                            errors={{ address: getError('address'), port: getError('port') }}
                        />
                    )}
                </div>

                {/* Mux / Proxy chain / targetStrategy. A protocol that never
                    dials has none of these — see core/xray/outbound-shape. */}
                {(show.chain || show.mux || show.strategy) && (
                    <div className="relative z-20">
                        <OutboundProxyMux
                            outbound={local}
                            onChange={updateField}
                            showChain={show.chain}
                            showMux={show.mux}
                            showStrategy={show.strategy}
                            muxOffered={shape.mux}
                            outboundTags={otherOutboundTags}
                        />
                    </div>
                )}

                {/* A transport block on something that never dials. Not drawn
                    as an editor — there is nothing for it to configure — but
                    not left invisible either: the core still parses it, and a
                    mistake in it stops the config loading. */}
                {strayStream && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center gap-3">
                        <p className="text-[11px] text-amber-200/80 leading-relaxed flex-1">
                            {t("This outbound carries streamSettings, and a {protocol} outbound never opens a connection to use them. The core still reads and checks them when it loads.", { protocol: String(local.protocol) })}
                        </p>
                        <button
                            type="button"
                            onClick={() => updateField('streamSettings', undefined)}
                            className="h-8 px-3 shrink-0 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                        >
                            {t("Remove them")}
                        </button>
                    </div>
                )}

                {/* Transport / Stream Settings */}
                {shape.transport && (
                    <div className="relative z-10">
                        <TransportSettings
                            streamSettings={local.streamSettings}
                            onChange={(s: any) => updateField('streamSettings', s)}
                            isClient={true}
                            errors={errors}
                            protocol={local.protocol}
                        />
                    </div>
                )}
            </div>
        </EditorLayout>
    );
};
