# Umio WebChat V7 部署指南

## 問題修復說明

**問題**: n8n Code 節點出現 `Task request timed out after 60 seconds`

**原因**: `$input.first()` 語法在 n8n 2.3.6 可能導致 task runner 問題

**解決方案**: 改用 `items[0].json` 語法（更穩定）

## 部署步驟

### 1. 等待 Zeabur 自動部署

nginx.conf 已更新指向 `umio-chat-v7`，等待自動部署完成。

### 2. 匯入 n8n Workflow

1. 登入 n8n: https://n8n-2h8x.onrender.com
2. 開啟 **Workflows** → **Add workflow**
3. 點選 **Import from file**
4. 選擇 `n8n/webchat-umio-simple-v7.json`
5. 點選 **Save** 並啟用 (toggle 開關)

### 3. 取得 Webhook URL

匯入後，點選 **Webhook** 節點，複製 Production URL：
```
https://n8n-2h8x.onrender.com/webhook/umio-chat-v7
```

### 4. 測試

使用 PowerShell 測試：

```powershell
$body = @{
    message = "測試中文訊息"
    sessionId = "test-123"
    context = @{
        platform = "webchat"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://unified-commerce-hub-tw-ca92ybxz-ogti5ng4.zeabur.app/api/umio/chat" `
    -Method POST `
    -ContentType "application/json; charset=utf-8" `
    -Body $body
```

或直接測試 n8n webhook：

```powershell
$body = @{
    message = "測試中文訊息"
    sessionId = "test-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://n8n-2h8x.onrender.com/webhook/umio-chat-v7" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## 變更摘要

| 檔案 | 變更 |
|------|------|
| `n8n/webchat-umio-simple-v7.json` | 新增 V7 workflow |
| `nginx.conf` | 更新 `/api/umio/chat` 指向 v7 |

## Code Node 差異

### V6 (舊版 - 會 timeout)
```javascript
const input = $input.first().json;
```

### V7 (新版 - 穩定)
```javascript
const input = items[0].json;
```

## 預期結果

✅ WebChat 訊息成功轉發到 Telegram
✅ 中文訊息正確顯示
✅ 無 timeout 錯誤
