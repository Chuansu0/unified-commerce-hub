/**
 * Umio Webhook Handler
 * 直接與 neovegaumio_bot 通訊，無需 OpenClaw
 *
 * 流程：
 * 1. Webchat 發送訊息 -> POST /api/send-to-umio
 * 2. 服務發送訊息到 Telegram (neovegaumio_bot 監聽的群組/私聊)
 * 3. Umio 回覆訊息 -> Telegram Webhook -> POST /webhook/telegram
 * 4. 服務將回覆存入 PocketBase
 * 5. Webchat 訂閱 PocketBase Realtime 接收回覆
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import PocketBase from "pocketbase";

// 載入環境變數
dotenv.config();

// 環境變數
const PORT = process.env.PORT || 3000;
const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://pocketbase-convo.zeabur.internal:8090";
const UMIO_BOT_TOKEN = process.env.UMIO_BOT_TOKEN || "";
const UMIO_CHAT_ID = process.env.UMIO_CHAT_ID || ""; // neovegaumio_bot 監聽的 chat
const TELEGRAM_API = `https://api.telegram.org/bot${UMIO_BOT_TOKEN}`;

// PocketBase 客戶端
const pb = new PocketBase(POCKETBASE_URL);

// Express 應用
const app = express();

// 中介軟體
app.use(cors());
app.use(express.json());

// 日誌中介軟體
app.use((req: Request, _res: Response, next: NextFunction) => {
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

interface PocketBaseConversation {
    id: string;
    user?: string;
    platform: string;
    status: string;
    last_message?: string;
    last_message_at?: string;
    guest_session_id?: string;
    telegram_chat_id?: string;
    [Key: string]: unknown;
}

interface PocketBaseMessage {
    id: string;
    conversation: string;
    sender: string;
    channel: string;
    content: string;
    [Key: string]: unknown;
}

// ============================================
// 健康檢查端點
// ============================================
app.get("/health", async (_req: Request, res: Response) => {
    try {
        await pb.health.check();
        res.json({
            status: "ok",
            pocketbase: "connected",
            telegram: !!UMIO_BOT_TOKEN,
            chat_id: !!UMIO_CHAT_ID,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: "error",
            pocketbase: "disconnected",
            telegram: !!UMIO_BOT_TOKEN,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// Telegram Webhook 端點 - 接收 Umio 的回覆
// ============================================
app.post("/webhook/telegram", async (req: Request, res: Response) => {
    try {
        const update: TelegramUpdate = req.body;
        console.log("[Umio Webhook] Received update:", JSON.stringify(update, null, 2));

        if (update.message) {
            await handleUmioReply(update.message);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("[Umio Webhook] Error:", error);
        res.sendStatus(500);
    }
});

/**
 * 處理 Umio 的回覆訊息
 */
async function handleUmioReply(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text || "";
    const sender = message.from;

    // 只處理來自 Umio Chat 的訊息
    if (chatId.toString() !== UMIO_CHAT_ID) {
        console.log(`[Umio] Ignoring message from chat ${chatId}, expected ${UMIO_CHAT_ID}`);
        return;
    }

    // 排除 Bot 自己發送的訊息（避免循環）
    if (sender?.is_bot) {
        console.log("[Umio] Ignoring bot's own message");
        return;
    }

    console.log(`[Umio Reply] From ${sender?.first_name || "Umio"}: ${text}`);

    // 從 reply_to_message 找出對應的 session
    let sessionId: string | null = null;

    if (message.reply_to_message?.text) {
        const originalText = message.reply_to_message.text;
        // 尋找 [Session:xxx] 標記
        const sessionMatch = originalText.match(/\[Session:([^\]]+)\]/);
        if (sessionMatch) {
            sessionId = sessionMatch[1];
            console.log(`[Umio] Found sessionId from reply: ${sessionId}`);
        }
    }

    // 如果沒有找到 sessionId，嘗試從訊息文字中尋找
    if (!sessionId) {
        const sessionMatch = text.match(/\[Session:([^\]]+)\]/);
        if (sessionMatch) {
            sessionId = sessionMatch[1];
            console.log(`[Umio] Found sessionId from message: ${sessionId}`);
        }
    }

    if (!sessionId) {
        console.log("[Umio] No sessionId found, storing as general message");
        // 沒有 sessionId，可以選擇存入一個通用對話或忽略
        sessionId = "general";
    }

    // 清理回覆文字（移除 session 標記）
    const cleanReply = text.replace(/\[Session:[^\]]+\]\s*/g, "").trim();

    if (!cleanReply) {
        console.log("[Umio] Empty reply after cleaning");
        return;
    }

    // 儲存到 PocketBase
    try {
        // 查找或建立對話
        let conversation: PocketBaseConversation | null = null;

        try {
            conversation = await pb.collection("conversations").getFirstListItem<PocketBaseConversation>(
                `guest_session_id = "${sessionId}" && platform = "umio"`
            );
        } catch {
            // 建立新對話
            conversation = await pb.collection("conversations").create<PocketBaseConversation>({
                guest_session_id: sessionId,
                platform: "umio",
                status: "active",
                telegram_chat_id: chatId.toString()
            });
            console.log(`[Umio] Created conversation: ${conversation.id}`);
        }

        // 儲存回覆訊息
        await pb.collection("messages").create({
            conversation: conversation.id,
            sender: "assistant", // Umio 作為 AI 助理
            channel: "telegram",
            content: cleanReply,
            metadata: {
                from: sender?.first_name || "Umio",
                username: sender?.username,
                original_message_id: message.message_id
            }
        });

        // 更新對話
        await pb.collection("conversations").update(conversation.id, {
            last_message: cleanReply,
            last_message_at: new Date().toISOString()
        });

        console.log(`[Umio] Saved reply to conversation ${conversation.id}`);

    } catch (error) {
        console.error("[Umio] Error saving reply:", error);
    }
}

