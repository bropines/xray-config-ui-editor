import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { TagSelector } from '../../ui/TagSelector';
import { useField } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { masqueProblems } from '../../../core/xray/masque';
import { generateWarpMasqueAccount, withWarpMasqueAccount } from '../../../core/generators/warp-masque';
import { describeRelayError } from '../../../core/generators/warp-relay';
import { useWarpRelay } from '../../../hooks/useWarpRelay';
import { t } from '../../../i18n';

const Problem = ({ message }: { message?: string }) =>
    message ? <p className="text-[10px] text-rose-400 mt-1 leading-snug">{message}</p> : null;

/**
 * MASQUE — CONNECT-IP over HTTP/3 (or HTTP/2, by the TLS ALPN), from 26.10.
 *
 * Its three settings are flat, not wrapped in `servers[]` or `vnext[]`: the
 * core reads `address`, `port` and `remoteDNS` off the settings object itself
 * and refuses the config when the first two are missing
 * (v26.10.10:infra/conf/masque.go:14-39). What it needs around it — the masque
 * transport, TLS, no Mux — is checked by core/xray/masque, the same function
 * the diagnostics use; the transport's own fields (host, path, WARP) are in the
 * stream settings below.
 */
export const OutboundMasque = ({ outbound, onChange, errors = {} }: any) => {
    const { version, offersAt } = useCoreVersion();
    const relay = useWarpRelay();
    const [registering, setRegistering] = useState(false);
    const address = useField<string>(outbound, onChange, ['settings', 'address']);
    const port = useField<number>(outbound, onChange, ['settings', 'port']);
    const remoteDNS = useField<string[] | undefined>(outbound, onChange, ['settings', 'remoteDNS']);

    const problems = masqueProblems(outbound, 'outbound', version);
    const at = (field: string) => problems.filter(problem => problem.field === field);

    // WARP over MASQUE is a 26.10 feature; on other lines the stream editor
    // shows a held warp block with its status instead.
    const warpOffered = offersAt('outbound', 'streamSettings.masqueSettings.warp', 'masque');
    const hasWarp = !!outbound?.streamSettings?.masqueSettings?.warp;

    /**
     * Register a WARP device and point this outbound at it: server, TLS name
     * and the warp block change; everything else the outbound holds stays.
     * The key pair is made in the browser (core/generators/warp-masque.ts).
     */
    const registerWarp = async () => {
        setRegistering(true);
        try {
            const next = withWarpMasqueAccount(outbound, await generateWarpMasqueAccount(relay));
            onChange('settings', next.settings);
            onChange('streamSettings', next.streamSettings);
            toast.success(t("Registered with WARP: the server, TLS name and WARP keys are filled in."));
        } catch (error) {
            toast.error(t("WARP did not register"), { description: describeRelayError(error), duration: 12000 });
        } finally {
            setRegistering(false);
        }
    };

    return (
        <Card title={t("MASQUE Server")} icon="Planet" className="mt-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg mb-4">
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {t("MASQUE carries IP packets inside an HTTP request, so on the wire it looks like ordinary web traffic. It uses the masque transport and nothing else, it needs TLS, and it is the one outbound the core refuses to multiplex.")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                    <FormField label={t("Address (IP or Domain)")} error={errors.address}>
                        <input
                            className="input-base"
                            placeholder={t("example.com")}
                            value={address.value || ""}
                            onChange={e => address.onChange(e.target.value)}
                        />
                    </FormField>
                    {at('settings.address').map(problem => <Problem key={problem.kind} message={problem.message} />)}
                </div>
                <div>
                    <FormField label={t("Port")} error={errors.port}>
                        <input
                            type="number"
                            className="input-base"
                            placeholder="443"
                            value={port.value || ""}
                            onChange={e => port.onChange(parseInt(e.target.value) || 0)}
                        />
                    </FormField>
                    {at('settings.port').map(problem => <Problem key={problem.kind} message={problem.message} />)}
                </div>
            </div>

            <div className="mt-4">
                <label className="label-xs">{t("Remote DNS")}</label>
                <TagSelector
                    multi
                    availableTags={['1.1.1.1', '8.8.8.8', '9.9.9.9', '2606:4700:4700::1111']}
                    selected={remoteDNS.value || []}
                    onChange={value => {
                        const list = value as string[];
                        remoteDNS.onChange(list.length ? list : undefined);
                    }}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                    {t("Resolvers reached through the tunnel. IP addresses only — the core parses each one at startup and will not run if a hostname is in the list.")}
                </p>
                {at('settings.remoteDNS').map((problem, index) => <Problem key={index} message={problem.message} />)}
            </div>

            {/* Mux has no switch for this protocol; one a config holds is drawn by the editor, and this says why it is wrong. */}
            {at('mux.enabled').map(problem => (
                <p key={problem.kind} className="text-[11px] text-rose-300 mt-4 leading-snug">{problem.message}</p>
            ))}

            {warpOffered && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2" data-testid="masque-warp-register">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        {hasWarp
                            ? t("Registering again makes a new WARP device with new keys and replaces the ones below.")
                            : t("To use Cloudflare WARP, register a device: it fills in Cloudflare's server, the TLS name and the WARP keys. The private key is made in this browser.")}
                    </p>
                    <Button variant="secondary" icon={registering ? 'CircleNotch' : 'Cloud'} onClick={registerWarp} disabled={registering}>
                        {registering ? t("Registering WARP...") : hasWarp ? t("Register a new WARP device") : t("Register with WARP")}
                    </Button>
                </div>
            )}
        </Card>
    );
};
