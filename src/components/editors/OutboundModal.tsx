import React from 'react';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
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
import { OutboundProxyMux } from './outbound/OutboundProxyMux';
import { TransportSettings } from './shared/TransportSettings';
import { t } from '../../i18n';

export const OutboundModal = ({ data, onSave, onClose, index }: any) => {
    const { config, addItem, rawConfigText } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((tag: any) => tag);

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

    const handleImport = (parsed: any) => {
        if (parsed.multiple && Array.isArray(parsed.outbounds)) {
            const [primary, ...others] = parsed.outbounds;
            setLocal(primary);
            others.forEach(outbound => addItem('outbounds', outbound));
            toast.success(`Imported ${parsed.outbounds.length} outbounds (chained)`);
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
                    ) : (
                        <OutboundServer
                            outbound={local}
                            onChange={updateField}
                            errors={{ address: getError('address'), port: getError('port') }}
                        />
                    )}
                </div>
                
                {/* Mux / Proxy chain */}
                <div className="relative z-20">
                    <OutboundProxyMux outbound={local} onChange={updateField} allTags={allOutboundTags} />
                </div>

                {/* Transport / Stream Settings */}
                <div className="relative z-10">
                    <TransportSettings
                        streamSettings={local.streamSettings}
                        onChange={(s: any) => updateField('streamSettings', s)}
                        isClient={true}
                        errors={errors}
                        protocol={local.protocol}
                    />
                </div>
            </div>
        </EditorLayout>
    );
};
