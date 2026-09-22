import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { checkInstallReadiness, type Check, type InstallReadiness } from '../../../core/pwa/install-readiness';
import {
    installPromptAvailable,
    onInstallPromptChange,
    showInstallPrompt,
} from '../../../core/pwa/install-prompt';
import { toast } from 'sonner';
import { t } from '../../../i18n';

/** Wording per check, kept here so the translation scanner sees the literals. */
const checkText = (id: string): string => ({
    'secure': t("Served over HTTPS"),
    'manifest-link': t("The page links a manifest"),
    'manifest-fetch': t("The manifest loads"),
    'manifest-name': t("The manifest has a name"),
    'manifest-display': t("It asks for its own window"),
    'manifest-scope': t("The start page is inside the app's scope"),
    'icon-declared': t("An icon of at least 192px is declared"),
    'icon-served': t("Every declared icon actually loads"),
    'sw': t("A service worker is installed"),
    'sw-controlling': t("The service worker controls this page"),
}[id] ?? id);

/** Detail codes the core reports; anything else is already technical. */
const detailText = (detail: string): string => ({
    'restored:stripped-here': t("The server sends it, but something in this browser removed it — put back."),
    'restored:not-served': t("The page as served has no manifest link — put back."),
    'restored:unknown': t("It was missing — put back."),
    'cannot-add': t("It is missing and could not be added."),
}[detail] ?? detail);

const Row = ({ check }: { check: Check }) => {
    const tone = check.status === 'pass' ? 'text-emerald-400'
        : check.status === 'fail' ? 'text-rose-400'
        : 'text-slate-500';
    const icon = check.status === 'pass' ? 'CheckCircle'
        : check.status === 'fail' ? 'XCircle'
        : 'Clock';
    return (
        <div className="flex items-start gap-2 text-[11px]">
            <Icon name={icon} weight="fill" className={`${tone} shrink-0 mt-0.5`} />
            <div className="min-w-0">
                <span className="text-slate-300">{checkText(check.id)}</span>
                {check.detail && (
                    <span className="block font-mono text-[10px] text-slate-500 break-words">{detailText(check.detail)}</span>
                )}
            </div>
        </div>
    );
};

/**
 * Installing the app, and why the browser might refuse.
 *
 * Chrome's answer is "this app cannot be installed" with nothing else — not in
 * the dialog, not in the console. Every condition it checks is observable from
 * the page, so this runs the same checks on the device that is refusing and
 * names the one that failed.
 */
export const InstallEditor = () => {
    const [readiness, setReadiness] = React.useState<InstallReadiness | null>(null);
    const [checking, setChecking] = React.useState(false);
    const [promptable, setPromptable] = React.useState(installPromptAvailable());

    React.useEffect(() => onInstallPromptChange(setPromptable), []);

    const run = async () => {
        setChecking(true);
        try {
            setReadiness(await checkInstallReadiness(installPromptAvailable()));
        } finally {
            setChecking(false);
        }
    };

    const handleInstall = async () => {
        const outcome = await showInstallPrompt();
        if (outcome === null) toast.error(t("The browser has not offered an install for this page."));
        else if (outcome === 'dismissed') toast.info(t("Install dismissed."));
    };

    const failed = readiness?.checks.filter(check => check.status === 'fail') ?? [];

    return (
        <Card title={t("Install as an app")} icon="DeviceMobile">
            <div className="text-[11px] text-slate-400 leading-relaxed">
                {t("Installed, the editor opens in its own window, works offline and keeps its own storage. Export your data first — an installed app does not inherit what the browser tab saved.")}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {promptable && (
                    <Button variant="primary" icon="DownloadSimple" onClick={handleInstall}>
                        {t("Install")}
                    </Button>
                )}
                <Button variant="secondary" icon="Stethoscope" onClick={run} loading={checking}>
                    {t("Check why it cannot be installed")}
                </Button>
                {readiness?.installed && (
                    <span className="text-[11px] text-emerald-300 font-bold">{t("Running as an installed app.")}</span>
                )}
            </div>

            {readiness && (
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                    {failed.length === 0 ? (
                        <div className="flex gap-2 text-[11px] text-emerald-300">
                            <Icon name="CheckCircle" weight="fill" className="shrink-0 mt-0.5" />
                            <span>
                                {readiness.promptAvailable
                                    ? t("Everything checks out and the browser has offered an install.")
                                    : t("Everything this page can check passes. If the browser still refuses, it is holding an older copy — reload once or twice — or it is Safari, which installs only through Share → Add to Home Screen.")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex gap-2 text-[11px] text-rose-300">
                            <Icon name="WarningOctagon" weight="fill" className="shrink-0 mt-0.5" />
                            <span>{t("This is what fails:")}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5 pt-1">
                        {readiness.checks.map(check => <Row key={check.id} check={check} />)}
                    </div>
                </div>
            )}
        </Card>
    );
};
