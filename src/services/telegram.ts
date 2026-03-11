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

export async function subscribeToReplies(userId: string, onReply: (message: string) => void): Promise<() => void> {
    const unsubscribe = await pb.collection('messages').subscribe('*', (e) => {
        if (e.action === 'create' && e.record.sender === 'assistant') {
            pb.collection('conversations')
                .getOne(e.record.conversation, { expand: 'user' })
                .then((conversation) => {
                    if (conversation.user === userId && conversation.platform === 'webchat') {
                        onReply(e.record.content);
                    }
                })
                .catch(console.error);
        }
    });

    return unsubscribe;
}
