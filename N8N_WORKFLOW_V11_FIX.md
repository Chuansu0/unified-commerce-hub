# n8n V11 Workflow 修復指南

## 問題

OpenClaw HTTP Bridge 返回 400 錯誤：
```json
{
  "error": "message and sessionId required",
  "example": {"message": "Hello Umio", "sessionId": "user-123"}
}
```

錯誤日誌顯示：
```json
{ "body": { "message": "", "sessionId": "" }, ... }
```

## 原因

V11 workflow 的 `Prepare Request` 節點使用了錯誤的變數語法：

**錯誤**（使用前）：
```javascript
$json.body.sessionId  // undefined
$json.body.message   // undefined
$json.body.context.platform
```

**正確**（修正後）：
```javascript
$json.sessionId      // 正確
$json.message        // 正確
$json.context?.platform || 'umio'
```

n8n Webhook 節點的 `$json` 直接就是請求體內容，不需要 `.body` 前綴。

## 修復內容

修改 `Prepare Request` 節點的四個欄位：

| 欄位名 | 修正前值 | 修正後值 |
|-------|---------|---------|
| sessionId | `={{ $json.body.sessionId }}` | `={{ $json.sessionId }}` |
| conversationId | `={{ $json.body.conversationId }}` | `={{ $json.conversationId }}` |
| message | `={{ $json.body.message }}` | `={{ $json.message }}` |
| platform | `={{ $json.body.context.platform || 'umio' }}` | `={{ $json.context?.platform \|\| 'umio' }}` |

## 部署步驟

### 步驟 1：在 n8n 中更新 Workflow

1. 登入 n8n (https://n8n.neovega.cc)
2. 打開 `Webchat Umio Simple V11 (Fixed URL)` workflow
3. 找到 **Prepare Request** 節點
4. 編輯以下欄位：
   - `sessionId` → `={{ $json.sessionId }}`
   - `conversationId` → `={{ $json.conversationId }}`
   - `message` → `={{ $json.message }}`
   - `platform` → `={{ $json.context?.platform || 'umio' }}`
5. 保存並重新啟動 workflow

### 步驟 2：測試驗證

使用 curl 測試：

```bash
curl -X POST https://n8n.neovega.cc/webhook/umio-chat-v11 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好 Umio",
    "sessionId": "test-session-123",
    "conversationId": "test-conv-456",
    "context": {"platform": "umio"}
  }'
```

應該返回：
```json
{"success": true, "message": "訊息已發送給 Umio", "status": "processing"}
```

### 步驟 3：WebChat 測試

在 WebChat 中發送訊息，應該：
1. ✅ 不再出現 400 錯誤
2. ✅ 訊息成功傳遞給 Umio
3. ✅ 幾秒後收到 Umio 的回覆

## 替代方案：重新匯入 Workflow

如果不想手動修改，可以重新匯入修正後的 workflow：

1. 在 n8n 中刪除現有的 V11 workflow
2. 匯入 `n8n/webchat-umio-simple-v11.json`（已修正）
3. 啟動 workflow

## 相關文件

- `n8n/webchat-umio-simple-v11.json` - 修正後的 workflow 檔案
- `NGINX_V11_FIX.md` - nginx 配置修復指南
