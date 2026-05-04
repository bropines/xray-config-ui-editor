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
            ...options,
            headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
        });

        if (res.status === 204) return null;

        const data = await res.json();

        if (!res.ok) {
            const errorMsg = data.message || data.error || 'Unknown error';
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }

        return data;
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
