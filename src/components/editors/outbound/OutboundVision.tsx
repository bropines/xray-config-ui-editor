import React from 'react';
import { Select } from '../../ui/Select';
import { FormField } from '../../ui/FormField';
import { NumberInput } from '../../ui/NumberInput';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { VisionSeedEditor } from '../shared/VisionSeedEditor';
import { flowOptions } from '../shared/flow-options';
import { useField, type FieldPath } from '../../../hooks/useField';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import {
    outboundHolder,
    parseUint32,
    readTestpre,
    readTestseed,
    visionOutboundProblems,
    type VisionProblem,
} from '../../../core/xray/vless-vision';
import { t } from '../../../i18n';

/**
 * A VLESS outbound keeps its flow, `testseed` and `testpre` in one account: the
 * flat settings once there is an `address`, `vnext[0].users[0]` otherwise
 * (core/xray/vless-vision, outboundHolder). Both components here ask it where,
 * so a config in either shape is edited where the core reads it — a key in the
 * other one is a key nothing reads.
 */
type Props = {
    outbound: any;
    /** The editor's `updateField(path, value)` — see OutboundModal. */
    onChange: (path: FieldPath, value: any) => void;
};

const Notes = ({ items }: { items: VisionProblem[] }) => (items.length === 0 ? null : (
    <ul className="space-y-1 mt-1">
        {items.map((problem, at) => (
            <li
                key={at}
                data-problem={problem.kind}
                className={`text-[10px] leading-relaxed break-words ${problem.severity === 'critical' ? 'text-rose-300' : 'text-amber-200/80'}`}
            >
                {problem.message}
                {problem.suggestion && <span className="block text-slate-400">{problem.suggestion}</span>}
            </li>
        ))}
    </ul>
));

/**
 * The outbound's flow. Offered as the line takes it ("", Vision, and the
 * udp443 spelling that lets UDP to port 443 through, which plain Vision
 * refuses — v26.10.10:proxy/vless/outbound/outbound.go:259); a value the line
 * refuses stays in the list, labelled. Where Vision cannot run is said under
 * it, once, in the words the diagnostics use.
 */
export const OutboundFlow = ({ outbound, onChange }: Props) => {
    const { tag, values } = useCoreVersion();
    const { path } = outboundHolder(outbound);
    const flow = useField<unknown>(outbound, onChange, [...path, 'flow']);
    const wrong = flow.value !== undefined && flow.value !== null && typeof flow.value !== 'string';
    const held = typeof flow.value === 'string' ? flow.value : '';
    const notes = visionOutboundProblems(outbound).filter(problem => problem.kind === 'flow.transport');

    return (
        <div className="flex flex-col gap-2" data-outbound-flow>
            {wrong && <WrongTypeNotice field="flow" held={flow.value} expects="text" onRemove={() => flow.onChange(undefined)} />}
            <Select
                label={t("Flow")}
                help={t("Vision pads the start of a connection to hide the TLS-inside-TLS pattern, and needs a TLS or REALITY connection to do it. The udp443 form also lets UDP to port 443 through, which plain Vision refuses.")}
                value={wrong ? '' : held}
                onChange={value => flow.onChange(value === '' ? undefined : value)}
                options={flowOptions(values('outbound.vless.flow'), wrong ? '' : held, { tag, empty: t("None") })}
            />
            <Notes items={notes} />
        </div>
    );
};

/**
 * Pre-connect and Vision's padding numbers, in a collapsed area: neither is
 * a setting most configs have, and both do something a reader would not guess
 * from the name. It opens by itself when the config holds either.
 *
 * `testpre` works with any flow (v26.10.10:proxy/vless/outbound/outbound.go:159
 * tests only the count and the reverse), the padding numbers only with Vision.
 */
export const OutboundVision = ({ outbound, onChange }: Props) => {
    const { path } = outboundHolder(outbound);
    const seed = useField<unknown>(outbound, onChange, [...path, 'testseed']);
    const pre = useField<unknown>(outbound, onChange, [...path, 'testpre']);
    const problems = visionOutboundProblems(outbound);
    const preRead = readTestpre(pre.value);
    const seedRead = readTestseed(seed.value);
    const active = (preRead.state === 'absent' ? 0 : 1) + (seedRead.state === 'absent' ? 0 : 1);

    return (
        <ExtendedSection
            className="mt-4"
            title={t("Pre-connect and Vision padding")}
            description={t("Connections opened ahead of time, and the numbers Vision pads with.")}
            activeCount={active}
            hasActiveValues={problems.some(problem => problem.kind.startsWith('testpre') || problem.kind.startsWith('testseed'))}
        >
            <FormField
                label={t("Pre-connect")}
                help={t("Connections dialled to the server ahead of time and kept idle, so a request finds one ready. 0 or empty is off. They are opened when the first request goes through this outbound; each one is a socket the server keeps open, and one more than two minutes old when a request takes it is closed unused. Ignored on an outbound with a reverse.")}
            >
                <div className="flex flex-col gap-2">
                    {preRead.state === 'wrong' && (
                        <WrongTypeNotice field="testpre" held={pre.value} expects="number" onRemove={() => pre.onChange(undefined)} />
                    )}
                    <NumberInput
                        value={preRead.state === 'number' ? preRead.value : undefined}
                        onChange={amount => pre.onChange(amount === undefined ? undefined : parseUint32(amount))}
                        placeholder="0"
                        min={0}
                    />
                    <Notes items={problems.filter(problem => problem.kind.startsWith('testpre.') && problem.kind !== 'testpre.type')} />
                </div>
            </FormField>

            <VisionSeedEditor
                scope="outbound"
                value={seed.value}
                onChange={seed.onChange}
                problems={problems.filter(problem => problem.kind.startsWith('testseed.'))}
            />
        </ExtendedSection>
    );
};
