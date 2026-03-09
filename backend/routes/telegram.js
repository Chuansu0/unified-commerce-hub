/**
 * Telegram Webhook 路由
 */
const express = require("express");
const router = express.Router();
const telegramService = require("../services/telegramService");
const telegramBindService = require("../services/telegramBindService");
const conversationService = require("../services/conversationService");
const openclawService = require("../services/openclawService");

/**
 * Telegram Webhook 端點
 */
router.post("/webhook", async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.text) {
            return res.sendStatus(200);
        }

        const chatId = message.chat.id;
        const text = message.text.trim();
        const telegramUserId = message.from.id;
        const telegramUsername = message.from.username || message.from.first_name;

        // 處理 /start 命令（綁定流程）
        if (text.startsWith("/start")) {
            const parts = text.split(" ");
            if (parts.length === 2 && parts[1].startsWith("BIND-")) {
                const bindCode = parts[1];
                const result = await telegramBindService.verifyAndBind(
                    bindCode,
                    telegramUserId,
                    telegramUsername
                );

                if (result.success) {
                    await telegramService.sendMessage(
                        chatId,
                        "✅ 綁定成功！\n\n現在你可以在這裡與我對話，所有訊息都會與網頁同步。"
                    );
                } else {
                    await telegramService.sendMessage(chatId, `❌ 綁定失敗：${result.error}`);
                }
                return res.sendStatus(200);
            }

            await telegramService.sendMessage(
                chatId,
                "👋 歡迎！\n\n請先在網頁登入並獲取綁定碼，然後使用 /start BIND-XXXXXX 來綁定帳號。"
            );
            return res.sendStatus(200);
        }

        // 處理一般訊息
        const user = await telegramBindService.findUserByTelegramId(telegramUserId);

        if (!user) {
            await telegramService.sendMessage(
                chatId,
                "⚠️ 請先綁定帳號。\n\n請在網頁登入並獲取綁定碼，然後使用 /start BIND-XXXXXX 來綁定。"
            );
            return res.sendStatus(200);
        }

        const conversationId = await conversationService.getOrCreateConversation(user.id);

        await conversationService.saveMessage(conversationId, "telegram", "user", text);

        const history = await conversationService.getConversationHistory(conversationId, 10);

        const response = await openclawService.callOpenClaw(user.id, text, history);

        await conversationService.saveMessage(conversationId, "telegram", "assistant", response);

        await telegramService.sendMessage(chatId, response);

        return res.sendStatus(200);
    } catch (err) {
        console.error("[Telegram] Webhook 處理失敗:", err);
        return res.sendStatus(500);
    }
});

module.exports = router;
