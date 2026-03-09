# 🚀 Telegram 整合快速開始

你的 Telegram Bot 已經建立完成！現在只需要幾個步驟就能啟用。

## Bot 資訊

- **Bot 名稱**: insforge
- **Bot 用戶名**: @neovegainsforge_bot
- **Token**: `8092224802:AAHlz9w0Qw7rYWfhK6aDQE1pRzHY6XiIrgY`

---

## 步驟 1：安裝依賴

```bash
cd backend
npm install
```

---

## 步驟 2：執行資料庫 Migration

```bash
node db/migrate-telegram.js
```

這會建立 Telegram 整合所需的資料表。

---

## 步驟 3：配置環境變數

在 Zeabur 或 `backend/.env` 中設置：

```env
TELEGRAM_BOT_TOKEN=8092224802:AAHlz9w0Qw7rYWfhK6aDQE1pRzHY6XiIrgY
TELEGRAM_WEBHOOK_URL=https://你的網域.zeabur.app/api/telegram/webhook
OPENCLAW_AGENT_URL=http://localhost:3000/api/agent
```

---

## 步驟 4：部署到 Zeabur

1. 提交代碼到 Git
2. 推送到 GitHub
3. Zeabur 會自動部署

---

## 步驟 5：設置 Webhook

部署完成後，執行：

```bash
node backend/setup-telegram-webhook.js 你的網域.zeabur.app
```

或者直接在瀏覽器訪問：

```
https://api.telegram.org/bot8092224802:AAHlz9w0Qw7rYWfhK6aDQE1pRzHY6XiIrgY/setWebhook?url=https://你的網域.zeabur.app/api/telegram/webhook
```

---

## 步驟 6：測試綁定

1. **在網頁登入**
   - 訪問你的網站並登入

2. **進入設定頁面**
   - 點擊側邊欄的「設定」

3. **生成綁定碼**
   - 在「Telegram 綁定」區塊點擊「生成綁定碼」
   - 會顯示類似 `BIND-ABC123` 的綁定碼

4. **在 Telegram 綁定**
   - 在 Telegram 搜尋 `@neovegainsforge_bot`
   - 發送：`/start BIND-ABC123`（替換為你的綁定碼）
   - Bot 會回覆「✅ 綁定成功！」

5. **測試對話**
   - 在 Telegram 發送訊息給 Bot
   - 在網頁 Chat 也發送訊息
   - 兩邊的對話應該會同步

---

## 驗證設置

### 檢查 Webhook 狀態

```bash
curl https://api.telegram.org/bot8092224802:AAHlz9w0Qw7rYWfhK6aDQE1pRzHY6XiIrgY/getWebhookInfo
```

應該看到：
```json
{
  "ok": true,
  "result": {
    "url": "https://你的網域.zeabur.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 常見問題

### Q: Bot 不回應

檢查：
1. Webhook 是否正確設置（使用上面的 curl 命令）
2. Backend 日誌是否有錯誤
3. 環境變數是否正確設置

### Q: 綁定失敗

確認：
1. 用戶已登入網頁
2. 綁定碼未過期（10分鐘有效期）
3. 綁定碼輸入正確

---

## 下一步

完成設置後，你可以：
- 自訂 OpenClaw agent 的回應邏輯
- 在 `backend/services/openclawService.js` 中調整 AI 行為
- 查看對話歷史和分析客戶互動

詳細文件請參考 `TELEGRAM_SETUP.md`。

祝你使用愉快！🎉
