# n8n Webhook URL 修正指南

## 問題

n8n 顯示的 Webhook Production URL 是：
```
http://:5678/webhook/chat-inbound
```

這是錯誤的，因為：
- 缺少 hostname
- 使用了內部 port 5678
- 使用了 http 而非 https

## 解決方案

需要在 Zeabur Dashboard 為 n8n 服務設定以下環境變數：

### 1. 登入 Zeabur Dashboard

開啟 https://dash.zeabur.com

### 2. 找到 n8n 服務

點擊您的 n8n 服務（應該是 neovegan8n）

### 3. 設定環境變數

在 "Environment Variables" 區塊，新增以下變數：

```
N8N_HOST=neovegan8n.zeabur.app
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://neovegan8n.zeabur.app
```

或者更完整的設定：

```
N8N_HOST=neovegan8n.zeabur.app
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://neovegan8n.zeabur.app
VUE_APP_URL_BASE_API=https://neovegan8n.zeabur.app
```

### 4. 重新部署

設定完成後，Zeabur 會自動重新部署 n8n 服務。

### 5. 驗證修正

重新部署後，登入 n8n：

1. 開啟 https://neovegan8n.zeabur.app
2. 點擊 "WebChat Inbound Handler" workflow
3. 點擊 "WebChat Webhook" 節點
4. 查看 "Webhook URLs"
5. Production URL 應該顯示為：
   ```
   https://neovegan8n.zeabur.app/webhook/chat-inbound
   ```

## 測試

修正後，直接測試 n8n webhook：

```bash
curl -X POST https://neovegan8n.zeabur.app/webhook/chat-inbound \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"直接測試","platform":"webchat"}'
```

## 為什麼會這樣？

n8n 在 Docker 容器中運行時，如果沒有正確設定 `N8N_HOST` 和 `N8N_PROTOCOL` 環境變數，它無法知道：
1. 外部的 domain name 是什麼
2. 應該使用 http 還是 https

因此它只能顯示內部的 IP 和 port，導致 webhook URL 無法從外部存取。

## 替代方案：使用 Test URL

如果暫時無法修正環境變數，可以使用 "Test URL"（在 n8n UI 中顯示為 "Test workflow" 按鈕）：

但這只適用於測試，因為：
- Test webhook 只在點擊 "Test workflow" 後短時間內有效
- 不適合生產環境使用

## 下一步

1. 在 Zeabur Dashboard 設定上述環境變數
2. 等待重新部署完成
3. 驗證 webhook URL 正確顯示
4. 重新測試：
   ```bash
   curl https://www.neovega.cc/api/webhook/chat-inbound \
     -d '{"sessionId":"test","message":"測試"}'
   ```

完成後告訴我結果！