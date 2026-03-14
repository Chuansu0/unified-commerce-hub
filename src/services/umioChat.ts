/**
 * Umio Chat Service - HTTP 版本
 * 透過 openclaw-http-bridge 直接與 OpenClaw 通訊
 * 無需 Telegram，直接 HTTP 同步回覆
 */

import { config } from "./config";
import pb from "./pocketbase";

// 使用 nginx 代理或直接使用 http-bridge
// 開發環境可以直接訪問 http-bridge，生產環境使用 nginx 代理
const OPENCLAW_BRIDGE_URL =
    import.meta.env.VITE_OPENCLAW_BRIDGE_URL ||
    config.umio?.httpBridgeUrl ||
    (window.location.hostname === "localhost"
        ? "https://openclaw-http-bridge.zeabur.app"
        : "/api");

export interface UmioChatRequest {
    message: string;
    sessionId: string;
    userName?: string;
    metadata?: Record<string, unknown>;
}

export interface UmioChatResponse {
    success: boolean;
    message: string;
    sessionId?: string;
}

export interface UmioMessage {
    id: string;
    sender: "user" | "assistant";
    content: string;
    created: string;
    channel: string;
}

// 儲存訂閱的回呼函數（用於 Realtime 備用方案）
const replyCallbacks = new Map<string, (message: UmioMessage) => void>();
const activeSubscriptions = new Map<string, () => void>();

/**
 * 發送訊息給 Umio (OpenClaw AI Bot)
 * 使用 HTTP 同步回覆，無需 WebSocket
 * @param message 使用者訊息
 * @param sessionId 會話 ID
 * @param userName 用戶名稱（可選）
 * @param metadata 額外資訊（可選）
 * @returns 發送結果
 */
