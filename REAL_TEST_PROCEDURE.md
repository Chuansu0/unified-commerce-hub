# Webhook Bridge 真實測試流程

## 前置準備

### 1. 確認服務狀態

```powershell
# 測試健康檢查
Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/health"
```

預期結果：
```
status  service
------  -------
ok      webhook-bridge
```

### 2. 在 Telegram 發送測試消息

1. 打開 Telegram
2. 搜尋你的 OpenClaw bot（使用 bot 用戶名）
3. 發送消息：`/start` 或 `你好`
4. 等待幾秒

## 測試步驟

### 步驟 1：獲取真實 Chat ID

```powershell
# 執行腳本（需要先設定環境變數或提供 token）
.\get-telegram-chat-id.ps1 -BotToken "YOUR_OPENCLAW_BOT_TOKEN"
```

或者從 .env 文件讀取：
```powershell
# 讀取 webhook-bridge/.env 中的 token
$token = (Get-Content webhook-bridge\.env | Select-String "TELEGRAM_OPENCLAW_BOT_TOKEN").ToString().Split("=")[1]
.\get-telegram-chat-id.ps1 -BotToken $token
```

**預期輸出：**
```
==================================================
  Telegram Chat ID 獲取工具
==================================================

📡 正在獲取最近的更新...

✅ 找到 1 條更新

==================================================
Chat ID: 123456789
  類型: private
  來自: John Doe
  用戶名: @johndoe
  訊息: /start
  時間: 2026-03-15 23:00:00
--------------------------------------------------

💡 提示：複製上面的 Chat ID 用於測試
==================================================
```

### 步驟 2：測試響應端點

使用獲取到的真實 Chat ID：

```powershell
$realChatId = "YOUR_REAL_CHAT_ID"  # 替換為步驟 1 獲取的 Chat ID

$body = @{
    chat_id = $realChatId
    message_id = "1"
    text = "✅ 測試成功！這是來自 Webhook Bridge 的回覆。"
    source_bot = "andrea"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/webhook/response" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**預期結果：**
1. 命令返回：`{ "success": true, "sent": true, "message_id": 12345 }`
2. 在 Telegram 中收到回覆消息

### 步驟 3：端到端完整測試

測試完整的消息流程（需要 n8n 和 Andrea bot 配置完成）：

1. **在 Telegram 向 OpenClaw bot 發送消息**
   ```
   你好，Andrea
   ```

2. **查看 Webhook Bridge 日誌**（Zeabur Dashboard）
   ```
   [OpenClaw] Received message from chat_id: 123456789
   [Forward] Forwarding to n8n...
   [Forward] Response: andrea
   ```

3. **查看 n8n 執行記錄**
   - 登入 n8n Dashboard
   - 查看 "message-router" workflow
   - 確認消息已路由到 Andrea

4. **等待回覆**
   - Andrea 處理後會調用 `/webhook/response`
   - 回覆應出現在 Telegram 對話中

## 故障排除

### 問題 1：無法獲取 Chat ID

**症狀：** `get-telegram-chat-id.ps1` 返回空結果

**解決：**
1. 確認已在 Telegram 向 bot 發送消息
2. 檢查 bot token 是否正確
3. 確認 bot 沒有被停用

### 問題 2：響應發送失敗（400 錯誤）

**症狀：** `Missing chat_id or text`

**解決：**
- 檢查請求 body 格式
- 確認 chat_id 和 text 欄位存在

### 問題 3：響應發送失敗（500 錯誤）

**症狀：** `Failed to send response`

**可能原因：**
1. Chat ID 無效
2. 用戶封鎖了 bot
3. Bot token 無效

**解決：**
1. 查看 Webhook Bridge 日誌獲取詳細錯誤
2. 確認用戶已啟動 bot（/start）
3. 驗證 bot token 正確

## 成功標準

✅ 所有測試通過的標準：

1. 健康檢查返回 `{ status: "ok" }`
2. 消息轉發返回正確的 bot 名稱
3. 響應發送成功並在 Telegram 收到消息
4. 端到端測試：發送消息 → 收到 Andrea 回覆

---
建立時間：2026-03-15
狀態：準備測試

