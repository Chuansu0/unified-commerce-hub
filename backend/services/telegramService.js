/**
 * Telegram Bot API 服務
 */
const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * 發送訊息到 Telegram
 */
async function sendMessage(chatId, text, options = {}) {
    try {
        const response = await axios.post(`${API_BASE}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: options.parseMode || "Markdown",
            reply_to_message_id: options.replyToMessageId,
            ...options,
        });
        return response.data.result;
    } catch (error) {
        console.error("[Telegram] 發送訊息失敗:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 設置 Webhook
 */
async function setWebhook(url) {
    try {
        const response = await axios.post(`${API_BASE}/setWebhook`, {
            url,
            allowed_updates: ["message"],
        });
        console.log("[Telegram] Webhook 設置成功:", url);
        return response.data;
    } catch (error) {
        console.error("[Telegram] Webhook 設置失敗:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 獲取 Bot 資訊
 */
async function getMe() {
    try {
        const response = await axios.get(`${API_BASE}/getMe`);
        return response.data.result;
    } catch (error) {
        console.error("[Telegram] 獲取 Bot 資訊失敗:", error.message);
        throw error;
    }
}

module.exports = {
    sendMessage,
    setWebhook,
    getMe,
};
