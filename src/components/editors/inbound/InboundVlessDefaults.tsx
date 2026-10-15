import React from 'react';
import { Select } from '../../ui/Select';
import { Icon } from '../../ui/Icon';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { VisionSeedEditor } from '../shared/VisionSeedEditor';
import { flowOptions } from '../shared/flow-options';
import { useField, type FieldPath } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { visionInboundProblems } from '../../../core/xray/vless-vision';
import { t } from '../../../i18n';

/**
 * What a VLESS inbound hands the clients written in it: a default flow and
 * the Vision padding numbers.
 *
 * Drawn for every VLESS inbound, one with no clients included — a config
 * profile for a panel lists none and has these two keys all the same. They
 * are a convenience of the JSON loader, applied to the clients in the file as
 * it is read (v26.7.28:infra/conf/vless.go:72-82); the inbound's protobuf
 * config has no such fields (v26.7.28:proxy/vless/inbound/config.proto:21), so
 * a user added later through Xray's API keeps whatever its own account says.
 * The Help says so, because a default that reaches nobody looks the same on
 * screen as one that reaches everybody.
 *
 * The flow is chosen from what the line takes ("" and Vision for an inbound —
 * the udp443 spelling is a client-side value an inbound refuses), and a value
 * the config holds that the line refuses stays in the list, labelled.
 */
export const InboundVlessDefaults = ({ inbound, onChange }: {
    inbound: any;
    /** The editor's `updateField(path, value)` — see InboundModal. */
    onChange: (path: FieldPath, value: any) => void;
}) => {
    const { version, tag, values } = useCoreVersion();
    const flow = useField<unknown>(inbound, onChange, ['settings', 'flow']);
    const seed = useField<unknown>(inbound, onChange, ['settings', 'testseed']);

    const wrongFlow = flow.value !== undefined && flow.value !== null && typeof flow.value !== 'string';
    const held = typeof flow.value === 'string' ? flow.value : '';
    const seedProblems = visionInboundProblems(inbound, version)
        .filter(problem => problem.client === undefined && problem.field === 'settings.testseed');

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 space-y-4" data-vless-defaults>
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Icon name="Gear" /> {t("VLESS defaults")}
            </h4>

            {wrongFlow && <WrongTypeNotice field="flow" held={flow.value} expects="text" onRemove={() => flow.onChange(undefined)} />}

            <Select
                label={t("Default flow")}
                help={t("Clients that have no flow of their own get this one when Xray loads the config. A user added to a running Xray through its API arrives with its own account and does not get it. With Vision here, a client that connects without the flow has its TCP connections turned away.")}
                value={wrongFlow ? '' : held}
                onChange={value => flow.onChange(value === '' ? undefined : value)}
                options={flowOptions(values('inbound.vless.flow'), wrongFlow ? '' : held, { tag, empty: t("None") })}
            />

            <VisionSeedEditor
                scope="inbound"
                collapsible
                value={seed.value}
                onChange={seed.onChange}
                problems={seedProblems}
            />
        </div>
    );
};
