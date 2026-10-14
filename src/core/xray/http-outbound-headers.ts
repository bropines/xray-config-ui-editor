/**
 * The extra headers an HTTP outbound sends to its proxy.
 *
 * `headers` is one top-level key of the outbound's settings — a
 * `map[string]string` on HTTPClientConfig, beside `address`, `port` and
 * `servers`, never inside a server entry (v26.3.27:infra/conf/http.go:53-62,
 * v26.7.28:infra/conf/http.go:58-67, v26.9.9:infra/conf/http.go:58-67,
 * v26.10.10:infra/conf/http.go:58-67), and it is read whichever of the flat
 * and the `servers` shapes the outbound uses (the loop at
 * v26.7.28:infra/conf/http.go:119-125 comes after both). The headers go on
 * the CONNECT request that opens the tunnel through the proxy
 * (v26.7.28:proxy/http/client.go:220-222, v26.9.9:proxy/http/client.go:223-225),
 * after the login's `Proxy-Authorization`, so one of that name replaces it.
 *
 * A value is a Go text/template, executed on every connection with the
 * connection's `Source` and `Target` (v26.7.28:proxy/http/client.go:166-203,
 * v26.9.9:proxy/http/client.go:166-206): plain text passes through, and a
 * value that does not parse as a template makes every connection fail.
 *
 * Nothing but the HTTP outbound reads the key — a SOCKS client config has no
 * such field, so the decoder drops it (v26.7.28:infra/conf/socks.go:77-85).
 *
 * The type is what matters here: a map of strings, so a value that is not a
 * string fails the outbound's decode and the config with it (see string-map.ts).
 */

import { t } from '../../i18n';
import { isPlainObject, previewValue, stringMapProblems } from './string-map';

export type HttpHeadersProblemKind = 'headers.type' | 'headers.value';

export interface HttpHeadersProblem {
    kind: HttpHeadersProblemKind;
    /** Where it is, from the outbound down. */
    field: 'settings.headers';
    message: string;
    suggestion?: string;
}

/** The loader lower-cases the protocol before looking it up (v26.7.28:infra/conf/loader.go:46). */
export const isHttpOutbound = (outbound: unknown): boolean =>
    isPlainObject(outbound) && typeof outbound.protocol === 'string' && outbound.protocol.toLowerCase() === 'http';

/** What the outbound's settings hold under `headers`, whatever it is. */
export const readHttpHeaders = (outbound: unknown): unknown =>
    isPlainObject(outbound) && isPlainObject(outbound.settings) ? outbound.settings.headers : undefined;

/** Everything about `settings.headers` that stops the core loading the outbound. */
export const httpHeadersProblems = (outbound: unknown): HttpHeadersProblem[] => {
    if (!isHttpOutbound(outbound)) return [];
    return stringMapProblems(readHttpHeaders(outbound)).map((problem): HttpHeadersProblem => (
        problem.kind === 'not-object'
            ? {
                kind: 'headers.type',
                field: 'settings.headers',
                message: t("{what} is {value}, but Xray reads an object of header names to strings there. It cannot decode this outbound, so the config will not load.", { what: 'settings.headers', value: previewValue(problem.held) }),
                suggestion: t("Write it as an object, for example {example}.", { example: '{ "User-Agent": "Mozilla/5.0" }' }),
            }
            : {
                kind: 'headers.value',
                field: 'settings.headers',
                message: t("{what} gives \"{name}\" the value {value}, and header values are strings. Xray cannot decode this outbound, so the config will not load.", { what: 'settings.headers', name: problem.name, value: previewValue(problem.held) }),
                suggestion: t("Put the value in quotes."),
            }
    ));
};
