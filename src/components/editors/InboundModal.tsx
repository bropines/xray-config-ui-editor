import React from 'react';
import { useConfigStore } from '../../store/configStore';
import { useInboundEditor } from '../../hooks/useInboundEditor';
import { EditorLayout } from '../ui/EditorLayout';
import { InboundGeneral } from './inbound/InboundGeneral';
import { InboundClients } from './inbound/InboundClients';
import { InboundSniffing } from './inbound/InboundSniffing';
import { InboundTun } from './inbound/InboundTun';
import { InboundTunnel } from './inbound/InboundTunnel';
import { InboundWireguard } from './inbound/InboundWireguard';
import { InboundCoreNotes } from './inbound/InboundCoreNotes';
import { TransportSettings } from './shared/TransportSettings';
import { t } from '../../i18n';

const TUNNEL_PROTOCOLS = ['dokodemo-door', 'tunnel'];

export const InboundModal = ({ data, onSave, onClose }: any) => {
    const rawConfigText = useConfigStore(state => state.rawConfigText);
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
        getError
    } = useInboundEditor(data, onSave);

    return (
        <EditorLayout
            title={t("Inbound Editor")}
            local={local}
            setLocal={setLocal}
            rawText={rawText}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={errors}
            onSave={handleSave}
            onClose={onClose}
            schemaMode="inbound"
            rawConfigText={rawConfigText}
            onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
            onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
        >
            <div className="space-y-8 pb-8">
                {/* What the chosen core refuses or ignores here — read first, fixed in place. */}
                <InboundCoreNotes inbound={local} onChange={updateField} />

                <section className="relative z-40 animate-in fade-in slide-in-from-top-4 duration-500">
                    <InboundGeneral
                        inbound={local}
                        onChange={updateField}
                        onProtocolChange={handleProtocolChange}
                        errors={{ tag: getError('tag'), port: getError('port') }}
                    />
                </section>

                <section className="relative z-30">
                    {local.protocol === 'tun' ? (
                        <InboundTun inbound={local} onChange={updateField} errors={errors} />
                    ) : TUNNEL_PROTOCOLS.includes(local.protocol) ? (
                        <InboundTunnel inbound={local} onChange={updateField} />
                    ) : local.protocol === 'wireguard' ? (
                        // Its own card: a WireGuard server has a key, an
                        // address and peers, none of which is a "client" in
                        // the sense InboundClients draws.
                        <InboundWireguard inbound={local} onChange={updateField} />
                    ) : (
                        <InboundClients
                            inbound={local}
                            onChange={updateField}
                            errors={{ clients: getError('clients') }}
                        />
                    )}
                </section>

                {/* Transport / Stream Settings */}
                <section className="relative z-20">
                    <TransportSettings
                        streamSettings={local.streamSettings}
                        onChange={(s: any) => updateField('streamSettings', s)}
                        isClient={false}
                        protocol={local.protocol}
                        errors={errors}
                    />
                </section>

                <section className="relative z-10 border-t border-slate-800/50 pt-6">
                    <InboundSniffing
                        sniffing={local.sniffing}
                        onChange={updateField}
                        errors={errors}
                    />
                </section>
                {/*
                  * No "allocate" section: InboundDetourConfig has no such key on
                  * any supported line (v26.3.27:infra/conf/xray.go:126), so the
                  * port-rotation switches that used to live here did nothing.
                  * An existing one is reported by InboundCoreNotes, with Remove.
                  */}
            </div>
        </EditorLayout>
    );
};
