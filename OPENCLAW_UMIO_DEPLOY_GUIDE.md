# OpenClaw Umio Agent 部署指南

## 更新內容

已在 `zeabur_openclaw_config_fixed.json` 中新增 **umio agent**：

```json
{
    "id": "umio",
    "name": "Umio (Digital Content Clerk)",
    "workspace": "~/.openclaw/workspace-umio",
    "model": "opencode-go/glm-5"
}
```

## 部署步驟

### 1. 登入 Zeabur 控制台

前往 https://zeabur.com 並登入

### 2. 進入 OpenClaw 服務

找到 `openclaw` 服務並進入設定頁面

### 3. 更新 Config 檔案

**方法一：使用 Zeabur 控制台編輯**

1. 在 OpenClaw 服務中找到 Config 設定
2. 將 `zeabur_openclaw_config_fixed.json` 的內容複製貼上
3. 儲存並重新部署

**方法二：使用 Zeabur CLI（如果有安裝）**

```bash
# 登入 Zeabur
zeabur auth login

# 部署更新
zeabur service redeploy openclaw
```

### 4. 驗證部署

部署完成後，測試 umio agent：

```bash
# 測試 OpenClaw HTTP Bridge
node -e "
const https = require('https');
const data = JSON.stringify({message: '你好', sessionId: 'test-umio'});
const req = https.request({
    hostname: 'openclaw-http-bridge.zeabur.app',
    path: '/api/umio/chat',
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Content-Length': data.length},
    timeout: 30000
}, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});
req.on('error', e => console.log('Error:', e.message));
req.write(data);
req.end();
"
```

### 5. 測試 n8n Workflow

1. 在 n8n 中執行 "Umio Chat Webhook" workflow
2. 發送測試請求：
   ```json
   {
     "message": "你好，請問有什麼推薦的產品？",
     "sessionId": "test-session-001"
   }
   ```
3. 檢查 "Call OpenClaw Bridge" 節點是否成功（應該不再 timeout）

## 注意事項

1. **workspace 目錄**：umio agent 使用 `~/.openclaw/workspace-umio`，OpenClaw 會自動建立這個目錄

2. **模型設定**：umio 使用 `opencode-go/glm-5` 模型，與其他 agent 一致

3. **無需 bindings**：umio 是透過 WebSocket 直接呼叫（使用 `agent.chat` 方法），不需要額外的 bindings 設定

## 故障排除

如果部署後仍有問題：

1. **檢查 OpenClaw 日誌**
   - 在 Zeabur 控制台查看 OpenClaw 服務的日誌
   - 確認是否有 "umio" agent 載入的訊息

2. **驗證 config 語法**
   ```bash
   # 本地驗證 JSON 語法
   node -e "JSON.parse(require('fs').readFileSync('zeabur_openclaw_config_fixed.json'))"
   ```

3. **檢查環境變數**
   - 確認 `OPENCLAW_GATEWAY_TOKEN` 已正確設定
   - 確認 `OPENCLAW_WS_URL` 指向正確的 WebSocket 位址

## 回滾方案

如果需要回滾：

1. 在 Zeabur 控制台找到 OpenClaw 的先前版本
2. 恢復舊的 config（移除 umio agent）
3. 重新部署

## 聯繫支援

如有問題：
- OpenClaw 文件：https://github.com/strowk/...（如果有）
- Zeabur 支援：https://zeabur.com/docs
