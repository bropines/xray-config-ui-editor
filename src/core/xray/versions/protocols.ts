/**
 * Which protocols a core line registers, for the protocol choosers.
 *
 * A protocol the loader does not know is not ignored the way an unknown key
 * is: `LoadWithID` fails on it and the config does not load. So a protocol
 * whose `<direction>.protocol.<name>` entry says `rejected` for the chosen
 * line is left out of the list — unless the config already uses it, in which
 * case it stays, so the chooser shows what the config holds rather than going
 * blank. Diagnostics say the rest.
 *
 * "Already uses it" holds for a name this app has no entry for, too. The
 * candidates are the editor's own list, and that list has been short of what
 * the loader registers before: `mixed` is an inbound on every supported line
 * (v26.3.27:infra/conf/xray.go:30) and was missing from it, so an existing
 * `mixed` inbound opened with nothing selected. Whatever the config says is
 * therefore listed, last, even when nothing here knows the name.
 */
import type { CoreVersionId } from './index';
import { featureStatus } from './features';

export const protocolsFor = (
    version: CoreVersionId,
    direction: 'inbound' | 'outbound',
    candidates: readonly string[],
    current?: string,
): string[] => {
    const offered = candidates.filter(name =>
        name === current || featureStatus(version, `${direction}.protocol.${name}`) !== 'rejected',
    );
    return current && !offered.includes(current) ? [...offered, current] : offered;
};
