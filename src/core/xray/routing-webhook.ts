/**
 * What a routing rule's `webhook` has to be before a core will load it.
 *
 * It is an object, not a URL. The rule decodes it into
 *
 *     WebhookRuleConfig { url string; deduplication uint32; headers map[string]string }
 *
 * through a pointer (`Webhook *WebhookRuleConfig`), on every supported line:
 * v26.3.27:infra/conf/router.go:525-529 and :550, v26.7.28:infra/conf/router.go:126-130
 * and :151, v26.9.9:infra/conf/router.go:126-130 and :152, v26.10.10:infra/conf/router.go:137-141
 * and :163. The schema here used to accept a bare string as well; the core does
 * not. A string where the struct goes is an encoding/json type error, the
 * rule's decode returns it (v26.7.28:infra/conf/router.go:154-157, wrapped at
 * :282-285), and RouterConfig.Build() hands it up unchanged
 * (v26.7.28:infra/conf/router.go:101-105) — the config does not load.
 *
 * The same goes for each key inside it. `deduplication` is a uint32: a
 * string, a fraction or a negative number is the same kind of error.
 * `headers` is a map of strings (see string-map.ts).
 *
 * What the core does *not* refuse is a webhook without a `url`. It builds
 * the notifier only when the url is not empty
 * (v26.7.28:infra/conf/router.go:264, v26.3.27:infra/conf/router.go:667,
 * v26.9.9:infra/conf/router.go:269): without one the whole block is dropped,
 * and nothing is sent. That is a warning, not an error.
 */

import { t } from '../../i18n';
import { isPlainObject, previewValue, stringMapProblems } from './string-map';

export type WebhookProblemKind =
    | 'webhook.type'
    | 'webhook.url.type'
    | 'webhook.url.missing'
    | 'webhook.deduplication'
    | 'webhook.headers.type'
    | 'webhook.headers.value';

export interface WebhookProblem {
    kind: WebhookProblemKind;
    /** Where it is, from the rule down: `webhook.headers`. */
    field: string;
    /** `critical` when the config will not load; `warning` when the webhook is silently dropped. */
    severity: 'critical' | 'warning';
    message: string;
    suggestion?: string;
}

/** The biggest number a uint32 holds. */
const UINT32_MAX = 4294967295;

const isUint32 = (value: unknown): boolean =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;

/** Whether the rule has a `webhook` that is there to be read at all: absent and null are both nothing. */
export const hasWebhook = (rule: unknown): boolean =>
    isPlainObject(rule) && rule.webhook !== undefined && rule.webhook !== null;

/**
 * Everything wrong with one rule's `webhook`. Nothing for a rule without
 * one, and nothing for a snippet reference or anything else that is not a
 * rule object — callers skip those before asking.
 */
export const webhookProblems = (rule: unknown): WebhookProblem[] => {
    if (!hasWebhook(rule)) return [];
    const webhook = (rule as Record<string, unknown>).webhook;
    const problems: WebhookProblem[] = [];

    if (!isPlainObject(webhook)) {
        problems.push({
            kind: 'webhook.type',
            field: 'webhook',
            severity: 'critical',
            message: t("{what} is {value}, but Xray reads an object there. It cannot decode the rule, so the config will not load.", { what: 'webhook', value: previewValue(webhook) }),
            suggestion: typeof webhook === 'string'
                ? t("Write it as an object: {example}.", { example: `{ "url": ${JSON.stringify(webhook)} }` })
                : t("Replace it with an object that has a url, or remove it."),
        });
        return problems;
    }

    if (webhook.url !== undefined && webhook.url !== null && typeof webhook.url !== 'string') {
        problems.push({
            kind: 'webhook.url.type',
            field: 'webhook.url',
            severity: 'critical',
            message: t("{what} is {value}, but Xray reads a string there. It cannot decode the rule, so the config will not load.", { what: 'webhook.url', value: previewValue(webhook.url) }),
        });
    } else if (webhook.url === undefined || webhook.url === null || webhook.url === '') {
        problems.push({
            kind: 'webhook.url.missing',
            field: 'webhook.url',
            severity: 'warning',
            message: t("This rule's webhook has no url, so Xray builds no notification for it and nothing is sent."),
            suggestion: t("Set the url to post to, or remove the webhook."),
        });
    }

    if (webhook.deduplication !== undefined && webhook.deduplication !== null && !isUint32(webhook.deduplication)) {
        problems.push({
            kind: 'webhook.deduplication',
            field: 'webhook.deduplication',
            severity: 'critical',
            message: t("{what} is {value}, but Xray reads a whole number of seconds, zero or more. It cannot decode the rule, so the config will not load.", { what: 'webhook.deduplication', value: previewValue(webhook.deduplication) }),
        });
    }

    for (const problem of stringMapProblems(webhook.headers)) {
        if (problem.kind === 'not-object') {
            problems.push({
                kind: 'webhook.headers.type',
                field: 'webhook.headers',
                severity: 'critical',
                message: t("{what} is {value}, but Xray reads an object of header names to strings there. It cannot decode the rule, so the config will not load.", { what: 'webhook.headers', value: previewValue(problem.held) }),
                suggestion: t("Write it as an object, for example {example}.", { example: '{ "Authorization": "Bearer token" }' }),
            });
        } else {
            problems.push({
                kind: 'webhook.headers.value',
                field: 'webhook.headers',
                severity: 'critical',
                message: t("{what} gives \"{name}\" the value {value}, and header values are strings. Xray cannot decode the rule, so the config will not load.", { what: 'webhook.headers', name: problem.name, value: previewValue(problem.held) }),
                suggestion: t("Put the value in quotes."),
            });
        }
    }

    return problems;
};
