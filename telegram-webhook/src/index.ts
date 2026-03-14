import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

// 載入環境變數
dotenv.config();

// 環境變數
const PORT = process.env.PORT || 3000;
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://pocketbase-convo.zeabur.internal:8090';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw';
const OPENCLAW_CHAT_ID = process.env.OPENCLAW_CHAT_ID || '-1003806455231';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://www.neovega.cc/api/webhook';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// PocketBase 客戶端
const pb = new PocketBase(POCKETBASE_URL);

// Express 應用
const app = express();

// 中介軟體
app.use(cors());
app.use(express.json());

// 日誌中介軟體
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 型別定義
interface TelegramMessage {
    message_id: number;
    from?: {
        id: number;
        is_bot: boolean;
        first_name: string;
        last_name?: string;
        username?: string;
    };
    chat: {
        id: number;
        type: string;
    };
    date: number;
    text?: string;
    reply_to_message?: TelegramMessage;
}

interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
}

interface PocketBaseUser {
    id: string;
    telegram_user_id?: number;
    telegram_username?: string;
    telegram_bound_at?: string;
    [key: string]: unknown;
}

interface PocketBaseConversation {
    id: string;
    user: string;
    telegram_chat_id?: string;
    platform: string;
    status: string;
    last_message?: string;
    last_message_at?: string;
    guest_session_id?: string;
    [key: string]: unknown;
}

interface PocketBaseMessage {
    id: string;
    conversation: string;
    sender: string;
    channel: string;
    content: string;
    [key: string]: unknown;
}

