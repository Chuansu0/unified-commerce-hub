# Umio WebChat V8 Fire-and-Forget 部署指南

## 策略變更

從 V7 的「等待 n8n 回應」改為 **Fire-and-Forget** 模式：

- **WebChat**: 發送訊息後立即返回成功（不等待 n8n）
- **n8n**: 異步處理並發送到 Telegram

## 流程圖

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  WebChat    │────▶│  PocketBase  │────▶│  User 看到  │
│  User 發送  │     │  儲存訊息    │     │  訊息已發送 │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       ▼ 非阻塞發送
┌─────────────┐
│  n8n        │────▶ Telegram
│  (異步處理) │
└─────────────┘
```

## 部署步驟

### 1. 等待 Zeabur 部署

nginx.conf 已更新，等待自動部署完成。

### 2. 匯入 n8n Workflow

1. 登入 n8n: https://n8n-2h8x.onrender.com
2. **Workflows** → **Add workflow**
3. 點選 **Import from file**
4. 選擇 `n8n/webchat-umio-simple-v8.json`
5. 點選 **Save**
6. **啟用 workflow** (toggle 開關)

### 3. 測試

```powershell
# 測試直接呼叫 n8n webhook
$body = @{
    message = "測試 Fire-and-Forget"
    sessionId = "test-fire-123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://n8n-2h8x.onrender.com/webhook/umio-chat-v8" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# 應該立即返回 ( < 1秒 )
Write-Host "Response: $response"
```

### 4. 測試 WebChat

開啟網站，在 WebChat 發送訊息：
- ✅ 訊息立即顯示「已發送」
- ✅ 訊息儲存到 PocketBase
- ✅ 異步轉發到 Telegram

## 變更摘要

| 檔案 | 變更 |
|------|------|
| `src/services/umioChat.ts` | Fire-and-Forget 模式，不等待回應 |
| `n8n/webchat-umio-simple-v8.json` | 使用 responseNode 立即回應 |
| `nginx.conf` | 指向 v8 webhook |

## V8 Workflow 特點

1. **responseNode 模式**: Webhook 節點設為 `responseMode: responseNode`
2. **立即回應**: Extract 後立即發送 RespondToWebhook
3. **並行處理**: Telegram 發送與回應並行執行

## 優點

- ⚡ 使用者體驗極快（< 100ms 回應）
- 🔄 無 timeout 風險
- 📱 Telegram 失敗不影響使用者

## 限制

- 無法在 WebChat 顯示「傳送中」狀態
- Telegram 發送失敗時使用者不會知道
