# Telegram Webhook 服務部署指南

## Zeabur 部署步驟

### 1. 刪除 Grammy 模板（如有）

如果之前安裝了 Grammy 模板且出現 `ts-node: not found` 錯誤，請先刪除該服務。

### 2. 新增 Git 服務

1. 在 Zeabur Dashboard 中，選擇您的專案
2. 點擊「Add Service」→「Git」
3. 選擇 `unified-commerce-hub` 倉庫
4. **重要**：設定 Root Directory 為 `/telegram-webhook`

### 3. 設定環境變數

在 telegram-webhook 服務的「Variables」頁面新增：

```
TELEGRAM_BOT_TOKEN=8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@neovega.cc
POCKETBASE_ADMIN_PASSWORD=<您的PocketBase管理員密碼>
PORT=3000
```

### 4. 部署

點擊「Deploy」按鈕，Zeabur 會自動：
- 使用 `zbpack.json` 配置
- 執行 `npm install`
- 執行 `npm run build`
- 啟動 `node dist/index.js`

### 5. 設定 Telegram Webhook

部署成功後，執行以下命令設定 Webhook：

```bash
curl -X POST "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'
```

### 6. 驗證

```bash
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"
```

---

## 為什麼不用 Grammy 模板？

Grammy 模板的問題：
1. `ts-node` 在 `devDependencies`，生產環境找不到
2. 沒有整合 PocketBase
3. 沒有我們需要的 `/api/send-to-openclaw` 等端點

我們的 `telegram-webhook` 服務：
1. 已整合 PocketBase SDK
2. 提供完整的 API 端點
3. 支援 Web Chat → OpenClaw 通訊