// ============================================
// Webchat -> Umio API
// ============================================

/**
 * 發送訊息到 Telegram (Umio)
 */
async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "HTML"
            })
        });

        const result = await response.json() as { ok: boolean; description?: string };

        if (!result.ok) {
            console.error("[Umio] Failed to send message:", result);
            throw new Error(result.description || "Unknown error");
        }

        console.log(`[Umio] Sent message to chat ${chatId}`);
    } catch (error) {
        console.error("[Umio] Error sending message:", error);
        throw error;
    }
}

/**
 * Webchat 發送訊息給 Umio
 */
app.post("/api/send-to-umio", async (req: Request, res: Response) => {
    try {
        const { message, sessionId, userName, metadata } = req.body;

        if (!message) {
            res.status(400).json({ error: "Missing message" });
            return;
        }

        if (!sessionId) {
            res.status(400).json({ error: "Missing sessionId" });
            return;
        }

        if (!UMIO_CHAT_ID) {
            res.status(500).json({ error: "UMIO_CHAT_ID not configured" });
            return;
        }

        console.log(`[Webchat->Umio] Session ${sessionId}: ${message}`);

        // 格式化訊息（包含 sessionId 以便回覆時識別）
        const formattedMessage = formatMessageForUmio({
            message,
            sessionId,
            userName,
            metadata
        });

        // 發送給 Umio
        await sendTelegramMessage(UMIO_CHAT_ID, formattedMessage);

        // 儲存到 PocketBase
        try {
            // 查找或建立對話
            let conversation: PocketBaseConversation | null = null;

            try {
                conversation = await pb.collection("conversations").getFirstListItem<PocketBaseConversation>(
                    `guest_session_id = "${sessionId}" && platform = "umio"`
                );
            } catch {
                conversation = await pb.collection("conversations").create<PocketBaseConversation>({
                    guest_session_id: sessionId,
                    platform: "umio",
                    status: "active",
                    telegram_chat_id: UMIO_CHAT_ID
                });
                console.log(`[Webchat->Umio] Created conversation: ${conversation.id}`);
            }

            // 儲存用戶訊息
            await pb.collection("messages").create({
                conversation: conversation.id,
                sender: "user",
                channel: "web",
                content: message,
                metadata: {
                    userName,
                    ...metadata
                }
            });

            // 更新對話
            await pb.collection("conversations").update(conversation.id, {
                last_message: message,
                last_message_at: new Date().toISOString()
            });

        } catch (pbError) {
            console.error("[Webchat->Umio] PocketBase error:", pbError);
            // 不影響主流程
        }

        res.json({
            success: true,
            message: "Message sent to Umio"
        });

    } catch (error) {
        console.error("[Webchat->Umio] Error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

/**
 * 格式化訊息給 Umio
 */
function formatMessageForUmio(params: {
    message: string;
    sessionId: string;
    userName?: string;
    metadata?: Record<string, unknown>;
}): string {
    const { message, sessionId, userName, metadata } = params;

    // 第一行：Session 標記（讓 Umio 知道這是哪個對話）
    let formatted = `<b>[Session:${sessionId}]</b>\n\n`;

    // 用戶資訊
    if (userName) {
        formatted += `<b>👤 用戶:</b> ${userName}\n`;
    }

    // 元數據
    if (metadata && Object.keys(metadata).length > 0) {
        formatted += `<b>📋 資訊:</b>\n`;
        Object.entries(metadata).forEach(([Key, value]) => {
            formatted += `• ${Key}: ${value}\n`;
        });
        formatted += "\n";
    }

    // 訊息內容
    formatted += `<b>💬 訊息:</b>\n${message}`;

    return formatted;
}

// ============================================
// 取得對話歷史
// ============================================
app.get("/api/conversations/:sessionId", async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // 查找對話
        const conversation = await pb.collection("conversations").getFirstListItem<PocketBaseConversation>(
            `guest_session_id = "${sessionId}" && platform = "umio"`
        );

        // 取得訊息
        const messages = await pb.collection("messages").getFullList<PocketBaseMessage>({
            filter: `conversation = "${conversation.id}"`,
            sort: "created"
        });

        res.json({
            success: true,
            conversation: {
                id: conversation.id,
                sessionId: conversation.guest_session_id,
                status: conversation.status,
                lastMessage: conversation.last_message,
                lastMessageAt: conversation.last_message_at
            },
            messages: messages.map(m => ({
                id: m.id,
                sender: m.sender,
                channel: m.channel,
                content: m.content,
                created: m.created
            }))
        });

    } catch (error) {
        console.error("[Umio] Error getting conversation:", error);
        res.status(404).json({
            success: false,
            error: "Conversation not found"
        });
    }
});

// ============================================
// 錯誤處理
// ============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Umio] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// ============================================
// 啟動伺服器
// ============================================
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🤖 Umio Webhook Handler`);
    console.log(`=================================`);
    console.log(`Port: ${PORT}`);
    console.log(`PocketBase: ${POCKETBASE_URL}`);
    console.log(`Umio Bot: ${UMIO_BOT_TOKEN ? "已設定" : "未設定"}`);
    console.log(`Umio Chat ID: ${UMIO_CHAT_ID || "未設定"}`);
    console.log(`=================================`);
});