export async function sendToUmio(
    message: string,
    sessionId: string,
    userName?: string,
    metadata?: Record<string, unknown>
): Promise<UmioChatResponse> {
    console.log(`[UmioChat] Sending message: "${message.substring(0, 50)}..." to session: ${sessionId}`);

    try {
        // 儲存用戶訊息到 PocketBase
        await saveUserMessage(sessionId, message, userName, metadata);

        // 呼叫 OpenClaw HTTP Bridge
        const response = await fetch(`${OPENCLAW_BRIDGE_URL}/api/umio/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                sessionId,
                context: {
                    userName,
                    platform: "webchat",
                    ...metadata
                }
            })
        });

        console.log(`[UmioChat] Response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[UmioChat] HTTP error:`, errorData);
            throw new Error(
                errorData.error || `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data = await response.json();
        console.log(`[UmioChat] Response data:`, data);

        if (!data.success) {
            throw new Error(data.error || "Unknown error");
        }

        // 儲存 AI 回覆到 PocketBase
        await saveAssistantMessage(sessionId, data.response);

        return {
            success: true,
            message: data.response,
            sessionId: data.sessionId || sessionId
        };
    } catch (error) {
        console.error("[UmioChat] Error:", error);

        // 提供友善的錯誤訊息
        if (error instanceof Error) {
            if (error.message.includes("Failed to fetch")) {
                return {
                    success: false,
                    message: "無法連接到 Umio 服務，請檢查網路連線。"
                };
            }
            if (error.message.includes("timeout")) {
                return {
                    success: false,
                    message: "Umio 回應時間過長，請稍後再試。"
                };
            }
            return {
                success: false,
                message: `Umio 服務錯誤: ${error.message}`
            };
        }

        return {
            success: false,
            message: "Umio 暫時無法回應，請稍後再試。"
        };
    }
}

/**
 * 儲存用戶訊息到 PocketBase
 * 暫時跳過 - 等待 PocketBase 權限設定
 */
async function saveUserMessage(
    sessionId: string,
    content: string,
    _userName?: string,
    _metadata?: Record<string, unknown>
): Promise<void> {
    // TODO: 重新啟用 PocketBase 儲存（設定 API 規則後）
    console.log(`[UmioChat] Skipping PocketBase save (guest mode) for session ${sessionId}`);
    return;
}

/**
 * 儲存 AI 回覆到 PocketBase
 */
async function saveAssistantMessage(
    sessionId: string,
    content: string
): Promise<void> {
    try {
        // 查找對話
        const conversation = await pb
            .collection("conversations")
            .getFirstListItem(`guest_session_id = "${sessionId}" && platform = "umio"`)
            .catch(() => null);

        if (!conversation) {
            console.warn(`[UmioChat] Conversation not found for ${sessionId}`);
            return;
        }

        // 儲存訊息
        await pb.collection("messages").create({
            conversation: conversation.id,
            sender: "assistant",
            channel: "openclaw",
            content: content,
            metadata: {
                agent: "umio",
                source: "openclaw-http-bridge"
            }
        });

        // 更新對話
        await pb.collection("conversations").update(conversation.id, {
            last_message: content,
            last_message_at: new Date().toISOString()
        });

        console.log(`[UmioChat] Saved assistant reply to conversation ${conversation.id}`);
    } catch (error) {
        console.error("[UmioChat] Error saving assistant message:", error);
        // 不影響主流程
    }
}

/**
 * 查找或建立對話
 */
async function getOrCreateConversation(sessionId: string): Promise<{ id: string }> {
    try {
        const conversation = await pb
            .collection("conversations")
            .getFirstListItem(`guest_session_id = "${sessionId}" && platform = "umio"`);
        return conversation;
    } catch {
        // 建立新對話
        const conversation = await pb.collection("conversations").create({
            guest_session_id: sessionId,
            platform: "umio",
            status: "active"
        });
        console.log(`[UmioChat] Created new conversation: ${conversation.id}`);
        return conversation;
    }
}

/**
 * 訂閱 Umio 的回覆訊息（透過 PocketBase Realtime）
 * 備用方案：當需要非同步接收回覆時使用
 * @param sessionId 會話 ID
 * @param callback 收到新訊息時的回呼
 * @returns 取消訂閱函數
 */
export function subscribeToUmioReplies(
    sessionId: string,
    callback: (message: UmioMessage) => void
): () => void {
    console.log(`[subscribeToReplies] Subscribing for session: ${sessionId}`);

    // 儲存回呼
    replyCallbacks.set(sessionId, callback);

    // 啟動 PocketBase Realtime 訂閱
    startPocketBaseSubscription(sessionId);

    // 返回取消訂閱函數
    return () => {
        console.log(`[subscribeToReplies] Unsubscribing for session: ${sessionId}`);
        replyCallbacks.delete(sessionId);
        stopPocketBaseSubscription(sessionId);
    };
}

/**
 * 啟動 PocketBase Realtime 訂閱
 */
async function startPocketBaseSubscription(sessionId: string): Promise<void> {
    try {
        console.log(`[UmioChat] Starting subscription for session: ${sessionId}`);

        // 等待 conversation 建立（最多重試 10 次）
        let conversation: { id: string } | null = null;
        let retries = 0;
        const maxRetries = 10;

        while (!conversation && retries < maxRetries) {
            try {
                conversation = await pb
                    .collection("conversations")
                    .getFirstListItem(`guest_session_id = "${sessionId}" && platform = "umio"`);
                console.log(`[UmioChat] Found conversation: ${conversation.id}`);
            } catch {
                retries++;
                console.log(`[UmioChat] Conversation not found, retry ${retries}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!conversation) {
            console.error(`[UmioChat] Failed to find conversation for ${sessionId} after ${maxRetries} retries`);
            return;
        }

        // 訂閱 messages collection
        const unsubscribe = await pb.collection("messages").subscribe("*", (e) => {
            console.log(`[UmioChat] Received event: ${e.action}`, e.record);

            if (e.action === "create") {
                const message = e.record as unknown as {
                    id: string;
                    conversation: string;
                    sender: string;
                    content: string;
                    channel: string;
                    created: string;
                };

                // 檢查是否為目標對話的回覆
                if (message.conversation === conversation?.id && message.sender === "assistant") {
                    console.log(`[UmioChat] Got assistant reply: ${message.content.substring(0, 50)}...`);

                    const cb = replyCallbacks.get(sessionId);
                    if (cb) {
                        cb({
                            id: message.id,
                            sender: "assistant",
                            content: message.content,
                            created: message.created,
                            channel: message.channel
                        });
                    }
                }
            }
        });

        // 儲存取消訂閱函數
        activeSubscriptions.set(sessionId, unsubscribe);

        console.log(`[UmioChat] Subscribed to replies for session ${sessionId}`);
    } catch (error) {
        console.error(`[UmioChat] Subscription error for ${sessionId}:`, error);
    }
}

/**
 * 停止 PocketBase Realtime 訂閱
 */
function stopPocketBaseSubscription(sessionId: string): void {
    const unsubscribe = activeSubscriptions.get(sessionId);
    if (unsubscribe) {
        try {
            unsubscribe();
        } catch (e) {
            console.error(`[UmioChat] Error unsubscribing:`, e);
        }
        activeSubscriptions.delete(sessionId);
        console.log(`[UmioChat] Unsubscribed from session ${sessionId}`);
    }
}

/**
 * 取得對話歷史
 * @param sessionId 會話 ID
 * @returns 訊息列表
 */
export async function getUmioConversation(
    sessionId: string
): Promise<UmioMessage[]> {
    try {
        // 查找對話
        const conversation = await pb
            .collection("conversations")
            .getFirstListItem(`guest_session_id = "${sessionId}" && platform = "umio"`)
            .catch(() => null);

        if (!conversation) {
            return [];
        }

        // 取得訊息
        const messages = await pb.collection("messages").getFullList({
            filter: `conversation = "${conversation.id}"`,
            sort: "created"
        });

        return messages.map(m => ({
            id: m.id,
            sender: m.sender as "user" | "assistant",
            content: m.content,
            created: m.created,
            channel: m.channel
        }));
    } catch (error) {
        console.error("[UmioChat] Error getting conversation:", error);
        return [];
    }
}

/**
 * 檢查 OpenClaw Bridge 健康狀態
 */
export async function checkUmioHealth(): Promise<{
    ok: boolean;
    error?: string;
}> {
    try {
        const response = await fetch(`${OPENCLAW_BRIDGE_URL}/health`);

        if (!response.ok) {
            return { ok: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return {
            ok: data.status === "ok"
        };
    } catch (error) {
        console.error("[UmioChat] Health check failed:", error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

/**
 * 同步發送訊息並等待回覆（推薦使用）
 * 直接使用 HTTP，無需訂閱
 */
export async function chatWithUmio(
    message: string,
    sessionId: string,
    userName?: string,
    metadata?: Record<string, unknown>
): Promise<string> {
    const result = await sendToUmio(message, sessionId, userName, metadata);
    return result.success ? result.message : result.message;
}

/**
 * 創建會話並取得 sessionId
 * 用於初始化新的對話
 */
export async function createUmioSession(): Promise<string> {
    return `umio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 儲存用戶訊息到 PocketBase（啟用版本）
 * 在 PocketBase 權限設定後可以使用
 */
export async function saveUserMessageEnabled(
    sessionId: string,
    content: string,
    userName?: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    try {
        const conversation = await getOrCreateConversation(sessionId);

        await pb.collection("messages").create({
            conversation: conversation.id,
            sender: "user",
            channel: "webchat",
            content: content,
            metadata: {
                userName,
                platform: "webchat",
                ...metadata
            }
        });

        await pb.collection("conversations").update(conversation.id, {
            last_message: content,
            last_message_at: new Date().toISOString()
        });

        console.log(`[UmioChat] Saved user message to conversation ${conversation.id}`);
    } catch (error) {
        console.error("[UmioChat] Error saving user message:", error);
        // 不影響主流程
    }
}
