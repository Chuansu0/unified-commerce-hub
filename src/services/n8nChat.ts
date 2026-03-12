/**
 * n8n Chat Service
 * 用於將 WebChat 訊息發送到 n8n Webhook 處理
 */

const N8N_WEBHOOK_URL = '/api/webhook/chat-inbound';
const USE_N8N = import.meta.env.VITE_USE_N8N === 'true';

export interface ChatMessage {
    sessionId: string;
    message: string;
    platform?: string;
}

export interface ChatResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * 發送訊息到 n8n webhook
 */
export async function sendMessageToN8n(
    data: ChatMessage
): Promise<ChatResponse> {
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: data.sessionId,
                message: data.message,
                platform: data.platform || 'webchat',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to send message to n8n:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown error',
        };
    }
}

/**
 * 檢查是否使用 n8n 模式
 */
export function isN8NEnabled(): boolean {
    return USE_N8N;
}

/**
 * 切換模式（開發測試用）
 */
export function setN8NMode(enabled: boolean): void {
    // 在生產環境中，這應該從環境變數或後端配置讀取
    localStorage.setItem('use_n8n', String(enabled));
}

/**
 * 獲取當前模式
 */
export function getCurrentMode(): 'n8n' | 'legacy' {
    const stored = localStorage.getItem('use_n8n');
    if (stored) {
        return stored === 'true' ? 'n8n' : 'legacy';
    }
    return USE_N8N ? 'n8n' : 'legacy';
}
