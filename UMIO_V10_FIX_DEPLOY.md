# Umio V10 Workflow 修復部署指南

## 問題摘要

n8n 顯示 Umio 回覆成功，但 vite-react 前端沒有收到回覆。

### 根本原因

V10 workflow 的 **Save to PocketBase** 節點有 expression 錯誤：

1. **錯誤的 content 欄位**：使用了 `$json.response`，但應該使用 `replyText`
2. **錯誤的節點引用**：使用了 `$('Prepare Request').item.json`，但應該使用 `$('Extract Reply').first().json`
3. **缺少 channel 欄位**：messages collection 需要 `channel` 欄位

## 修復內容

### Save to PocketBase 節點修正

```json
// 修正前（錯誤）
{
  "conversation": "{{ $('Prepare Request').item.json.conversationId }}",
  "content": "{{ $json.response }}",
  "sender": "assistant",
  "metadata": { ... }
}

// 修正後（正確）
{
  "conversation": "{{ $('Extract Reply').first().json.conversationId }}",
  "content": "{{ $('Extract Reply').first().json.replyText }}",
  "sender": "assistant",
  "channel": "web",
  "metadata": { ... }
}
```

## 部署步驟

### 1. 匯入修復後的 Workflow

1. 開啟 n8n 管理介面：https://n8n.neovega.cc
2. 進入 **Workflows** → **Import from File**
3. 選擇 `n8n/webchat-umio-simple-v10.json`
4. 點擊 **Import**

### 2. 驗證 Webhook URL

Workflow 匯入後，檢查 Webhook URL：

```
https://n8n.neovega.cc/webhook/umio-chat-v10
```

### 3. 測試 Workflow

1. 在 n8n 中開啟 workflow
2. 點擊 **Execute Workflow** 進行測試
3. 檢查每個節點的輸出，特別是 **Save to PocketBase**

### 4. 啟用 Workflow

點擊右上角的 **Active** 開關，啟用 workflow。

## 前端驗證

部署完成後，在前端測試：

1. 開啟商店頁面：https://www.neovega.cc/shop
2. 點擊右下角聊天圖示
3. 發送訊息給 Umio
4. 應該會立即看到回覆

## 預期行為

### 正常流程

1. 用戶發送訊息 → 前端呼叫 n8n webhook
2. n8n 立即回應 `processing` 狀態
3. n8n 呼叫 OpenClaw 取得回覆
4. n8n 將回覆儲存到 PocketBase messages collection
5. 前端透過 Realtime subscription 接收到新訊息
6. 回覆顯示在聊天視窗中

### 調試日誌

在前端 Console 應該看到：

```
[UmioChat] Saved user message to conversation xxx
[UmioChat] Message sent to n8n successfully
[UmioChat] Subscribed to replies for session xxx
[UmioChat] Received event: update {record: {...}}  ← 收到回覆
```

## 故障排除

### 如果前端仍收不到回覆

1. **檢查 n8n 執行日誌**：
   - 進入 n8n → Executions
   - 查看最新的 workflow 執行結果
   - 檢查 **Save to PocketBase** 節點是否成功

2. **檢查 PocketBase**：
   - 開啟 https://www.neovega.cc/pb/_/collections/messages
   - 查看最新記錄是否有新訊息
   - 確認訊息的 `sender` 欄位是 `assistant`

3. **檢查前端訂閱**：
   - 開啟瀏覽器 Console
   - 確認 `subscribeToReplies` 日誌
   - 檢查 PocketBase Realtime 連線狀態

4. **手動測試 API**：

```bash
curl -X POST https://n8n.neovega.cc/webhook/umio-chat-v10 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "測試訊息",
    "sessionId": "test-session-123",
    "conversationId": "your-conversation-id",
    "context": {
      "platform": "umio"
    }
  }'
```

## 相關檔案

- 修復後的 workflow：`n8n/webchat-umio-simple-v10.json`
- 前端服務：`src/services/umioChat.ts`
- 部署指南：`UMIO_V10_DEPLOY.md`

## Git Commit

```bash
git log --oneline -1
# d12f15e fix: V10 workflow PocketBase storage expression errors
```
