import React, { useRef, useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import {
    backupFilename,
    exportBackup,
    readBackup,
    restoreBackup,
    summarise,
    type Backup,
    type BackupProblem,
} from '../../../core/backup/store-backup';
import { toast } from 'sonner';
import { t, tn } from '../../../i18n';

/**
 * iOS gives a home-screen app a storage container separate from Safari's, and
 * offers no install prompt an app can trigger. So someone who installs after
 * months of work opens the icon to an empty editor — with the real data still
 * in Safari, invisible from the app. The only defence is telling them before
 * they do it.
 */
const isIosBrowser = (): boolean =>
    typeof navigator !== 'undefined'
    && /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !(navigator as any).standalone;

const problemText = (problem: BackupProblem): string => {
    switch (problem) {
        case 'not-json': return t("That file is not JSON.");
        case 'not-a-backup': return t("That is a JSON file, but not a backup of this editor. A single config goes in through Open, not here.");
        case 'from-the-future': return t("That backup was written by a newer version of the editor. Update first, then import it.");
        case 'empty': return t("That backup has no state in it.");
    }
};

/**
 * Export and import everything the editor remembers.
 *
 * Downloading a config exports the active config alone; profiles, version
 * history, panel credentials and libraries have never been portable. That
 * only became urgent with installability: on iOS a home-screen app gets its
 * own storage container, so installing after months of work opens an empty
 * editor while the real data sits in Safari, unreachable.
 */
export const BackupEditor = () => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [pending, setPending] = useState<Backup | null>(null);

    const handleExport = async () => {
        try {
            const backup = await exportBackup();
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = backupFilename();
            a.click();
            URL.revokeObjectURL(url);
            const counts = summarise(backup);
            toast.success(tn(counts.profiles, "Exported {n} profile", "Exported {n} profiles"));
        } catch {
            toast.error(t("There is nothing stored yet to export."));
        }
    };

    const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = readBackup(String(reader.result ?? ''));
            if ('problem' in result) {
                toast.error(problemText(result.problem));
                return;
            }
            // Never replace the store straight off a file picker: what is
            // about to be overwritten is everything the user has.
            setPending(result.backup);
        };
        reader.readAsText(file);
    };

    const handleRestore = async () => {
        if (!pending) return;
        await restoreBackup(pending);
        // zustand reads IndexedDB once, at startup: a live store would keep
        // showing — and then re-persist — what was there before.
        location.reload();
    };

    const counts = pending ? summarise(pending) : null;

    return (
        <Card title={t("Backup & Restore")} icon="Archive">
            <div className="text-[11px] text-slate-400 leading-relaxed">
                {t("Downloading a config exports that config alone. This exports everything the editor remembers — profiles, version history, panel connection, libraries and settings — as one file.")}
            </div>

            {isIosBrowser() && (
                <div className="flex gap-2 p-2.5 rounded-lg border border-sky-500/40 bg-sky-950/20 text-[11px] text-sky-200/90">
                    <Icon name="DeviceMobile" weight="fill" className="shrink-0 mt-0.5 text-sky-400" />
                    <div>
                        {t("On iOS, an app added to the home screen gets its own storage — it will not see anything saved here in Safari. Export first, install through Share → Add to Home Screen, then import inside the installed app.")}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Button variant="secondary" icon="DownloadSimple" onClick={handleExport}>
                    {t("Export everything")}
                </Button>
                <Button variant="secondary" icon="UploadSimple" onClick={() => fileInput.current?.click()}>
                    {t("Import a backup")}
                </Button>
                <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handlePick}
                />
            </div>

            {counts && (
                <div className="flex flex-col gap-3 p-3 rounded-xl border border-amber-500/40 bg-amber-950/20">
                    <div className="flex gap-2 text-[11px] text-amber-200/90">
                        <Icon name="Warning" weight="fill" className="shrink-0 mt-0.5 text-amber-400" />
                        <div>
                            {t("Importing replaces everything currently in this browser. Export first if you have not.")}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 font-mono">
                        <span>{tn(counts.profiles, "{n} profile", "{n} profiles")}</span>
                        <span>{tn(counts.snapshots, "{n} snapshot", "{n} snapshots")}</span>
                        {counts.spiderPaths > 0 && (
                            <span>{tn(counts.spiderPaths, "{n} spiderX path", "{n} spiderX paths")}</span>
                        )}
                        {counts.panelConnected && <span>{t("panel connection")}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="danger" icon="ArrowCounterClockwise" onClick={handleRestore}>
                            {t("Replace and reload")}
                        </Button>
                        <Button variant="ghost" onClick={() => setPending(null)}>
                            {t("Cancel")}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
