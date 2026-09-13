import type { RemnawaveProfile } from '../types/remnawave.types';
import type { SnippetDefinition } from '../snippets';
import type { PanelHost } from '../generators/client-outbound';

export class RemnawaveClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(url: string) {
        this.baseUrl = url.replace(/\/$/, '');
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            cache: 'no-cache',
            ...options,
            headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
        });

        const text = await res.text();

        // Empty body is only a legitimate "no content" response when the
        // request actually succeeded. A failed request (5xx/4xx) with an
        // empty body — e.g. a proxy timeout or a server crash — must still
        // surface as an error, not be swallowed into `null` and reported as
        // success by callers like saveToRemnawave().
        if (!res.ok) {
            let errorMsg = res.statusText || 'Unknown error';
            if (text && text.trim() !== '') {
                try {
                    const data = JSON.parse(text);
                    errorMsg = data.message || data.error || errorMsg;
                } catch {
                    // Non-JSON error body (e.g. an HTML error page from a proxy) — fall back to statusText.
                }
            }
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }

        if (res.status === 204 || res.status === 304) return null;
        if (!text || text.trim() === '') return null;

        try {
            return JSON.parse(text);
        } catch {
            throw new Error(`Invalid JSON received from API (${res.status})`);
        }
    }

    async login(username: string, password: string): Promise<string> {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        if (data.response?.accessToken) return data.response.accessToken;
        throw new Error('AccessToken not found in response');
    }

    async getConfigProfiles(): Promise<RemnawaveProfile[]> {
        const data = await this.request('/api/config-profiles');
        return data.response?.configProfiles || [];
    }

    async getConfigProfile(uuid: string): Promise<unknown> {
        const data = await this.request(`/api/config-profiles/${uuid}`);
        return data.response?.config || null;
    }

    async updateConfigProfile(uuid: string, config: unknown): Promise<void> {
        await this.request('/api/config-profiles', {
            method: 'PATCH',
            body: JSON.stringify({ uuid, config }),
        });
    }

    /**
     * Hosts are the panel's client-facing view of an inbound: which public
     * address, port, SNI and transport params a client should use for it.
     * Pairing a host with the inbound it points at (from getConfigProfiles's
     * `inbounds[].rawInbound`) is what lets a client outbound be derived from
     * a server config. Returns the array as-is; the shape is documented in
     * core/generators/client-outbound.
     */
    async getHosts(): Promise<PanelHost[]> {
        const data = await this.request('/api/hosts');
        const list = data?.response;
        return Array.isArray(list) ? list : [];
    }

    /**
     * Create a host. `inbound` binds it to a config-profile inbound; the
     * optional `xrayJsonTemplateUuid` is what turns a host into the entry
     * point of a whole generated config.
     *
     * A tag is sent under both `tag` and `tags` on purpose: older panels take
     * a single string, newer ones an array, and each silently drops the field
     * it does not know. Sending both keeps this working across versions.
     */
    async createHost(payload: Record<string, unknown>): Promise<any> {
        const data = await this.request('/api/hosts', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return data?.response || null;
    }

    async updateHost(payload: Record<string, unknown> & { uuid: string }): Promise<any> {
        const data = await this.request('/api/hosts', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return data?.response || null;
    }

    // ─── Subscription templates ──────────────────────────────────────────
    // An XRAY_JSON template is the config the panel renders for a subscriber,
    // with hosts injected into it. A host points at one via its
    // `xrayJsonTemplateUuid`, which is how a single visible entry can hand a
    // client a whole balanced config.

    async getSubscriptionTemplates(): Promise<any[]> {
        const data = await this.request('/api/subscription-templates');
        const list = data?.response;
        if (Array.isArray(list)) return list;
        return list?.templates || [];
    }

    /** The list endpoint omits template bodies; fetch one to get its JSON. */
    async getSubscriptionTemplate(uuid: string): Promise<any> {
        const data = await this.request(`/api/subscription-templates/${uuid}`);
        return data?.response || null;
    }

    async createSubscriptionTemplate(name: string, templateType = 'XRAY_JSON'): Promise<any> {
        const data = await this.request('/api/subscription-templates', {
            method: 'POST',
            body: JSON.stringify({ name, templateType }),
        });
        return data?.response || null;
    }

    /**
     * Patch a template. XRAY_JSON templates carry `templateJson`; the YAML
     * kinds (Clash, Stash, Mihomo, Singbox) carry `encodedTemplateYaml`, a
     * base64 string — pass whichever the template actually uses.
     */
    async updateSubscriptionTemplate(
        uuid: string,
        patch: { templateJson?: unknown; encodedTemplateYaml?: string; name?: string }
    ): Promise<any> {
        const data = await this.request('/api/subscription-templates', {
            method: 'PATCH',
            body: JSON.stringify({ uuid, ...patch }),
        });
        return data?.response || null;
    }

    async deleteSubscriptionTemplate(uuid: string): Promise<void> {
        await this.request(`/api/subscription-templates/${uuid}`, { method: 'DELETE' });
    }

    // ─── Snippets ────────────────────────────────────────────────────────
    // Reusable blocks a config profile references as { "snippet": "NAME" };
    // the panel splices the body in before pushing a config to a node.
    // Contract: GET/POST/PATCH/DELETE all live on the same /api/snippets
    // path (name goes in the body, not the URL), and every write answers
    // with the full list. Snippets were added in a later panel release, so
    // an older panel answers 404 here — callers must treat that as
    // "unsupported", not as an outage.

    async getSnippets(): Promise<SnippetDefinition[]> {
        const data = await this.request('/api/snippets');
        const list = data?.response?.snippets || [];
        return list.map((s: any) => ({
            name: s.name,
            snippet: Array.isArray(s.snippet) ? s.snippet : [],
            source: 'panel' as const,
        }));
    }

    async createSnippet(name: string, snippet: unknown[]): Promise<void> {
        await this.request('/api/snippets', {
            method: 'POST',
            body: JSON.stringify({ name, snippet }),
        });
    }

    async updateSnippet(name: string, snippet: unknown[]): Promise<void> {
        await this.request('/api/snippets', {
            method: 'PATCH',
            body: JSON.stringify({ name, snippet }),
        });
    }

    async deleteSnippet(name: string): Promise<void> {
        await this.request('/api/snippets', {
            method: 'DELETE',
            body: JSON.stringify({ name }),
        });
    }

    /**
     * Push a snippet's current body into every config profile referencing it.
     * Nodes using those profiles are restarted by the panel as a result, so
     * this is never called implicitly — only from an explicit user action.
     */
    async syncSnippet(name: string): Promise<void> {
        await this.request('/api/snippets/actions/sync', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }
}
