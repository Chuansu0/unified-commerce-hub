# Telegram 整合設置指南

本指南將協助你完成 Telegram Bot 與網頁 Chat 的整合設置。

## 架構概覽

```
網頁 Chat ←→ Backend API ←→ 統一對話管理 ←→ OpenClaw Agent
                ↑                ↓
         Telegram Bot ←→ InsForge Database
```

**特點**：
- 客戶可以選擇在網頁或 Telegram 中對話
- 所有對話歷史統一存儲，跨渠道同步
- OpenClaw agent 同時服務兩個渠道

---

## 第一步：建立 Telegram Bot

1. 在 Telegram 中搜尋 `@BotFather`
2. 發送 `/newbot` 命令
3. 按照提示設置 Bot 名稱和用戶名
4. 獲取 Bot Token（格式：`123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`）
5. **保存這個 Token**，稍後會用到

---

## 第二步：資料庫 Migration

在 Zeabur 或本地環境執行以下命令：

```bash
cd backend
node db/migrate-telegram.js
```

這會建立以下資料表：
- `telegram_bind_codes` - 綁定碼管理
- `conversations` - 對話記錄
- `messages` - 訊息記錄
- 並在 `users` 表中加入 Telegram 相關欄位

---

## 第三步：配置環境變數

在 Zeabur 或 `backend/.env` 中加入以下環境變數：

```env
# Telegram Bot Token（從 @BotFather 獲取）
TELEGRAM_BOT_TOKEN=你的Bot Token

# Webhook URL（你的部署網域）
TELEGRAM_WEBHOOK_URL=https://your-domain.zeabur.app/api/telegram/webhook

# OpenClaw Agent URL（如果在同一個 Zeabur 專案中）
OPENCLAW_AGENT_URL=http://localhost:3000/api/agent
```

---

## 第四步：設置 Telegram Webhook

部署完成後，需要設置 Telegram Webhook。有兩種方式：

### 方式 A：使用瀏覽器（推薦）

在瀏覽器中訪問以下 URL（替換 `YOUR_BOT_TOKEN` 和 `YOUR_DOMAIN`）：

```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/telegram/webhook
```

成功會顯示：`{"ok":true,"result":true,"description":"Webhook was set"}`

### 方式 B：使用 curl

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR_DOMAIN/api/telegram/webhook"}'
```

---

## 第五步：測試綁定流程

1. **在網頁登入**
   - 訪問你的網站並登入帳號

2. **進入設定頁面**
   - 點擊側邊欄的「設定」

3. **生成綁定碼**
   - 在「Telegram 綁定」卡片中點擊「生成綁定碼」
   - 會顯示一個類似 `BIND-ABC123` 的綁定碼

4. **在 Telegram 中綁定**
   - 在 Telegram 中搜尋你的 Bot
   - 發送：`/start BIND-ABC123`（替換為你的綁定碼）
   - Bot 會回覆「✅ 綁定成功！」

5. **測試對話**
   - 在 Telegram 中發送訊息給 Bot
   - 在網頁 Chat 中也發送訊息
   - 兩邊的對話歷史應該會同步

---

## 第六步：驗證整合

### 檢查 Backend 日誌

在 Zeabur 或本地查看 Backend 日誌，確認：
- Telegram webhook 正常接收訊息
- OpenClaw agent 正常回應
- 訊息正確存儲到資料庫

### 檢查資料庫

執行以下 SQL 查詢，確認資料正確存儲：

```sql
-- 檢查綁定狀態
SELECT id, email, telegram_username, telegram_bound_at 
FROM users 
WHERE telegram_user_id IS NOT NULL;

-- 檢查對話記錄
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;

-- 檢查訊息記錄
SELECT m.*, c.user_id 
FROM messages m 
JOIN conversations c ON m.conversation_id = c.id 
ORDER BY m.created_at DESC 
LIMIT 20;
```

---

## 常見問題

### Q1: Webhook 設置失敗

**可能原因**：
- Bot Token 錯誤
- Webhook URL 無法訪問（確認 Zeabur 部署成功）
- URL 必須使用 HTTPS

**解決方式**：
```bash
# 檢查當前 webhook 狀態
curl https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

### Q2: Bot 不回應訊息

**檢查清單**：
1. Webhook 是否正確設置
2. Backend 環境變數是否正確
3. OpenClaw agent 是否正常運作
4. 查看 Backend 日誌是否有錯誤

### Q3: 綁定碼過期

綁定碼有效期為 10 分鐘。如果過期，請重新生成。

### Q4: 對話歷史不同步

**可能原因**：
- 用戶未登入（網頁 chat 需要登入）
- Telegram 帳號未綁定
- 資料庫連線問題

---

## 架構說明

### Backend API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/telegram/webhook` | POST | 接收 Telegram 訊息 |
| `/api/telegram-bind/generate-bind-code` | POST | 生成綁定碼 |
| `/api/telegram-bind/bind-status` | GET | 檢查綁定狀態 |
| `/api/chat/send` | POST | 發送網頁訊息 |
| `/api/chat/history` | GET | 獲取對話歷史 |

### 訊息流程

**網頁 Chat**：
```
用戶輸入 → useChat hook → POST /api/chat/send 
→ conversationService → openclawService → 回應
```

**Telegram**：
```
用戶輸入 → Telegram Bot API → POST /api/telegram/webhook 
→ conversationService → openclawService → sendMessage
```

---

## 下一步

完成設置後，你可以：
1. 自訂 OpenClaw agent 的回應邏輯
2. 加入更多渠道（LINE、WhatsApp 等）
3. 實作對話分析和客戶洞察功能
4. 加入多語言支援

---

## 技術支援

如有問題，請檢查：
1. Backend 日誌（Zeabur Console）
2. 資料庫記錄
3. Telegram Bot API 狀態

祝你設置順利！🚀
