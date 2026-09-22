import React from 'react';
import { Modal, ModalBottomBar } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { useLocalBalancerBuilder } from '../../../hooks/useLocalBalancerBuilder';
import { useTemplatesLibrary } from '../../../hooks/useTemplatesLibrary';
import { RemnawaveGuide } from '../remnawave/RemnawaveGuide';
import { NodesPane } from './NodesPane';
import { OutputPane } from './OutputPane';
import { t, tn } from '../../../i18n';


/**
 * Local Balancer builder.
 *
 * Turns a pile of nodes into the client config people otherwise hand-write:
 * local SOCKS/HTTP in, several proxies out, a balancer picking the fastest,
 * a probe measuring them, and a bypass list that keeps local traffic local.
 * The parts that must agree (tag prefix, selector, probe selector, catch-all
 * rule, bypass list in both routing and DNS) are derived, not typed.
 */

export const LocalBalancerModal = ({ onClose, initialTemplateUuid, initialMode, onEditHost }: {
    onClose: () => void;
    /** Open on a specific panel template. */
    initialTemplateUuid?: string;
    /** Open directly in panel-template mode rather than client-config mode. */
    initialMode?: 'config' | 'template';
    /** Opens one of the listed panel hosts in the host editor. */
    onEditHost?: (uuid: string) => void;
}) => {
    const b = useLocalBalancerBuilder(initialTemplateUuid, initialMode);
    const { options } = b;

    const multi = b.results.length > 1;
    const isTemplate = b.outputMode === 'template';
    const selectorType = b.inject.selector.type;

    // On a phone the two columns cannot both have height: the right one would
    // collapse to nothing and take every option and the preview with it. Same
    // approach the Routing Manager uses — show one pane at a time.
    const [mobilePane, setMobilePane] = React.useState<'nodes' | 'output'>('nodes');

    // Templates are edited here rather than in a module of their own: a panel
    // template *is* what this builder writes, so the form and the raw JSON are
    // two views of one object — the same JSON/UI pair the routing and protocol
    // editors already offer.
    const tpl = useTemplatesLibrary();
    const [templateView, setTemplateView] = React.useState<'form' | 'json'>('form');
    const editingSavedTemplate = isTemplate && !!b.templateTargetUuid && !!tpl.draft;

    const selectTemplate = async (uuid: string) => {
        await b.loadTemplateIntoBuilder(uuid);
        await tpl.open(uuid);
    };

    const newTemplate = () => {
        tpl.closeDraft();
        b.setTemplateTargetUuid('');
        b.setTemplateName('');
        setTemplateView('form');
    };

    const switchTemplateView = (view: 'form' | 'json') => {
        // Leaving the JSON view means the form has to catch up with whatever
        // was typed, or the next save would quietly write the old fields back.
        if (view === 'form' && templateView === 'json' && tpl.draft && !tpl.parseError) {
            try {
                b.applyTemplateObject(JSON.parse(tpl.draft.text || '{}'));
            } catch {
                /* reported by applyTemplateObject */
            }
        }
        setTemplateView(view);
    };

    return (
        <Modal
            title={isTemplate ? t("Local Balancer — panel template") : t("Local Balancer Builder")}
            onClose={onClose}
            onSave={isTemplate
                ? (templateView === 'json' && editingSavedTemplate
                    ? tpl.save
                    : (b.savingTemplate ? () => {} : b.saveTemplate))
                : (b.preview ? b.loadIntoEditor : undefined)}
            saveText={isTemplate
                ? (b.savingTemplate || tpl.saving
                    ? t("Saving…")
                    : (templateView === 'json' && editingSavedTemplate ? t("Save JSON to panel") : t("Save to panel")))
                : (multi ? t("Load shown config") : t("Load into editor"))}
            saveIcon={isTemplate ? 'CloudArrowUp' : 'ArrowSquareIn'}
            className="md:h-[88vh] md:max-h-[92dvh] overflow-hidden"
            extraButtons={
                <>
                    <Button variant="secondary" icon="FileArrowDown" onClick={b.download} disabled={!b.outputJson}>
                        {isTemplate
                            ? t("Download template")
                            : (multi
                                ? tn(b.results.length, "Download {n} config", "Download {n} configs")
                                : t("Download JSON"))}
                    </Button>
                    <Button variant="secondary" icon="Copy" onClick={b.copy} disabled={!b.outputJson}>{t("Copy")}</Button>
                    {!isTemplate && (
                        <Button variant="secondary" icon="CardsThree" onClick={b.saveAsProfiles} disabled={b.results.length === 0}>
                            {tn(b.results.length, "Save as profile", "Save as profiles")}
                        </Button>
                    )}
                </>
            }
        >
            {isTemplate && <RemnawaveGuide module="templates" />}

            {/* Which of the two panes a phone shows. It belongs at the foot
                with everything else you tap, not above the thing it switches. */}
            <ModalBottomBar className="flex-1">
                <div className="flex md:hidden bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 shrink-0 w-full">
                    {([['nodes', isTemplate ? t("Templates") : t("Nodes")],
                      ['output', isTemplate ? t("Template") : t("Config")]] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setMobilePane(key)}
                            className={`flex-1 px-3 py-2 text-[11px] font-bold rounded-md transition-all ${
                                mobilePane === key ? 'bg-slate-700 text-white' : 'text-slate-400'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </ModalBottomBar>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-3">
                <NodesPane
                    b={b}
                    tpl={tpl}
                    isTemplate={isTemplate}
                    mobilePane={mobilePane}
                    selectTemplate={selectTemplate}
                    newTemplate={newTemplate}
                    onEditHost={onEditHost}
                />

                <OutputPane
                    b={b}
                    tpl={tpl}
                    options={options}
                    isTemplate={isTemplate}
                    multi={multi}
                    selectorType={selectorType}
                    mobilePane={mobilePane}
                    templateView={templateView}
                    switchTemplateView={switchTemplateView}
                    editingSavedTemplate={editingSavedTemplate}
                />
            </div>
        </Modal>
    );
};
