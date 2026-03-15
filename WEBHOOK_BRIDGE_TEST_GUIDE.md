# Webhook Bridge 整合測試指南

## 測試目標

驗證 Webhook Bridge 能夠成功實現 bot 之間的訊息轉發，繞過 Telegram 的 bot 訊息過濾限制。

## 測試環境準備

### 1. 確認服務運行

```powershell
# 檢查 Webhook Bridge
Invoke-WebRequest -Uri "https://webhook-bridge.neovega.cc/health"

# 檢查 n8n
Invoke-WebRequest -Uri "https://n8n.neovega.cc/health"

# 檢查 PocketBase
Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/health"
```

### 2. 匯入 n8n Workflows

需要匯入以下 workflows：
- ✅ `message-router-workflow-simple.json` (已完成)
- ⏳ `webhook-bridge-response-workflow.json` (新增)

## 測試場景

### 場景 1：基礎訊息轉發

**目標：** 驗證 OpenClaw bot 發送的訊息能被轉發到 n8n

**步驟：**

1. 模擬 OpenClaw bot 發送訊息：
```powershell
$body = @{
    message_id = 123
    chat_id = -100123456789
    text = "@andrea 請處理訂單"
    from = @{
        id = 111
        username = "openclaw_bot"
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://webhook-bridge.neovega.cc/webhook/openclaw" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

2. 檢查回應：
```json
{
  "success": true,
  "forwarded_to": "andrea"
}
```

3. 驗證 n8n 收到訊息：
   - 登入 n8n
   - 查看 Message Router workflow 執行記錄
   - 確認有新的執行記錄

4. 驗證 PocketBase 記錄：
```powershell
Invoke-WebRequest -Uri "https://pocketbase.neovega.cc/api/collections/agent_workflows/records"
```

**預期結果：**
- ✅ Webhook Bridge 回應成功
- ✅ n8n workflow 執行成功
- ✅ PocketBase 建立新記錄

### 場景 2：回應訊息發送

**目標：** 驗證 bot 回應能透過 Bridge 發送回 Telegram

**步驟：**

1. 模擬 bot 回應：
```powershell
$body = @{
    chat_id = -100123456789
    message_id = 123
    text = "訂單已處理完成"
    source_bot = "andrea"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://webhook-bridge.neovega.cc/webhook/response" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

2. 檢查回應：
```json
{
  "success": true,
  "sent": true
}
```

3. 驗證 Telegram 訊息：
   - 檢查 Telegram 群組
   - 確認 OpenClaw bot 發送了回應訊息
   - 確認訊息回覆到原始訊息

**預期結果：**
- ✅ Bridge 回應成功
- ✅ Telegram 收到訊息
- ✅ 訊息正確回覆

### 場景 3：端到端整合測試

**目標：** 驗證完整的訊息流程

**流程：**
```
Telegram Group
    ↓
OpenClaw bot 發送 "@andrea 測試"
    ↓
Webhook Bridge 接收
    ↓
轉發到 n8n Message Router
    ↓
n8n 處理並呼叫 Andrea bot
    ↓
Andrea bot 回應
    ↓
n8n 發送回應到 Bridge
    ↓
Bridge 透過 OpenClaw bot 發送回 Telegram
```

**執行測試腳本：**
```powershell
# 完整測試腳本
.\test-webhook-bridge-e2e.ps1
```

## 監控和除錯

### 查看日誌

**Webhook Bridge 日誌：**
```bash
# Zeabur 控制台 → webhook-bridge → Logs
```

**n8n 執行記錄：**
```
https://n8n.neovega.cc/workflow/[workflow-id]/executions
```

### 常見問題

**1. 訊息未轉發**
- 檢查 Webhook Bridge 是否運行
- 確認 bot token 正確
- 查看 Bridge 日誌

**2. n8n workflow 失敗**
- 檢查 Message Router workflow 配置
- 確認 PocketBase collection 存在
- 查看 n8n 執行日誌

**3. 回應未送達**
- 確認 chat_id 正確
- 檢查 bot 權限
- 驗證 Telegram API 連線

## 成功標準

- ✅ 所有測試場景通過
- ✅ 訊息轉發延遲 < 2 秒
- ✅ 錯誤率 < 1%
- ✅ 日誌記錄完整

## 下一步

完成測試後：
1. 部署到生產環境
2. 配置監控告警
3. 建立運維文件
4. 訓練團隊使用
