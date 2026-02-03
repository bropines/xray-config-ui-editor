// src/utils/remnawave-client.ts

export interface RemnawaveAuth {
    url: string;
    username: string;
    token?: string;
}

// Убедись, что здесь стоит export!
export interface RemnawaveProfile {
    uuid: string;
    name: string;
    viewPosition: number;
}

export class RemnawaveClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(url: string) {
        // Убираем слеш в конце для корректности путей
        this.baseUrl = url.replace(/\/$/, "");
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        // Обработка пустых ответов (204 No Content)
        if (res.status === 204) return null;

        const data = await res.json();

        if (!res.ok) {
            const errorMsg = data.message || data.error || "Unknown error";
            throw new Error(`API Error: ${errorMsg}`);
        }

        return data;
    }

    // 1. Логин
    async login(username: string, password: string): Promise<string> {
        const data = await this.request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        
        if (data.response && data.response.accessToken) {
            return data.response.accessToken;
        }
        throw new Error("AccessToken not found in response");
    }

    // 2. Получение всех профилей
    async getConfigProfiles(): Promise<RemnawaveProfile[]> {
        const data = await this.request("/api/config-profiles");
        return data.response?.configProfiles || [];
    }

    // 3. Получение конфига конкретного профиля
    async getConfigProfile(uuid: string): Promise<any> {
        const data = await this.request(`/api/config-profiles/${uuid}`);
        return data.response?.config || null;
    }

    // 4. Сохранение конфига в профиль
    async updateConfigProfile(uuid: string, config: any): Promise<void> {
        await this.request(`/api/config-profiles`, {
            method: "PATCH",
            body: JSON.stringify({
                uuid,
                config
            }),
        });
    }
}