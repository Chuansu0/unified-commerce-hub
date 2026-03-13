// Umio Chat Service - Direct HTTP connection to OpenClaw Umio Agent
// Bypass n8n, direct WebSocket connection through HTTP Bridge

import { config } from "./config";

const UMIO_HTTP_BRIDGE_URL =
    import.meta.env.VITE_UMIO_HTTP_BRIDGE_URL ||
    config.umio?.httpBridgeUrl ||
    "https://openclaw-http-bridge.zeabur.app/api/umio/chat";

export interface UmioChatRequest {
    message: string;
    sessionId: string;
    context?: Record<string, unknown>;
}

export interface UmioChatResponse {
    success: boolean;
    response: string;
    sessionId: string;
    agent: string;
    timestamp: string;
    error?: string;
}

/**
 * 發送訊息給 Umio Agent，直接透過 HTTP Bridge 連接 OpenClaw
 * @param message 使用者訊息
 * @param sessionId 會話 ID (通常使用 user.id)
 * @returns Umio 的回覆
 */
export async function sendToUmio(
    message: string,
    sessionId: string
): Promise<string> {
    try {
        const response = await fetch(UMIO_HTTP_BRIDGE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                sessionId,
                context: {
                    platform: "webchat",
                    timestamp: new Date().toISOString(),
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error || `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data: UmioChatResponse = await response.json();

        if (!data.success || !data.response) {
            throw new Error(data.error || "Invalid response from Umio");
        }

        return data.response;
    } catch (error) {
        console.error("[UmioChat] Error:", error);

        // 提供友善的錯誤訊息
        if (error instanceof Error) {
            if (error.message.includes("timeout")) {
                return "抱歉，Umio 回應時間過長，請稍後再試。";
            }
            if (error.message.includes("Failed to fetch")) {
                return "抱歉，無法連接到 Umio 服務，請檢查網路連線。";
            }
            return `Umio 服務錯誤: ${error.message}`;
        }

        return "抱歉，Umio 暫時無法回應，請稍後再試。";
    }
}

/**
 * 檢查 Umio HTTP Bridge 健康狀態
 */
export async function checkUmioHealth(): Promise<{
    ok: boolean;
    status?: string;
    endpoints?: string[];
}> {
    try {
        // 從 URL 推導 health endpoint
        const baseUrl = UMIO_HTTP_BRIDGE_URL.replace("/api/umio/chat", "");
        const healthUrl = `${baseUrl}/health`;

        const response = await fetch(healthUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            return { ok: false };
        }

        const data = await response.json();
        return {
            ok: true,
            status: data.status,
            endpoints: data.endpoints,
        };
    } catch (error) {
        console.error("[UmioChat] Health check failed:", error);
        return { ok: false };
    }
}
