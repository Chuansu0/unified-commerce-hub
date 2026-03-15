# Webhook 橋接實施計畫

## 目標
解決 Telegram bot 無法讀取其他 bot 訊息的限制，透過 Webhook 橋接實現 bot 之間的互動。

## 架構設計

```
Telegram Group
    ↓
Bot A (OpenClaw) 發送訊息
    ↓
Webhook Bridge Service (監聽 Bot A)
    ↓
轉發到 Bot B (Andrea/Umio)
    ↓
Bot B 處理並回應
    ↓
Webhook Bridge 接收回應
    ↓
透過 Bot A 發送回 Telegram Group
```

## 實施階段

### 階段 1：建立 Webhook Bridge Service ✅ 進行中

**1.1 建立服務結構**
- 建立 `webhook-bridge/` 目錄
- 設定 TypeScript 專案
- 安裝必要套件

**1.2 核心功能**
- 監聽 Bot A 的訊息事件
- 訊息格式轉換
- 轉發到 Bot B
- 接收 Bot B 回應
- 回傳到原始對話

### 階段 2：整合現有服務

**2.1 與 n8n 整合**
- 建立 webhook-bridge workflow
- 處理訊息路由
- 記錄到 PocketBase

**2.2 與 Telegram bots 整合**
- 配置 OpenClaw bot webhook
- 配置 Andrea/Umio bot API
- 設定訊息轉發規則

### 階段 3：測試與部署

**3.1 單元測試**
- 訊息接收測試
- 格式轉換測試
- 轉發邏輯測試

**3.2 整合測試**
- Bot A → Bridge → Bot B 流程
- 錯誤處理測試
- 效能測試

**3.3 部署**
- Zeabur 部署配置
- 環境變數設定
- 監控和日誌

## 技術規格

### Webhook Bridge Service

**技術棧：**
- Node.js + TypeScript
- Express.js (HTTP server)
- Telegraf (Telegram bot framework)
- Axios (HTTP client)

**API 端點：**
```
POST /webhook/openclaw     # 接收 OpenClaw bot 訊息
POST /webhook/andrea       # 接收 Andrea bot 回應
POST /webhook/umio         # 接收 Umio bot 回應
GET  /health               # 健康檢查
```

**環境變數：**
```
OPENCLAW_BOT_TOKEN=xxx
ANDREA_BOT_TOKEN=xxx
UMIO_BOT_TOKEN=xxx
BRIDGE_WEBHOOK_SECRET=xxx
N8N_WEBHOOK_URL=xxx
POCKETBASE_URL=xxx
```

## 訊息流程

### 1. OpenClaw 發送訊息
```json
{
  "message_id": 123,
  "chat_id": -100123456789,
  "from": { "id": 111, "username": "openclaw_bot" },
  "text": "@andrea_bot 請幫我處理訂單",
  "timestamp": "2026-03-15T12:00:00Z"
}
```

### 2. Bridge 轉換並轉發
```json
{
  "original_message_id": 123,
  "original_chat_id": -100123456789,
  "target_bot": "andrea",
  "text": "請幫我處理訂單",
  "context": {
    "from_bot": "openclaw",
    "conversation_id": "conv_001"
  }
}
```

### 3. Andrea 回應
```json
{
  "response_to": 123,
  "text": "訂單已處理完成",
  "status": "success"
}
```

### 4. Bridge 發送回 Telegram
```json
{
  "chat_id": -100123456789,
  "reply_to_message_id": 123,
  "text": "訂單已處理完成"
}
```

## 下一步行動

1. ✅ 建立 webhook-bridge 服務結構
2. ⏳ 實施核心轉發邏輯
3. ⏳ 整合 n8n workflow
4. ⏳ 測試端到端流程
5. ⏳ 部署到 Zeabur

---
建立時間：2026-03-15
狀態：進行中
