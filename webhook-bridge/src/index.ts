import express from 'express';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Telegram bots - 使用 TELEGRAM_ 前綴與 Zeabur 環境變數一致
const openclawBot = new Telegraf(process.env.TELEGRAM_OPENCLAW_BOT_TOKEN!);
const andreaBot = new Telegraf(process.env.TELEGRAM_ANDREA_BOT_TOKEN!);
const umioBot = new Telegraf(process.env.TELEGRAM_UMIO_BOT_TOKEN!);

// Message queue for tracking
interface PendingMessage {
    originalMessageId: number;
    originalChatId: number;
    targetBot: string;
    timestamp: number;
}

const pendingMessages = new Map<string, PendingMessage>();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'webhook-bridge' });
});

// Receive message from OpenClaw bot
app.post('/webhook/openclaw', async (req, res) => {
    try {
        const { message_id, chat_id, text, from } = req.body;

        console.log('[OpenClaw] Received:', { message_id, chat_id, text });

        // Parse target bot from message
        let targetBot = 'andrea';
        if (text.includes('@umio')) targetBot = 'umio';
        else if (text.includes('@andrea')) targetBot = 'andrea';

        // Store pending message
        const messageKey = `${chat_id}_${message_id}`;
        pendingMessages.set(messageKey, {
            originalMessageId: message_id,
            originalChatId: chat_id,
            targetBot,
            timestamp: Date.now()
        });

        // Forward to n8n
        await axios.post(process.env.N8N_WEBHOOK_URL!, {
            conversation_id: `bridge_${chat_id}`,
            message: text,
            user_id: from.id,
            timestamp: new Date().toISOString(),
            metadata: {
                source: 'openclaw',
                target: targetBot,
                original_message_id: message_id
            }
        });

        res.json({ success: true, forwarded_to: targetBot });
    } catch (error) {
        console.error('[OpenClaw] Error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Receive response from Andrea/Umio and send back via OpenClaw
app.post('/webhook/response', async (req, res) => {
    try {
        const { chat_id, message_id, text, source_bot } = req.body;

        console.log('[Response] Received:', { chat_id, message_id, text, source_bot });

        // Validate input
        if (!chat_id || !text) {
            console.error('[Response] Missing required fields:', { chat_id, text });
            return res.status(400).json({ error: 'Missing chat_id or text' });
        }

        // Send response back to Telegram via OpenClaw bot
        const result = await openclawBot.telegram.sendMessage(chat_id, text);
        console.log('[Response] Sent successfully:', result.message_id);

        res.json({ success: true, sent: true, message_id: result.message_id });
    } catch (error: any) {
        console.error('[Response] Error:', {
            message: error.message,
            code: error.code,
            response: error.response?.data
        });
        res.status(500).json({
            error: 'Failed to send response',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🌉 Webhook Bridge running on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   POST /webhook/openclaw - Receive from OpenClaw`);
    console.log(`   POST /webhook/response - Send response back`);
    console.log(`   GET  /health - Health check`);
});
