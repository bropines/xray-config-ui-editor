import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../ui/Button';
import { FormField } from '../../ui/FormField';
import { Icon } from '../../ui/Icon';
import { useConfigStore } from '../../../store/configStore';
import { useWarpRelay } from '../../../hooks/useWarpRelay';
import { BUILT_IN_RELAY, describeRelayError, pingRelay } from '../../../core/generators/warp-relay';
import { t } from '../../../i18n';

type Check = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; version: number } | { state: 'failed'; message: string };

/**
 * Which relay WARP registrations go through, and the key it takes.
 *
 * Empty URL is the relay built into the editor, with its built-in key. A URL
 * of the user's own makes the key box count: their Worker accepts whatever
 * they put in its BUILT_IN_KEYS or ACCESS_KEYS secret.
 */
export const WarpRelaySettings = () => {
    const { url, key, setUrl, setKey } = useConfigStore(useShallow(state => ({
        url: state.warpWorkerUrl,
        key: state.warpWorkerKey,
        setUrl: state.setWarpWorkerUrl,
        setKey: state.setWarpWorkerKey,
    })));
    const relay = useWarpRelay();
    const [check, setCheck] = useState<Check>({ state: 'idle' });
    const [shown, setShown] = useState(false);

    const runCheck = async () => {
        setCheck({ state: 'busy' });
        try {
            const { version } = await pingRelay(relay);
            setCheck({ state: 'ok', version });
        } catch (error) {
            setCheck({ state: 'failed', message: describeRelayError(error) });
        }
    };

    const own = url.trim() !== '';

    return (
        <div className="flex flex-col gap-3" data-testid="warp-relay-settings">
            <FormField
                label={t("WARP Worker URL")}
                help={t("The relay WARP accounts are registered through. Leave it empty for the one built into the editor; to use your own, deploy workers/warp from the repository and enter its address and key.")}
            >
                <input
                    className="input-base"
                    placeholder={BUILT_IN_RELAY.url}
                    value={url}
                    onChange={event => { setUrl(event.target.value); setCheck({ state: 'idle' }); }}
                />
            </FormField>
            <FormField
                label={t("Worker key")}
                help={own
                    ? t("The access key your worker expects: one of its BUILT_IN_KEYS or its ACCESS_KEYS secret. Sent as X-Xcui-Key.")
                    : t("The built-in relay uses the key built into the editor; this box counts once a URL of your own is entered.")}
            >
                <div className="flex gap-2">
                    <input
                        className="input-base font-mono flex-1 min-w-0"
                        type={shown ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={!own}
                        placeholder={own ? t("Your worker's key") : t("Built in")}
                        value={own ? key : ''}
                        onChange={event => { setKey(event.target.value); setCheck({ state: 'idle' }); }}
                    />
                    <Button
                        variant="ghost"
                        className="px-2"
                        disabled={!own}
                        onClick={() => setShown(value => !value)}
                        title={shown ? t("Hide") : t("Show")}
                        icon={shown ? 'EyeSlash' : 'Eye'}
                    />
                </div>
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={runCheck} disabled={check.state === 'busy'} icon="PlugsConnected">
                    {check.state === 'busy' ? t("Checking…") : t("Check the relay")}
                </Button>
                {check.state === 'ok' && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Icon name="CheckCircle" /> {t("The relay answers and takes the key.")}
                    </span>
                )}
                {check.state === 'failed' && (
                    <span className="text-xs text-rose-400 flex items-center gap-1 min-w-0">
                        <Icon name="WarningCircle" className="shrink-0" /> <span className="min-w-0 break-words">{check.message}</span>
                    </span>
                )}
            </div>
        </div>
    );
};
