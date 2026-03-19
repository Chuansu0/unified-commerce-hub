# n8n Workflow 部署說明

## 問題修復摘要

### 問題 1: "No message content" 錯誤
**根因**: n8n webhook 節點直接檢查 `$json.body.message`，但實際接收到的資料結構可能因 n8n 版本或配置而異。

**解決方案**: 
- 新增 **Extract Data** 節點統一提取資料
- 支援兩種格式：`$json.body.message` 和 `$json.message`

### 問題 2: 重複訊息發送
**根因**: Bot Collaboration Orchestrator workflow 缺乏去重機制。

**解決方案**:
- 建立 `bot-collaboration-orchestrator-fixed.json` 加入重複檢查

## 部署步驟

### 步驟 1: 匯入新版 Workflow

1. 登入 n8n: https://n8n-9m9kfdy0q-pr7yhkckog.us-west-1.svcs.zeabur.net
2. 進入 Workflow 列表
3. 點擊「Import」>「Import from File」
4. 選擇檔案: `n8n/webchat-umio-simple-v4.json`
5. 啟用 workflow

### 步驟 2: 停用舊版 Workflow

確保停用以下舊版 workflow，避免衝突：
- ❌ `webchat-umio-simple`
- ❌ `webchat-umio-simple-v2`
- ❌ `webchat-umio-simple-v3`

### 步驟 3: 測試

**重要**: PowerShell 預設編碼可能導致中文變成 `????`，請使用提供的測試腳本：

```powershell
# 使用測試腳本（已處理 UTF-8 編碼）
.\test-umio-webhook.ps1

# 或手動測試（使用 ASCII 訊息避免編碼問題）
$body = @{
    message = "Hello from PowerShell"
    sessionId = "test-$(Get-Random)"
    context = @{
        platform = "webchat"
        userName = "Test User"
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://n8n.neovega.cc/webhook/umio-chat" `
    -Method POST `
    -ContentType "application/json; charset=utf-8" `
    -Body $body

$response
```

預期回應：
```json
{
    "success": true,
    "message": "Message forwarded to Umio",
    "received": "測試訊息"
}
```

## 前端程式碼變更

前端 `umioChat.ts` 已支援同步/非同步混合模式：

```typescript
// 同步發送，等待回覆
const result = await sendToUmio(message, sessionId);

// 如果回覆是 placeholder，自動切換到訂閱模式
if (result.message === "Message forwarded to Umio") {
    // 啟用 PocketBase Realtime 訂閱等待實際回覆
}
```

## 驗證檢查清單

- [ ] n8n webhook 回應 HTTP 200
- [ ] 回應包含 `success: true`
- [ ] Telegram 群組收到訊息
- [ ] PocketBase 儲存用戶訊息
- [ ] WebChat 顯示正確狀態

## 回滾計畫

如遇問題，可快速回滾：
1. 停用 `webchat-umio-simple-v4`
2. 啟用 `webchat-umio-simple-v3`
3. 確認功能正常

## 相關檔案

- Workflow: `n8n/webchat-umio-simple-v4.json`
- 前端服務: `src/services/umioChat.ts`
- 前端 Hook: `src/hooks/useUmioChat.ts`
