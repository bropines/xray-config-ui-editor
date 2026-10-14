import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Help } from '../../ui/Help';
import { ListTextInput } from '../../ui/ListTextInput';
import { NumberInput } from '../../ui/NumberInput';
import { generateShortId } from '../../../core/generators';
import { masqueProblems, masqueUserList } from '../../../core/xray/masque';
import { useArrayField, useField } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { t } from '../../../i18n';

const Problem = ({ message }: { message?: string }) =>
    message ? <p className="text-[10px] text-rose-400 mt-1 leading-snug">{message}</p> : null;

/**
 * A MASQUE server: who may sign in, and the addresses it hands out.
 *
 * Users are written under `clients`, the spelling the other protocols use and
 * the one that wins when both are present (v26.10.10:infra/conf/masque.go:55-57);
 * useInboundEditor moves a lone `users` list over first. The transport (masque,
 * with TLS and a certificate) is the stream settings card below; the rules for
 * all of it are in core/xray/masque, shared with the diagnostics.
 */
export const InboundMasque = ({ inbound, onChange }: any) => {
    const { version } = useCoreVersion();
    const clients = useArrayField<{ email?: string; pass?: string; level?: number }>(inbound, onChange, ['settings', 'clients']);
    const address = useField<unknown>(inbound, onChange, ['settings', 'address']);
    const mtu = useField<number | undefined>(inbound, onChange, ['settings', 'mtu']);

    const problems = masqueProblems(inbound, 'inbound', version);
    const at = (field: string) => problems.filter(problem => problem.field === field);
    const key = masqueUserList(inbound?.settings ?? {}).key;

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 space-y-4" data-masque-inbound>
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Icon name="Planet" /> {t("MASQUE Server")}
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
                {t("Clients sign in with an email and a password, and are given an address from the pool below. The server keeps the first address of each prefix for itself. It listens on an IP address (every address when left empty) and needs the masque transport with TLS.")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="label-xs flex items-center gap-1">
                        {t("Address pool")}
                        <Help>{t("One IPv4 and/or one IPv6 prefix, with the server's own address in it, like 10.250.0.1/24. The network address itself, and for IPv4 the broadcast address, cannot be the server's.")}</Help>
                    </label>
                    <ListTextInput
                        value={address.value}
                        onChange={next => address.onChange(next)}
                        className="input-base font-mono"
                        placeholder="10.250.0.1/24, fd00:250::1/64"
                        aria-label={t("Address pool")}
                        spellCheck={false}
                    />
                    {at('settings.address').map((problem, index) => <Problem key={index} message={problem.message} />)}
                </div>
                <div>
                    <label className="label-xs flex items-center gap-1">
                        {t("MTU")}
                        <Help>{t("The tunnel's packet size: empty for the default (1280), otherwise 1280 to 65535.")}</Help>
                    </label>
                    <NumberInput
                        placeholder="1280"
                        value={mtu.value}
                        onChange={value => mtu.onChange(value)}
                        min={1280}
                        max={65535}
                    />
                    {at('settings.mtu').map((problem, index) => <Problem key={index} message={problem.message} />)}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Users" /> {t("Users")}
                    </h5>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="!py-0.5 !px-2 !text-[10px]"
                        onClick={() => clients.add({ email: `user${clients.items.length}@masque`, pass: generateShortId(16) })}
                        icon="Plus"
                    >
                        {t("Add")}
                    </Button>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scroll pr-1">
                    {clients.items.map((user, index) => {
                        const where = `settings.${key}[${index}]`;
                        return (
                            <div key={index} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                                <div>
                                    <label className="label-xs">{t("Email")}</label>
                                    <input
                                        className="input-base py-1.5 text-xs"
                                        value={user.email || ''}
                                        onChange={e => clients.update(index, { email: e.target.value })}
                                    />
                                    {at(`${where}.email`).map((problem, i) => <Problem key={i} message={problem.message} />)}
                                </div>
                                <div>
                                    <label className="label-xs">{t("Password")}</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="input-base py-1.5 text-xs font-mono"
                                            value={user.pass || ''}
                                            onChange={e => clients.update(index, { pass: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => clients.update(index, { pass: generateShortId(16) })}
                                            title={t("Generate Password")}
                                            className="text-slate-500 hover:text-white transition-colors"
                                        >
                                            <Icon name="DiceFive" />
                                        </button>
                                    </div>
                                    {at(`${where}.pass`).map((problem, i) => <Problem key={i} message={problem.message} />)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => clients.remove(index)}
                                    className="absolute top-2 right-2 p-1 text-slate-600 hover:text-rose-500 transition-colors"
                                    title={t("Delete")}
                                >
                                    <Icon name="Trash" />
                                </button>
                            </div>
                        );
                    })}
                    {clients.items.length === 0 && (
                        <div className="text-center text-slate-600 text-xs py-4 italic">{t("No users defined. Click Add to create one.")}</div>
                    )}
                </div>
            </div>

            {at('listen').map((problem, index) => <Problem key={index} message={problem.message} />)}
        </div>
    );
};
