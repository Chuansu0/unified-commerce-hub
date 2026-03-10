/**
 * Chat 服務 - 使用 PocketBase SDK
 */
import pb from './pocketbase';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    channel?: 'web' | 'telegram';
    created_at?: string;
}

export interface SendMessageResponse {
    response: string;
}

export interface ChatHistoryResponse {
    history: ChatMessage[];
}

export async function sendChatMessage(_token: string, message: string): Promise<SendMessageResponse> {
    const user = pb.authStore.model;
    if (!user) throw new Error('請先登入');

    // 取得或建立 conversation
    let conversationId: string;
    try {
        const existing = await pb.collection('conversations').getFirstListItem(
            `user = "${user.id}"`,
            { sort: '-created' }
        );
        conversationId = existing.id;
    } catch {
        const created = await pb.collection('conversations').create({
            user: user.id,
            platform: 'web',
            status: 'active',
        });
        conversationId = created.id;
    }

    // 儲存使用者訊息
    await pb.collection('messages').create({
        conversation: conversationId,
        channel: 'web',
        sender: 'user',
        content: message,
    });

    // 更新 conversation
    await pb.collection('conversations').update(conversationId, {
        last_message_at: new Date().toISOString(),
        last_message: message.substring(0, 200),
    });

    // 注意：AI 回覆需要由外部 AI 服務處理，這裡先回傳 placeholder
    // 實際應用中應透過 api.ts 的 callOpenClaw 或 callLLM 來取得回覆
    return { response: '' };
}

export async function getChatHistory(_token: string): Promise<ChatHistoryResponse> {
    const user = pb.authStore.model;
    if (!user) return { history: [] };

    try {
        const conversation = await pb.collection('conversations').getFirstListItem(
            `user = "${user.id}"`,
            { sort: '-created' }
        );
        const result = await pb.collection('messages').getList(1, 50, {
            filter: `conversation = "${conversation.id}"`,
            sort: '-created',
        });

        const history: ChatMessage[] = result.items.reverse().map(item => {
            const r = item as Record<string, unknown>;
            return {
                role: (r.sender as string) === 'user' ? 'user' : 'assistant',
                content: r.content as string,
                channel: r.channel as 'web' | 'telegram' | undefined,
                created_at: item.created,
            };
        });

        return { history };
    } catch {
        return { history: [] };
    }
}