// 健康檢查端點
app.get('/health', async (req: Request, res: Response) => {
    try {
        // 檢查 PocketBase 連線
        await pb.health.check();

        res.json({
            status: 'ok',
            pocketbase: 'connected',
            telegram: !!TELEGRAM_BOT_TOKEN,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            pocketbase: 'disconnected',
            telegram: !!TELEGRAM_BOT_TOKEN,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// Telegram Webhook 端點
app.post('/webhook/telegram', async (req: Request, res: Response) => {
    try {
        const update: TelegramUpdate = req.body;

        console.log('Received Telegram update:', JSON.stringify(update, null, 2));

        if (update.message) {
            const chatId = update.message.chat.id;

            // 檢查是否來自 OpenClaw Chat
            // 處理所有 OpenClaw Chat 的訊息（包括真人 Agent 和其他 Bot 的回覆）
            if (chatId.toString() === OPENCLAW_CHAT_ID) {
                console.log('[Routing] OpenClaw Chat message detected');
                await handleOpenClawReply(update.message);
            } else {
                console.log('[Routing] Regular user message');
                await handleIncomingMessage(update.message);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.sendStatus(500);
    }
});

// 處理收到的 Telegram 訊息
async function handleIncomingMessage(message: TelegramMessage): Promise<void> {
    if (!message.from || !message.text) {
        console.log('Ignoring message without from or text');
        return;
    }

    const telegramUserId = message.from.id;
    const telegramUsername = message.from.username || '';
    const text = message.text;
    const chatId = message.chat.id;

    console.log(`Processing message from Telegram user ${telegramUserId} (${telegramUsername}): ${text}`);

    try {
        // 1. 查找或建立綁定的用戶
        let user: PocketBaseUser | null = null;

        try {
            user = await pb.collection('users').getFirstListItem<PocketBaseUser>(
                `telegram_user_id = ${telegramUserId}`
            );
            console.log(`Found existing user: ${user.id}`);
        } catch (error) {
            // 用戶不存在，可以選擇建立或忽略
            console.log(`User with telegram_user_id ${telegramUserId} not found`);

            // 如果是 /start 命令，可以引導用戶綁定
            if (text === '/start') {
                await sendTelegramMessage(chatId,
                    '歡迎！請在網頁上登入您的帳戶，並在設定頁面綁定 Telegram 帳號以啟用同步功能。'
                );
                return;
            }

            // 未綁定用戶，忽略訊息
            return;
        }

        // 2. 查找或建立對話
        let conversation: PocketBaseConversation | null = null;

        try {
            conversation = await pb.collection('conversations').getFirstListItem<PocketBaseConversation>(
                `user = "${user.id}" && telegram_chat_id = "${chatId}"`
            );
            console.log(`Found existing conversation: ${conversation.id}`);
        } catch (error) {
            // 建立新對話
            conversation = await pb.collection('conversations').create<PocketBaseConversation>({
                user: user.id,
                telegram_chat_id: chatId.toString(),
                platform: 'telegram',
                status: 'active',
                last_message: text,
                last_message_at: new Date().toISOString()
            });
            console.log(`Created new conversation: ${conversation.id}`);
        }

        // 3. 儲存用戶訊息到 PocketBase
        const savedMessage = await pb.collection('messages').create<PocketBaseMessage>({
            conversation: conversation.id,
            sender: 'user',
            channel: 'telegram',
            content: text
        });

        console.log(`Saved message: ${savedMessage.id}`);

        // 4. 更新對話的最後訊息
        await pb.collection('conversations').update(conversation.id, {
            last_message: text,
            last_message_at: new Date().toISOString()
        });

        // 註：AI 回覆會由 OpenClaw Bot 自動處理
        // 我們在另一個 update 中接收 OpenClaw 的回覆

    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
}

// 發送訊息到 Telegram
async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        const result = await response.json() as { ok: boolean; description?: string };

        if (!result.ok) {
            console.error('Failed to send Telegram message:', result);
        } else {
            console.log(`Sent message to Telegram chat ${chatId}`);
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}

// 轉發 Web 訊息到 Telegram
async function forwardToTelegram(message: PocketBaseMessage): Promise<void> {
    try {
        // 1. 取得對話資訊
        const conversation = await pb.collection('conversations').getOne<PocketBaseConversation & { expand?: { user?: PocketBaseUser } }>(
            message.conversation,
            { expand: 'user' }
        );

        const user = conversation.expand?.user;
        const telegramChatId = conversation.telegram_chat_id;

        if (!user || !telegramChatId) {
            console.log(`User or Telegram chat ID not found for conversation ${message.conversation}`);
            return;
        }

        // 2. 透過 Telegram Bot API 發送訊息
        await sendTelegramMessage(telegramChatId, message.content);

        console.log(`Forwarded web message to Telegram: ${message.id}`);

    } catch (error) {
        console.error('Error forwarding message to Telegram:', error);
    }
}

// PocketBase 訊息訂閱（監聽 Web 訊息並轉發到 Telegram）
// 暫時跳過認證，直接啟動服務
async function subscribeToMessages(): Promise<void> {
    console.log('Skipping PocketBase subscription (no auth required for basic operation)');
    // TODO: 如果需要 Realtime 功能，稍後再添加認證
}

// 綁定 Telegram 帳號的 API 端點（供前端呼叫）
app.post('/api/bind-telegram', async (req: Request, res: Response) => {
    try {
        const { userId, telegramUserId, telegramUsername } = req.body;

        if (!userId || !telegramUserId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // 更新用戶的 Telegram 綁定資訊
        const updatedUser = await pb.collection('users').update(userId, {
            telegram_user_id: telegramUserId,
            telegram_username: telegramUsername,
            telegram_bound_at: new Date().toISOString()
        });

        res.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error('Error binding Telegram:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// 解除綁定 Telegram 帳號
app.post('/api/unbind-telegram', async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        // 清除用戶的 Telegram 綁定資訊
        const updatedUser = await pb.collection('users').update(userId, {
            telegram_user_id: null,
            telegram_username: null,
            telegram_bound_at: null
        });

        res.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error('Error unbinding Telegram:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// 取得用戶的 Telegram 綁定狀態
app.get('/api/telegram-status/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await pb.collection('users').getOne<PocketBaseUser>(userId);

        res.json({
            bound: !!user.telegram_user_id,
            telegramUsername: user.telegram_username,
            boundAt: user.telegram_bound_at
        });

    } catch (error) {
        console.error('Error getting Telegram status:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// Web Chat -> OpenClaw 通訊 API
// ============================================

// Web Chat 發送訊息到 OpenClaw（通過 Telegram）
app.post('/api/send-to-openclaw', async (req: Request, res: Response) => {
    try {
        const { message, userId, sessionId } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Missing message' });
            return;
        }

        console.log(`[WebChat->OpenClaw] User ${userId || sessionId}: ${message}`);

        // 發送訊息到 OpenClaw 監聽的 Telegram Chat
        const formattedMessage = userId
            ? `[WebChat:${userId}] ${message}`
            : `[WebChat:guest:${sessionId}] ${message}`;

        await sendTelegramMessage(OPENCLAW_CHAT_ID, formattedMessage);

        // 【新增】自動 @neovegaandrea_bot 觸發 OpenClaw 處理
        // 這樣 andrea 就會看到訊息並開始思考和指揮
        const triggerMessage = `@neovegaandrea_bot ↑ 收到 Web Chat 客服請求，請處理上述訊息`;
        await sendTelegramMessage(OPENCLAW_CHAT_ID, triggerMessage);
        console.log(`[WebChat->OpenClaw] Triggered andrea bot`);

        // 儲存發送的訊息到 PocketBase（可選）
        // 【修改】支援訪客：使用 guest_session_id 欄位而非 user
        if (userId || sessionId) {
            try {
                // 查找或建立對話
                let conversation: PocketBaseConversation | null = null;

                if (userId) {
                    // 登入用戶：通過 user ID 查詢
                    try {
                        conversation = await pb.collection('conversations').getFirstListItem<PocketBaseConversation>(
                            `user = "${userId}" && platform = "webchat"`
                        );
                    } catch {
                        conversation = await pb.collection('conversations').create<PocketBaseConversation>({
                            user: userId,
                            platform: 'webchat',
                            status: 'active',
                            last_message: message,
                            last_message_at: new Date().toISOString()
                        });
                    }
                } else {
                    // 訪客：通過 guest_session_id 查詢
                    try {
                        conversation = await pb.collection('conversations').getFirstListItem<PocketBaseConversation>(
                            `guest_session_id = "${sessionId}" && platform = "webchat"`
                        );
                    } catch {
                        conversation = await pb.collection('conversations').create<PocketBaseConversation>({
                            guest_session_id: sessionId,
                            platform: 'webchat',
                            status: 'active',
                            last_message: message,
                            last_message_at: new Date().toISOString()
                        });
                    }
                }

                // 儲存訊息
                await pb.collection('messages').create({
                    conversation: conversation.id,
                    sender: 'user',
                    channel: 'web',
                    content: message
                });

                // 更新對話
                await pb.collection('conversations').update(conversation.id, {
                    last_message: message,
                    last_message_at: new Date().toISOString()
                });
            } catch (pbError) {
                console.error('Error saving to PocketBase:', pbError);
                // 不影響主流程
            }
        }

        res.json({
            success: true,
            message: 'Message sent to OpenClaw via Telegram'
        });

    } catch (error) {
        console.error('Error sending to OpenClaw:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// 處理來自 OpenClaw 的回覆（通過 Telegram Webhook）
// 當 OpenClaw 在 Telegram 中回覆時，這個函數會被呼叫
// 注意：處理所有來自 OpenClaw Chat 的訊息（包括 Bot 和真人 Agent）
async function handleOpenClawReply(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text || '';

    // 檢查是否來自 OpenClaw 監聽的 Chat
    if (chatId.toString() !== OPENCLAW_CHAT_ID) {
        return;
    }

    // 排除 umio bot 自己發送的訊息（避免循環）
    // umio bot 的 username 是 neovegaumio_bot
    const senderUsername = message.from?.username?.toLowerCase() || '';

    // 只排除 umio bot 自己發送的訊息
    // 注意：不排除其他 bot，因為 OpenClaw 內的 AI Bot 回覆需要被處理
    if (senderUsername === 'neovegaumio_bot') {
        console.log(`[OpenClaw] Ignoring own message from umio bot`);
        return;
    }

    const senderName = message.from?.first_name || 'Agent';
    console.log(`[OpenClaw Reply] From ${senderName} (${senderUsername}): ${text}`);

    // 【修改】解析訊息格式：支援多種格式
    // 格式 A（現有）：訊息文字包含 [WebChat:userId] 或 [WebChat:guest:sessionId] 前綴
    // 格式 B（新增）：Telegram 原生 reply_to_message（直接 reply umio 的訊息）

    let userIdOrSession: string | null = null;
    let replyText = text;

    // 先檢查是否是直接 reply umio 的訊息（Telegram native reply）
    const repliedMessage = message.reply_to_message;
    if (repliedMessage?.text) {
        const originalText = repliedMessage.text;
        // 檢查被 reply 的訊息是否來自 umio bot
        const isRepliedToUmio = repliedMessage.from?.username?.toLowerCase() === 'neovegaumio_bot';

        if (isRepliedToUmio) {
            // 從原始訊息中提取 sessionId
            const webChatMatch = originalText.match(/\[WebChat:([^\]]+)\]/);
            if (webChatMatch) {
                userIdOrSession = webChatMatch[1];
                console.log(`[OpenClaw] Found sessionId from reply_to_message: ${userIdOrSession}`);
            }
        }
    }

    // 如果不是 reply 格式，檢查是否包含 [WebChat:xxx] 前綴
    if (!userIdOrSession) {
        const webChatMatch = text.match(/\[WebChat:([^\]]+)\]\s*([\s\S]*)/);
        if (webChatMatch) {
            userIdOrSession = webChatMatch[1];
            replyText = webChatMatch[2].trim();
        } else {
            console.log('[OpenClaw] No WebChat user ID found in message');
            return;
        }
    }

    // 移除可能的引用標記
    replyText = replyText.replace(/^>\s*.*\n/gm, '').trim();

    if (!replyText) {
        console.log('[OpenClaw] Empty reply text after parsing');
        return;
    }

    console.log(`[OpenClaw] Parsed userId/session: ${userIdOrSession}, reply: ${replyText.substring(0, 50)}...`);

    // 【修改】支援訪客：檢查是否為 guest session
    const isGuest = userIdOrSession.startsWith('guest:');

    // 【新增】轉發到 n8n 處理（根據 all-in-one-integration-plan）
    // n8n 會負責儲存到 PocketBase
    try {
        const n8nPayload = {
            sessionId: isGuest ? userIdOrSession.replace('guest:', '') : userIdOrSession,
            replyText: replyText,
            agentName: senderUsername.includes('umio') ? 'umio' : (senderUsername.includes('andrea') ? 'andrea' : 'openclaw'),
            timestamp: new Date().toISOString(),
            isGuest: isGuest,
            originalMessageId: message.message_id,
            senderName: senderName
        };

        console.log('[N8N] Forwarding reply to n8n webhook:', n8nPayload);

        const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}/umio-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload)
        });

        if (!n8nResponse.ok) {
            console.error(`[N8N] Failed to forward to n8n: ${n8nResponse.status}`);
        } else {
            const n8nResult = await n8nResponse.json();
            console.log('[N8N] Successfully forwarded to n8n:', n8nResult);
        }
    } catch (n8nError) {
        console.error('[N8N] Error forwarding to n8n:', n8nError);
        // 繼續執行本地儲存作為 fallback
    }

    // 【Fallback】本地儲存回覆到 PocketBase
    try {
        let conversation: PocketBaseConversation | null = null;

        if (isGuest) {
            // 訪客：通過 guest_session_id 查詢
            const guestSessionId = userIdOrSession.replace('guest:', '');
            try {
                conversation = await pb.collection('conversations').getFirstListItem<PocketBaseConversation>(
                    `guest_session_id = "${guestSessionId}" && platform = "webchat"`
                );
                console.log(`[OpenClaw] Found guest conversation: ${conversation.id}`);
            } catch {
                console.log(`[OpenClaw] Guest conversation not found for ${guestSessionId}, creating new one`);
                conversation = await pb.collection('conversations').create<PocketBaseConversation>({
                    guest_session_id: guestSessionId,
                    platform: 'webchat',
                    status: 'active',
                    last_message: replyText,
                    last_message_at: new Date().toISOString()
                });
                console.log(`[OpenClaw] Created guest conversation: ${conversation.id}`);
            }
        } else {
            // 登入用戶：通過 user ID 查詢
            try {
                conversation = await pb.collection('conversations').getFirstListItem<PocketBaseConversation>(
                    `user = "${userIdOrSession}" && platform = "webchat"`
                );
                console.log(`[OpenClaw] Found user conversation: ${conversation.id}`);
            } catch {
                console.log(`[OpenClaw] User conversation not found for ${userIdOrSession}, creating new one`);
                conversation = await pb.collection('conversations').create<PocketBaseConversation>({
                    user: userIdOrSession,
                    platform: 'webchat',
                    status: 'active',
                    last_message: replyText,
                    last_message_at: new Date().toISOString()
                });
                console.log(`[OpenClaw] Created user conversation: ${conversation.id}`);
            }
        }

        // 儲存回覆訊息
        await pb.collection('messages').create({
            conversation: conversation.id,
            sender: 'assistant',
            channel: 'telegram',
            content: replyText
        });

        // 更新對話
        await pb.collection('conversations').update(conversation.id, {
            last_message: replyText,
            last_message_at: new Date().toISOString()
        });

        console.log(`[OpenClaw] Saved reply to conversation ${conversation.id}`);

    } catch (error) {
        console.error('[OpenClaw] Error handling OpenClaw reply:', error);
    }
}

// 錯誤處理中介軟體
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Telegram Webhook Handler running on port ${PORT}`);
    console.log(`PocketBase URL: ${POCKETBASE_URL}`);
    console.log(`Telegram Bot Token configured: ${!!TELEGRAM_BOT_TOKEN}`);

    // 啟動 PocketBase 訂閱
    subscribeToMessages();
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    pb.collection('messages').unsubscribe();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    pb.collection('messages').unsubscribe();
    process.exit(0);
});
