# Umio V11 Workflow 部署指南（修復 404 錯誤）

## 問題總結

**錯誤原因**: n8n workflow 使用了錯誤的 OpenClaw API 端點
- ❌ 錯誤: `https://openclaw.neovega.cc/api/chat`
- ✅ 正確: `https://openclaw-http-bridge.zeabur.app/api/umio/chat`

## 部署步驟

### 1. 匯入新版 Workflow

1. 開啟 n8n (https://n8n.neovega.cc)
2. 左側選單點擊 **Workflows**
3. 點擊右上角 **Import from File**
4. 選擇檔案 `n8n/webchat-umio-simple-v11.json`
5. 點擊 **Import**

### 2. 更新前端 Webhook URL

修改 `src/services/umioChat.ts`，將 webhook URL 改為 v11:

```typescript
// 找到這一行
const UMIO_WEBHOOK_URL = 'https://n8n.neovega.cc/webhook/umio-chat-v10';

// 改為
const UMIO_WEBHOOK_URL = 'https://n8n.neovega.cc/webhook/umio-chat-v11';
```

或修改環境變數 `.env`:

```bash
VITE_UMIO_WEBHOOK_URL=https://n8n.neovega.cc/webhook/umio-chat-v11
```

### 3. 啟動 Workflow

1. 在 n8n 中開啟匯入的 workflow
2. 點擊右上角 **Activate** 按鈕（切換為 ON）
3. 確認 workflow 狀態為 **Active**

### 4. 測試

在 WebChat 發送訊息給 Umio，檢查：
1. ✅ 前端收到 "訊息已發送給 Umio"
2. ✅ 幾秒後收到 Umio 的真實回覆
3. ✅ 訊息顯示在對話框中

### 5. 驗證 API 端點

如需驗證 openclaw-http-bridge 是否正常：

```bash
curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好",
    "sessionId": "test-session-123"
  }'
```

應該收到 Umio 的回覆。

## 變更內容

### V11 修正項目：

1. **修正 URL**: 
   - 舊: `https://openclaw.neovega.cc/api/chat`
   - 新: `https://openclaw-http-bridge.zeabur.app/api/umio/chat`

2. **簡化請求 body**:
   - 移除了不必要的 `platform` 和 `agentId` 欄位
   - 只保留 `message` 和 `sessionId`

3. **增加 timeout**: 45秒 → 60秒

4. **調整回覆欄位順序**: `response` → `message` → `text`

## 故障排除

### 如果還是沒收到回覆

1. **檢查 openclaw-http-bridge 服務**
   - 開啟 Zeabur Dashboard
   - 確認 `openclaw-http-bridge` 服務狀態為 **Running**
   - 查看 service log 是否有錯誤

2. **檢查 OpenClaw 服務**
   - 確認 `openclaw` 服務正在運行
   - 確認環境變數 `OPENCLAW_GATEWAY_TOKEN` 已設定

3. **測試直接呼叫 bridge API**
   ```bash
   curl -X POST https://openclaw-http-bridge.zeabur.app/api/umio/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test","sessionId":"test"}'
   ```

### 常見錯誤

**Connection Error**: openclaw-http-bridge 無法連接到 OpenClaw WebSocket
- 檢查 `OPENCLAW_WS_URL` 環境變數
- 確認 OpenClaw 服務正常運行

**Timeout**: Umio 處理時間過長
- 已增加到 60 秒 timeout
- 如仍超時，檢查 OpenClaw 日誌

**CORS Error**: 前端無法呼叫 webhook
- 確認 webhook URL 正確
- 檢查 n8n CORS 設定

## 相關文件

- `UMIO_DEBUG_GUIDE.md` - 詳細除錯指南
- `openclaw-http-bridge/DEPLOY.md` - Bridge 部署指南
- `UMIO_HTTP_INTEGRATION.md` - 完整整合文件
