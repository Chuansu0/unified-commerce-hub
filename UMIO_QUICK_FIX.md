# Umio WebChat 快速修復指南

## 問題
WebChat 發送訊息到 n8n webhook 時出現錯誤：

1. **500 錯誤**：舊的 workflow 使用了 Telegram 節點需要 credential，且並行路徑導致錯誤
2. **404 錯誤**：nginx 配置中路由順序錯誤，`/api/umio/chat` 被 `/api/umio/` 優先匹配

## 解決方案

### 1. 修正 nginx 配置（已修正）
`nginx.conf` 已更新，確保 `/api/umio/chat` 路由在 `/api/umio/` 之前定義：

```nginx
# 特定路由必須放在通用路由之前
location /api/umio/chat {
    proxy_pass http://$n8n/webhook/umio-chat;
    ...
}

location /api/umio/ {
    proxy_pass http://$openclaw_bridge;
    ...
}
```

**需要重新部署到 Zeabur 才能生效！**

### 2. 使用新的簡化版 workflow
使用 `n8n/webchat-umio-simple-v2.json`：
- ✅ 使用 HTTP Request 節點直接呼叫 Telegram API（無需 credential）
- ✅ 單一線性流程（無並行路徑）
- ✅ 使用 `responseNode` 模式確保正確回應
- ✅ 內建 Bot Token 和 Chat ID

## 部署步驟

### 步驟 1：重新部署 nginx 配置
1. 提交 `nginx.conf` 變更到 git
2. 推送到 GitHub
3. Zeabur 會自動重新部署

### 步驟 2：在 n8n 中匯入 Workflow
1. 登入 n8n: `https://n8n.zeabur.app`
2. 點擊 **Add Workflow**
3. 點擊右上角 **...** → **Import from JSON**
4. 貼上 `n8n/webchat-umio-simple-v2.json` 的內容
5. 點擊 **Save**

### 步驟 3：啟動 Workflow
1. 點擊 **Active** 開關啟動 workflow
2. Webhook URL 應為：`https://n8n.zeabur.app/webhook/umio-chat`

### 步驟 4：測試
```bash
# 測試 webhook
curl -X POST https://unified-commerce-hub.zeabur.app/api/umio/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "測試訊息",
    "sessionId": "test-session-123",
    "context": {"platform": "webchat"}
  }'
```

預期回應：
```json
{"success": true, "message": "Message forwarded to Umio"}
```

### 技術細節

#### Webhook 路徑對應
```
前端呼叫: /api/umio/chat
    ↓ nginx 代理
n8n webhook: /webhook/umio-chat
```

#### Telegram 設定
- Bot Token: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`
- Chat ID: `-1003806455231`

#### 訊息格式
```
👤 WebChat → Umio

💬 訊息: [使用者訊息]

📋 詳細資訊:
• Session ID: [session ID]
• 平台: [platform]
• 時間: [ISO 時間]
```

### 故障排除

| 問題 | 解決方案 |
|------|----------|
| 500 錯誤 | 確認 workflow 已啟動且路徑為 `umio-chat` |
| 404 錯誤 | 確認 nginx 配置正確，`/api/umio/chat` 路由存在 |
| 訊息沒送到 Telegram | 檢查 bot token 和 chat ID 是否正確 |
| 前端顯示錯誤 | 檢查瀏覽器開發者工具 Network 分頁 |

### 回滾方案
如需回滾到舊版本：
1. 在 n8n 中停用目前的 workflow
2. 匯入 `n8n/webchat-umio-simple.json`（如果有備份）
3. 或手動建立新 workflow
