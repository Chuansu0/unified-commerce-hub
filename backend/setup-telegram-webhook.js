/**
 * Telegram Webhook 設置腳本
 * 使用方式：node setup-telegram-webhook.js YOUR_DOMAIN
 * 範例：node setup-telegram-webhook.js your-app.zeabur.app
 */
require("dotenv").config();
const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const domain = process.argv[2];

if (!BOT_TOKEN) {
    console.error("❌ 錯誤：找不到 TELEGRAM_BOT_TOKEN 環境變數");
    console.log("請在 .env 檔案中設置 TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

if (!domain) {
    console.error("❌ 錯誤：請提供網域名稱");
    console.log("使用方式：node setup-telegram-webhook.js YOUR_DOMAIN");
    console.log("範例：node setup-telegram-webhook.js your-app.zeabur.app");
    process.exit(1);
}

const webhookUrl = `https://${domain}/api/telegram/webhook`;

async function setupWebhook() {
    try {
        console.log("🔧 設置 Telegram Webhook...");
        console.log(`Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
        console.log(`Webhook URL: ${webhookUrl}`);

        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
            {
                url: webhookUrl,
                allowed_updates: ["message"],
            }
        );

        if (response.data.ok) {
            console.log("✅ Webhook 設置成功！");
            console.log("\n下一步：");
            console.log("1. 在 Telegram 搜尋 @neovegainsforge_bot");
            console.log("2. 在網頁登入並進入設定頁面");
            console.log("3. 生成綁定碼並在 Telegram 中使用 /start BIND-XXXXXX 綁定");
        } else {
            console.error("❌ Webhook 設置失敗:", response.data);
        }
    } catch (error) {
        console.error("❌ 錯誤:", error.response?.data || error.message);
    }
}

setupWebhook();
