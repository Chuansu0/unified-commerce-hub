/**
 * Telegram 綁定服務 - 使用 PocketBase SDK
 */
import pb from './pocketbase';

export interface BindCodeResponse {
    code: string;
    expiresAt: string;
}

export interface BindStatusResponse {
    bound: boolean;
    telegramUsername?: string;
    boundAt?: string;
}

export async function generateBindCode(_token: string): Promise<BindCodeResponse> {
    const user = pb.authStore.model;
    if (!user) throw new Error('請先登入');

    // 產生隨機綁定碼
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BIND-';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pb.collection('telegram_bind_codes').create({
        user: user.id,
        bind_code: code,
        expires_at: expiresAt,
        used: false,
    });

    return { code, expiresAt };
}

export async function checkBindStatus(_token: string): Promise<BindStatusResponse> {
    const user = pb.authStore.model;
    if (!user) return { bound: false };

    try {
        const record = await pb.collection('users').getOne(user.id);
        const r = record as Record<string, unknown>;
        return {
            bound: !!r.telegram_user_id,
            telegramUsername: r.telegram_username as string | undefined,
            boundAt: r.telegram_bound_at as string | undefined,
        };
    } catch {
        return { bound: false };
    }
}

export async function sendToOpenClaw(params: {
    message: string;
    userId?: string;
    sessionId?: string;
}): Promise<void> {
    const response = await fetch('/api/send-to-openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error('發送訊息到 OpenClaw 失敗');
    }
}

/**
 * 訂閱 OpenClaw 回覆
 * @param sessionId - 用戶 ID 或訪客 session ID
 * @param onReply - 收到回覆時的回調函數
 * @returns 取消訂閱函數
 */
export async function subscribeToReplies(sessionId: string, onReply: (message: string) => void): Promise<() => void> {
    console.log(`[subscribeToReplies] Subscribing for session: ${sessionId}`);

    const unsubscribe = await pb.collection('messages').subscribe('*', (e) => {
        if (e.action === 'create' && e.record.sender === 'assistant') {
            pb.collection('conversations')
                .getOne(e.record.conversation)
                .then((conversation: Record<string, unknown>) => {
                    // 【修改】支援訪客：通過 user ID 或 guest_session_id 匹配
                    const conversationUser = conversation.user as string;
                    const conversationGuestSession = conversation.guest_session_id as string;
                    const conversationPlatform = conversation.platform as string;

                    // 檢查是否匹配：用戶 ID 或訪客 session ID
                    const isUserMatch = conversationUser === sessionId;
                    const isGuestMatch = conversationGuestSession === sessionId ||
                        conversationGuestSession === sessionId.replace('guest:', '');
                    const isPlatformMatch = conversationPlatform === 'webchat';

                    if ((isUserMatch || isGuestMatch) && isPlatformMatch) {
                        console.log(`[subscribeToReplies] Received reply for session ${sessionId}`);
                        onReply(e.record.content as string);
                    }
                })
                .catch(console.error);
        }
    });

    return unsubscribe;
}
