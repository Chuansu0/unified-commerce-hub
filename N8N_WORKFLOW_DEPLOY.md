# n8n Workflow 部署說明

## 重要提醒：PowerShell 編碼問題

⚠️ **如果你看到 `message:????` 或 `userName:????`**，這是 **PowerShell 編碼問題**，不是 n8n workflow 的問題！

**根因**: Windows PowerShell 預設使用 Big5/ANSI 編碼，導致中文字元傳輸時變成問號。

**解決方案**:
1. 使用提供的 UTF-8 測試腳本: `.\test-umio-webhook-fixed.ps1`
2. 或使用 curl 發送請求
3. 或將中文字元轉為 UTF-8 bytes 後發送

## 問題修復摘要

### 問題 1: "No message content" 錯誤
**根因**: n8n webhook 節點直接檢查 `$json.body.message`，但實際接收到的資料結構可能因 n8n 版本或配置而異。

**解決方案**: 
- 新增 **Extract Data** 節點統一提取資料
- 支援多種格式：`$json.body.message`、`$json.message`、`$json.body.body.message`

### 問題 2: 重複訊息發送
**根因**: Bot Collaboration Orchestrator workflow 缺乏去重機制。

**解決方案**:
- 建立 `bot-collaboration-orchestrator-fixed.json` 加入重複檢查

## 部署步驟

### 步驟 1: 匯入新版 Workflow

1. 登入 n8n: https://n8n.neovega.cc
2. 進入 Workflow 列表
3. 點擊「Import」>「Import from File」
4. 選擇檔案: `n8n/webchat-umio-simple-v6.json` ⚠️ **使用 v6 版本**
5. 啟用 workflow

### 步驟 2: 停用舊版 Workflow

確保停用以下舊版 workflow，避免衝突：
- ❌ `webchat-umio-simple`
- ❌ `webchat-umio-simple-v2`
- ❌ `webchat-umio-simple-v3`
- ❌ `webchat-umio-simple-v4`
- ❌ `webchat-umio-simple-v5`

### 步驟 3: 測試

**重要**: 請使用提供的 UTF-8 測試腳本：

```powershell
# 使用 UTF-8 測試腳本（推薦）
.\test-umio-webhook-fixed.ps1
```

或手動測試（避免中文）：

```powershell
$body = @{
    message = "Hello from PowerShell"
    sessionId = "test-$(Get-Random)"
    context = @{
        platform = "webchat"
        userName = "Test User"
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://n8n.neovega.cc/webhook/umio-chat-v6" `
    -Method POST `
    -ContentType "application/json; charset=utf-8" `
    -Body $body

$response
```

預期回應（成功）：
```json
{
    "success": true,
    "message": "Forwarded to Umio",
    "received": "Hello from PowerShell",
    "sessionId": "test-123456"
}
```

預期回應（編碼錯誤）：
```json
{
    "success": false,
    "error": "No message",
    "debug": {
        "message": "????",
        "input": { ... }
    }
}
```

### 步驟 4: 修復 PowerShell 編碼（如需要）

如果中文變成 `????`，請：

**方法 1**: 使用 curl
```powershell
$json = '{"message":"你好","sessionId":"test-123","context":{"platform":"webchat"}}'
$json | Out-File -FilePath "test.json" -Encoding utf8
curl -X POST "https://n8n.neovega.cc/webhook/umio-chat-v6" -H "Content-Type: application/json" -d "@test.json"
```

**方法 2**: 使用 bytes
```powershell
$body = @{ message = "你好"; sessionId = "test-123" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri "https://n8n.neovega.cc/webhook/umio-chat-v6" -Method POST -ContentType "application/json" -Body $bytes
```

**方法 3**: 使用 PowerShell 7+
```powershell
# 安裝 PowerShell 7
winget install Microsoft.PowerShell

# 使用 pwsh 執行
pwsh -Command {
    $body = @{ message = "你好"; sessionId = "test-123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://n8n.neovega.cc/webhook/umio-chat-v6" -Method POST -Body $body
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
