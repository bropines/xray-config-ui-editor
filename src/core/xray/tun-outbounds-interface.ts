/**
 * What a tun inbound's `autoOutboundsInterface` says, and every way to say it.
 *
 * The key is a `*string` in the loader, and the three things it can be do
 * three different things:
 *
 *   absent, or null     "auto" when `autoSystemRoutingTable` has entries,
 *                       otherwise nothing is bound
 *   ""                  nothing is bound — even with routing-table entries
 *   "auto"              Xray picks the interface itself, never the TUN
 *   any other string    that interface, by name
 *
 * from
 *
 *   v26.7.28:infra/conf/tun.go:22 (the field), :35-37 (a given value is copied
 *   as it is, an empty one included), :38-40 (the default, only when the key
 *   is nil); the same lines at v26.9.9, and v26.10.10:infra/conf/tun.go:26,
 *   :67-72.
 *
 * and what the handler does with the result:
 *
 *   v26.7.28:proxy/tun/handler.go:92  anything but "" registers a dialer
 *   controller that binds every outbound socket of Xray's own to the
 *   interface (loopback aside); "" registers nothing. :98-99 turns "auto" into
 *   an empty fixed name, and the platform's findOutboundInterface picks one
 *   for an empty name and looks the name up otherwise (tun_linux.go:339-363,
 *   tun_windows.go:313-355). v26.9.9:proxy/tun/handler.go:92-101 is the same;
 *   v26.10.10:proxy/tun/handler.go:111-120.
 *
 * So the only way to switch it off while routes are listed is to write `""`,
 * and a form that removes the key on an empty value cannot write it: the key
 * comes back as "auto". 26.3 reads neither key (v26.3.27:infra/conf/tun.go:8-12).
 *
 * Why off matters: with the routes the TUN installs, Xray's own connections
 * follow them back into the TUN unless every outbound pins its own interface
 * or mark. That is a choice someone can make, so it is offered and said, not
 * hidden.
 */

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const AUTO_OUTBOUNDS_INTERFACE = 'auto';

/** What the key holds, as a choice. `wrong` is a value the loader cannot decode into a string. */
export type OutboundsInterfaceChoice = 'unset' | 'auto' | 'off' | 'named' | 'wrong';

export const readOutboundsInterface = (settings: unknown): OutboundsInterfaceChoice => {
    const value = isObject(settings) ? settings.autoOutboundsInterface : undefined;
    // null decodes to a nil pointer, the same as no key at all.
    if (value === undefined || value === null) return 'unset';
    if (typeof value !== 'string') return 'wrong';
    if (value === '') return 'off';
    return value === AUTO_OUTBOUNDS_INTERFACE ? 'auto' : 'named';
};

/** Whether the routing table is listed — the one thing that changes what an absent key means. */
export const hasSystemRoutes = (settings: unknown): boolean =>
    isObject(settings) && Array.isArray(settings.autoSystemRoutingTable) && settings.autoSystemRoutingTable.length > 0;

export type EffectiveOutboundsInterface =
    | { kind: 'off' }
    /** `implied` when the key is absent and the routing table is what asked for it. */
    | { kind: 'auto'; implied: boolean }
    | { kind: 'named'; name: string };

/** What the core binds Xray's own connections to once its defaults are applied. */
export const effectiveOutboundsInterface = (settings: unknown): EffectiveOutboundsInterface | undefined => {
    const choice = readOutboundsInterface(settings);
    // A wrong type fails the decode; there is no effect to describe.
    if (choice === 'wrong') return undefined;
    if (choice === 'unset') return hasSystemRoutes(settings) ? { kind: 'auto', implied: true } : { kind: 'off' };
    if (choice === 'off') return { kind: 'off' };
    if (choice === 'auto') return { kind: 'auto', implied: false };
    return { kind: 'named', name: String((settings as Json).autoOutboundsInterface) };
};

/**
 * The value to write for a choice; `undefined` removes the key. "Not set" and
 * "off" are different things and stay different here: off is the empty
 * string, which a form that drops empty values has to be told to keep.
 */
export const outboundsInterfaceValue = (
    choice: 'unset' | 'auto' | 'off' | 'named',
    name = '',
): string | undefined => {
    switch (choice) {
        case 'unset':
            return undefined;
        case 'auto':
            return AUTO_OUTBOUNDS_INTERFACE;
        case 'off':
            return '';
        case 'named':
            // A name being typed is not "off" while it is still empty.
            return name === '' ? undefined : name;
    }
};
