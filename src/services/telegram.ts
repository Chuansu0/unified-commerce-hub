import { config } from "./config";

export interface BindCodeResponse {
    code: string;
    expiresAt: string;
}

export interface BindStatusResponse {
    bound: boolean;
    telegramUsername?: string;
    boundAt?: string;
}

function getBaseUrl(): string {
    const url = config.auth?.apiUrl;
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
    }
    return url;
}

export async function generateBindCode(token: string): Promise<BindCodeResponse> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/telegram-bind/generate-bind-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.data;
}

export async function checkBindStatus(token: string): Promise<BindStatusResponse> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/telegram-bind/bind-status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.data;
}
