# WebChat Umio V9 部署指南

## 問題概述

**舊版本問題：**
- `webchat-umio-simple-v8` 只將訊息轉發到 Telegram，但沒有調用 OpenClaw API
- `bot-collaboration-orchestrator` 只建立 "processing" 訊息，但沒有實際生成回覆
- 導致 WebChat 一直卡在 "umio is processing your request..."

**V9 解決方案：**
- 統一 workflow 直接調用 OpenClaw API
- Fire-and-forget 模式：立即回應前端，背景處理
- 將 Umio 回覆直接保存到 PocketBase

## 部署步驟

### 1. 匯入 n8n Workflow

1. 開啟 n8n: https://www.neovega.cc/n8n
2. 點擊左側 "Workflows"
3. 點擊右上角 "Import from File"
4. 選擇 `n8n/webchat-umio-complete-v9.json`
5. 點擊 "Save" 保存 workflow

### 2. 取得 Webhook URL

1. 開啟剛匯入的 "WebChat Umio Complete V9" workflow
2. 點擊 "Webhook" 節點
3. 在右側面板找到 "Webhook URLs"
4. 複製 **Production URL**: 
   ```
   https://www.neovega.cc/n8n/webhook/umio-chat-v9
   ```

### 3. 測試 Webhook

使用 PowerShell 測試：
```powershell
$body = @{
    message = "你好，Umio"
    sessionId = "test-session-123"
    conversationId = "0li21zuh9v0k3m7"
    context = @{
        platform = "webchat"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://www.neovega.cc/n8n/webhook/umio-chat-v9" -Method POST -Body $body -ContentType "application/json"
```

預期回應（立即）：
```json
{
  "success": true,
  "message": "Message received and processing",
  "sessionId": "test-session-123"
}
```

等待 10-30 秒後，檢查：
1. WebChat 應該收到 Umio 回覆
2. Telegram 群組應該收到通知

### 4. 更新前端程式碼

修改 `src/services/umioChat.ts`：

```typescript
// 第 3 行：更新 Webhook URL
const UMIO_API_URL = "https://www.neovega.cc/n8n/webhook/umio-chat-v9";
```

### 5. 部署前端

```bash
git add src/services/umioChat.ts n8n/webchat-umio-complete-v9.json UMIO_V9_DEPLOY.md
git commit -m "feat: Add Umio V9 workflow with OpenClaw integration

- New unified workflow directly calls OpenClaw API
- Fire-and-forget pattern for better UX
- Fixes issue where Umio never replied to messages"
git push
```

等待 Zeabur 自動部署完成。

### 6. 驗證

1. 開啟 WebChat: https://www.neovega.cc
2. 發送訊息："你好"
3. 預期結果：
   - 立即看到 "Message sent"（無 504 錯誤）
   - 10-30 秒後收到 Umio 回覆
   - Telegram 群組收到通知

## Workflow 流程圖

```
用戶發送訊息
    ↓
前端呼叫 n8n webhook (3秒超時)
    ↓
[Immediate Response] 立即回應前端
    ↓
[Call OpenClaw API] 調用 OpenClaw (45秒超時)
    ↓
[Save Reply to PocketBase] 保存回覆
    ↓
[Send to Telegram] 發送到 Telegram
    ↓
PocketBase Realtime → 前端顯示回覆
```

## 故障排除

### Webhook 返回 404
- 檢查 workflow 是否已啟用（Active）
- 確認 URL 是否正確：`/n8n/webhook/umio-chat-v9`

### OpenClaw API 超時
- OpenClaw 回應較慢時可能超過 45 秒
- 檢查 OpenClaw 服務狀態

### 沒有收到回覆
- 檢查 n8n Executions 日誌
- 確認 conversationId 是否正確
- 檢查 PocketBase messages collection

## 回滾方案

如需回滾到 V8：
1. 在 n8n 中停用 V9 workflow
2. 修改前端 `UMIO_API_URL` 回 V8 URL
3. 重新部署
