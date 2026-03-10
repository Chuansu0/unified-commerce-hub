/**
 * Chat 服務 - 使用 PocketBase SDK + OpenClaw Agent
 */
import pb from './pocketbase';
import { callOpenClaw } from './api';
import { loadAISettings, getActiveAISource } from './aiSettings';

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

    // 取得 AI 回覆
    let response = '';

    try {
        const settings = loadAISettings();
        const source = getActiveAISource(settings);

        if (source === 'openclaw') {
            // 呼叫 OpenClaw Agent
            const clawRes = await callOpenClaw(
                {
                    userId: user.id,
                    message: message,
                    context: {
                        telegramChatId: '-1003806455231',
                        platform: 'web',
                        conversationId: conversationId,
                    },
                },
                settings
            );
            response = clawRes.reply;
        } else if (source === 'llm') {
            // 使用 LLM 作為 fallback
            const systemPrompt = settings.openclaw?.systemPrompt ||
                '你是 NeoVega 的智慧客服助理，擅長回答商品與訂單相關問題。請使用繁體中文回覆。';
            // 這裡簡化處理，實際 LLM 呼叫由 useChat hook 處理
            response = '您好！我是 NeoVega 客服助理，請問有什麼可以幫您的嗎？';
        }
    } catch (error) {
        console.error('AI 服務呼叫失敗:', error);
        // 失敗時返回預設訊息
        response = '抱歉，目前客服系統忙碌中，請稍後再試。';
    }

    // 儲存 AI 回覆
    if (response) {
        await pb.collection('messages').create({
            conversation: conversationId,
            channel: 'web',
            sender: 'assistant',
            content: response,
        });
    }

    return { response };
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