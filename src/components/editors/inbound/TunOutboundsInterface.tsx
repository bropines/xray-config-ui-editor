import React from 'react';
import { FormField } from '../../ui/FormField';
import { RadioGroup } from '../../ui/RadioGroup';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import type { FieldEditorProps } from '../../ui/SchemaForm';
import {
    effectiveOutboundsInterface,
    outboundsInterfaceValue,
    readOutboundsInterface,
} from '../../../core/xray/tun-outbounds-interface';
import { perLanguage, t } from '../../../i18n';

type Pill = 'unset' | 'auto' | 'off' | 'named';

const PILLS = perLanguage(() => [
    { value: 'unset' as const, label: t("Not set") },
    { value: 'auto' as const, label: t("Automatic") },
    { value: 'off' as const, label: t("Off") },
]);

/**
 * A tun inbound's `autoOutboundsInterface`, drawn as the three states it has
 * plus a name.
 *
 * The generic form removes a key when its text box is emptied, and for this
 * key that is not "off": an absent key means "auto" as soon as routes are
 * listed, so a text box could be filled with anything but never be switched
 * off. The core reads `""` as off (see core/xray/tun-outbounds-interface for
 * the lines), so the third button writes exactly that, and the sentence above
 * says what the config amounts to — absent included, which is the state that
 * used to look like "off" and was not.
 *
 * Information on top, the controls under it.
 */
export const TunOutboundsInterface = ({ field, settings, offered }: {
    field: FieldEditorProps;
    /** The whole settings object: whether routes are listed changes what an absent key means. */
    settings: unknown;
    /** False on a line that does not read the key; the core notes already say it does nothing. */
    offered: boolean;
}) => {
    const choice = readOutboundsInterface(settings);
    const effect = offered ? effectiveOutboundsInterface(settings) : undefined;
    const held = typeof field.value === 'string' ? field.value : '';

    const sentence = (): string | undefined => {
        switch (effect?.kind) {
            case undefined:
                return undefined;
            case 'off':
                return choice === 'unset'
                    ? t("Not set: Xray does not bind its own connections to an interface.")
                    : t("Off: Xray's own connections are not bound to an interface, so they follow the system routes.");
            case 'auto':
                return effect.implied
                    ? t("Not set: Xray uses \"auto\", because autoSystemRoutingTable lists routes.")
                    : t("\"auto\": Xray chooses the interface for its own connections itself, and never the TUN.");
            case 'named':
                return t("Pinned: Xray binds its own connections to the interface {name}.", { name: effect.name });
        }
    };
    const text = sentence();

    return (
        <FormField label={field.label} help={field.help} error={field.error}>
            <div className="flex flex-col gap-2" data-tun-outbounds-interface={choice}>
                {choice === 'wrong' && (
                    <WrongTypeNotice
                        field="autoOutboundsInterface"
                        held={field.value}
                        expects="text"
                        onRemove={() => field.onChange(undefined)}
                    />
                )}
                {text && <p className="text-[11px] leading-relaxed text-slate-400" data-tun-effect={effect?.kind}>{text}</p>}
                <input
                    type="text"
                    className="input-base font-mono"
                    value={held}
                    placeholder={t("or an interface name, e.g. eth0")}
                    aria-label={field.label}
                    onChange={event => field.onChange(outboundsInterfaceValue('named', event.target.value))}
                />
                <RadioGroup<Pill>
                    variant="pills"
                    direction="horizontal"
                    value={choice === 'wrong' ? 'named' : choice}
                    options={PILLS()}
                    onChange={next => field.onChange(outboundsInterfaceValue(next))}
                />
            </div>
        </FormField>
    );
};
