# Umio V10 部署指南

## 問題背景

V9 workflow 在 n8n 上運行時遇到 **Task Runner 超時錯誤**（60 秒無法匹配 runner）。這是 n8n 基礎設施問題，不是 workflow 設計問題。

## 解決方案

**V10 版本移除所有 Code 節點**，改用純 HTTP Request + Set 節點，避免 Task Runner 依賴。

## 部署步驟

### 1. 導入 V10 Workflow

1. 開啟 n8n 儀表板
2. 點擊 **Add Workflow** → **Import from File**
3. 選擇 `webchat-umio-simple-v10.json`
4. 啟動 workflow（開關切到 ON）

### 2. 測試 Webhook

```bash
curl -X POST "https://your-n8n-domain/webhook/umio-chat-v10" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "conversationId": "test-conv-456",
    "message": "你好，Umio",
    "context": {
      "platform": "umio",
      "chatId": "test-123"
    }
  }'
```

### 3. 部署 Nginx

Zeabur 會自動偵測 `nginx.conf` 變更並重新部署。如需手動觸發：
- Zeabur Dashboard → 您的服務 → Redeploy

### 4. 測試完整流程

```bash
# 從前端發送訊息到 Umio
curl -X POST "https://your-domain/api/umio/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "web-user-123",
    "conversationId": "conv-xyz",
    "message": "推薦一款保養品"
  }'
```

## V10 Workflow 架構

```
[Webhook: umio-chat-v10] 
    ├──→ [Respond to Webhook] (立即回應 200 OK)
    └──→ [Set: Prepare Request] → [HTTP: Call OpenClaw] 
        → [Set: Extract Reply] → [HTTP: Save to PocketBase]
```

### 節點說明

| 節點 | 類型 | 功能 |
|------|------|------|
| Umio Chat Webhook | Webhook | 接收前端 POST 請求 |
| Immediate Response | Respond to Webhook | 立即回傳 200 OK（fire-and-forget）|
| Prepare Request | Set | 提取並整理請求參數 |
| Call OpenClaw | HTTP Request | 呼叫 OpenClaw API 取得回覆 |
| Extract Reply | Set | 從 OpenClaw 回應中提取文字 |
| Save to PocketBase | HTTP Request | 儲存回覆到 messages 集合 |

## 優點

1. **無 Code 節點**：避免 Task Runner 超時問題
2. **更簡單**：僅 6 個節點，易於維護
3. **更穩定**：不依賴 n8n 的 Code 執行環境
4. **執行更快**：無需等待 Task Runner 分配

## 與 V9 差異

| 項目 | V9 | V10 |
|------|-----|-----|
| Code 節點 | 2 個 | 0 個 |
| 節點總數 | 8 個 | 6 個 |
| Task Runner 依賴 | 是 | 否 |
| 穩定性 | 受 Runner 影響 | 更穩定 |

## 故障排除

### OpenClaw 回覆格式不正確

如果 OpenClaw 回傳的格式與預期不同，請檢查：
1. OpenClaw webhook URL 是否正確
2. 回覆中是否有 `text`、`response` 或 `message` 欄位

### PocketBase 儲存失敗

檢查：
1. messages 集合欄位：`conversation` (relation), `sender`, `channel`, `content`
2. PocketBase 服務是否運行正常

## 版本資訊

- **V10 Workflow**: `n8n/webchat-umio-simple-v10.json`
- **Nginx Config**: `nginx.conf` (已更新為 v10)
- **前端服務**: `src/services/umioChat.ts` (無需變更)
