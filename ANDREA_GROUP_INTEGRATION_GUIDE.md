# Andrea群組整合部署指南

## 架構

```
WebChat → n8n → Telegram 群組 (mention @neovegaandrea_bot)
                ↓
                  Andrea 回覆 (reply to message)
                      ↓
                n8n 捕獲回覆 → WebChat API
```

## 工作原理

1. WebChat 訊息透過 n8n 發送到 Telegram 群組
2. 訊息格式：`@neovegaandrea_bot\n📱 WebChat[session-id]: 使用者訊息`
3. Andrea 因為被 mention 而回應（reply to message）
4. n8n 監聽 Andrea 的回覆，從原始訊息提取 session ID
5. 將回覆發送回 WebChat API

## 部署步驟

### 1. 匯入 n8n Workflows

#### Workflow 1: WebChat to Andrea (Group)
- 匯入 `n8n/webchat-andrea-group-workflow.json`
- 設定 Telegram credential (umio bot)
- 確認 Chat ID: `-1003806455231`
- 啟用 workflow

#### Workflow 2: Andrea Group Reply to WebChat
- 匯入 `n8n/andrea-group-reply-workflow.json`
- 使用相同的 Telegram credential
- 更新 WebChat API URL (如果不同)
- 啟用 workflow

### 2. 測試

```bash
# 測試發送到群組
curl -X POST https://n8n.neovega.cc/webhook/webchat-to-andrea \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，請簡短回答",
    "sessionId": "test-456"
  }'
```

### 3. 驗證

1. 檢查 Telegram 群組，應該看到：
   ```
   @neovegaandrea_bot
   📱 WebChat[test-456]: 你好，請簡短回答
   ```

2. Andrea 應該回覆該訊息

3. 檢查 n8n 執行日誌，確認回覆被捕獲並發送到 WebChat API

## 關鍵配置

###訊息格式

**發送格式**：
```
@neovegaandrea_bot
📱 WebChat[{sessionId}]: {message}
```

**Session ID 提取**：
從reply_to_message 中提取：`WebChat[session-id]`

### 過濾條件

Andrea Reply workflow 過濾：
1. 發送者是 `neovegaandrea_bot`
2. 在指定群組 `-1003806455231`
3. 是回覆訊息 (reply_to_message 存在)

## 故障排除

### Andrea沒有回應
- 確認 Andrea 在群組中
- 確認 @mention 格式正確
- 檢查 OpenClaw 日誌

### n8n 沒有捕獲回覆
- 確認 Telegram Trigger 已啟用
- 檢查過濾條件（username, chat ID）
- 確認 Andrea 是用reply而不是新訊息

### Session ID 提取失敗
- 檢查原始訊息格式是否包含 `WebChat[session-id]`
- 查看 n8n Code 節點執行日誌
- 確認正則表達式匹配

## 優點

✅ 不依賴 bot-to-bot DM（Telegram 不支援）
✅ 使用 Andrea 現有的群組回應功能
✅ 透過 reply_to_message 追蹤對話
✅ Session ID 嵌入在訊息中，易於提取

## 限制

⚠️ 群組中其他人可以看到 WebChat 訊息
⚠️ 需要 Andrea reply 原始訊息（不能發新訊息）
⚠️ Session ID 必須在原始訊息中