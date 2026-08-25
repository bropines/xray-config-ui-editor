import type { RemnawaveProfile } from '../types/remnawave.types';

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
}
