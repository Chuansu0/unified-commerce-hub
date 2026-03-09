import { config } from "./config";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    channel?: "web" | "telegram";
    created_at?: string;
}

export interface SendMessageResponse {
    response: string;
}

export interface ChatHistoryResponse {
    history: ChatMessage[];
}

function getBaseUrl(): string {
    const url = config.auth?.apiUrl;
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
    }
    return url;
}

export async function sendChatMessage(token: string, message: string): Promise<SendMessageResponse> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/chat/send`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "發送訊息失敗");
    return data.data;
}

export async function getChatHistory(token: string): Promise<ChatHistoryResponse> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "獲取歷史失敗");
    return data.data;
}
