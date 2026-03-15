# Webhook Bridge 真實測試指南

## 問題分析

當前測試失敗的原因：
- ✅ 健康檢查成功
- ✅ 消息轉發成功
- ❌ 響應發送失敗（500錯誤）

**根本原因：測試使用了假的 chat_id**

測試腳本使用 `chat_id = "123456789"`，這不是真實的 Telegram chat_id，所以 Telegram API 拒絕了請求。

## 真實測試方案

### 方案 1：使用真實的 Telegram 對話

1. **獲取真實 chat_id**
   - 在 Telegram 中向 OpenClaw bot 發送一條消息
   - 查看 webhook-bridge 日誌，找到真實的 chat_id
   - 或使用 Telegram Bot API 的 getUpdates 方法

2. **修改測試腳本**
   ```powershell
   $responseBody = @{
       chat_id = "YOUR_REAL_CHAT_ID"  # 替換為真實 chat_id
       message_id = "1"
       text = "Test response from n8n"
       source_bot = "andrea"
   } | ConvertTo-Json
   ```

3. **執行測試**
   ```powershell
   powershell -ExecutionPolicy Bypass -File test-webhook-bridge-e2e.ps1
   ```

### 方案 2：端到端集成測試

不使用測試腳本，而是測試完整的消息流程：

1. **在 Telegram 中向 OpenClaw bot 發送消息**
   ```
   /start
   你好
   ```

2. **檢查 webhook-bridge 日誌**
   應該看到：
   ```
   [OpenClaw] Received message from chat_id: XXXXX
   [Forward] Forwarding to n8n...
   [Forward] Response: andrea
   ```

3. **檢查 n8n 執行記錄**
   - 登入 n8n Dashboard
   - 查看 "message-router" workflow 的執行記錄
   - 確認消息已接收並路由到 Andrea

4. **等待 Andrea 回覆**
   - Andrea 處理消息後會調用 `/webhook/response`
   - 回覆應該出現在 Telegram 對話中

### 方案 3：獲取真實 chat_id

使用 Telegram Bot API 獲取真實的 chat_id：

```powershell
# 替換為你的 OpenClaw bot token
$botToken = "YOUR_OPENCLAW_BOT_TOKEN"

# 獲取最近的更新
$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getUpdates"

# 顯示 chat_id
$response.result | ForEach-Object {
    Write-Host "Chat ID: $($_.message.chat.id)"
    Write-Host "From: $($_.message.from.first_name)"
    Write-Host "Text: $($_.message.text)"
    Write-Host "---"
}
```

## 預期結果

### 成功的完整流程

1. **用戶發送消息到 OpenClaw bot**
   ```
   用戶 → OpenClaw Bot
   ```

2. **Webhook Bridge 接收並轉發**
   ```
   OpenClaw Bot → Webhook Bridge → n8n
   ```

3. **n8n 路由到 Andrea**
   ```
   n8n → Andrea Bot (處理消息)
   ```

4. **Andrea 回覆**
   ```
   Andrea Bot → n8n → Webhook Bridge → OpenClaw Bot → 用戶
   ```

### 日誌示例

**Webhook Bridge 日誌：**
```
[OpenClaw] Received message from chat_id: 123456789
[OpenClaw] Message: 你好
[Forward] Forwarding to n8n...
[Forward] Response: andrea
[Response] Received: { chat_id: 123456789, text: "Andrea 的回覆" }
[Response] Sent successfully: 12345
```

## 故障排除

### 問題：500 錯誤但 chat_id 是真實的

可能原因：
1. Bot token 無效或過期
2. Bot 沒有權限發送消息到該 chat
3. 用戶封鎖了 bot

**解決：**
- 檢查環境變數中的 `TELEGRAM_OPENCLAW_BOT_TOKEN`
- 確認用戶已啟動 bot（發送 /start）
- 查看詳細錯誤日誌

### 問題：消息轉發成功但沒有收到回覆

可能原因：
1. n8n workflow 沒有正確配置
2. Andrea bot 沒有回應
3. 回覆 webhook URL 配置錯誤

**解決：**
- 檢查 n8n 執行記錄
- 確認 Andrea bot 正在運行
- 驗證 webhook URL：`https://webhook-bridge.neovega.cc/webhook/response`

---
建立時間：2026-03-15
狀態：測試中

