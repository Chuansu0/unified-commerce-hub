# Webhook Bridge 404 錯誤排除

## 問題現象

```
Invoke-RestMethod : 遠端伺服器傳回錯誤: (404) 找不到。
```

## 根本原因

404 錯誤表示：
- ✅ DNS 解析成功（能連到伺服器）
- ❌ 服務未正確啟動或路由不存在

## 最可能的原因

### 1. 環境變數缺失 ⚠️

服務需要以下環境變數才能啟動：
```
TELEGRAM_OPENCLAW_BOT_TOKEN
TELEGRAM_ANDREA_BOT_TOKEN
TELEGRAM_UMIO_BOT_TOKEN
```

如果這些變數未設定，Telegraf 初始化會失敗，導致服務無法啟動。

### 2. 服務啟動失敗

TypeScript 編譯或 Node.js 執行時錯誤。

## 解決步驟

### 步驟 1：檢查 Zeabur 部署日誌

1. 登入 Zeabur Dashboard
2. 進入 webhook-bridge 服務
3. 點擊 "Logs" 標籤
4. 查看是否有錯誤訊息

**常見錯誤訊息：**
- `Error: TELEGRAM_OPENCLAW_BOT_TOKEN is required`
- `401: Unauthorized` (bot token 無效)
- `Cannot find module` (依賴安裝失敗)

### 步驟 2：確認環境變數

在 Zeabur 服務設定中確認以下變數已設定：

```
TELEGRAM_OPENCLAW_BOT_TOKEN=<實際token>
TELEGRAM_ANDREA_BOT_TOKEN=<實際token>
TELEGRAM_UMIO_BOT_TOKEN=<實際token>
PORT=3003
N8N_WEBHOOK_URL=https://n8n.neovega.cc/webhook/message-router
POCKETBASE_URL=https://pocketbase.neovega.cc
WEBHOOK_SECRET=<隨機字串>
```

### 步驟 3：重新部署

環境變數設定後：
1. 點擊 "Redeploy" 按鈕
2. 等待建置完成
3. 查看日誌確認啟動成功

### 步驟 4：驗證服務

```powershell
# 測試健康檢查
Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/health"

# 預期回應
# status  service
# ------  -------
# ok      webhook-bridge
```

## 臨時解決方案：本地測試

如果 Zeabur 部署有問題，可以先在本地測試：

```powershell
# 1. 編輯 .env 文件
notepad webhook-bridge\.env

# 2. 填入實際 tokens

# 3. 啟動服務
cd webhook-bridge
npm run dev

# 4. 測試（另開終端）
Invoke-RestMethod -Uri "http://localhost:3003/health"
```

## 檢查清單

- [ ] 確認所有環境變數已在 Zeabur 設定
- [ ] 確認 bot tokens 有效且格式正確
- [ ] 查看 Zeabur 部署日誌
- [ ] 確認服務狀態為 "Running"
- [ ] 重新部署服務
- [ ] 測試健康檢查端點

## 下一步

部署成功後：
1. ✅ 健康檢查通過
2. 設定 Telegram webhook
3. 匯入 n8n workflow
4. 執行端到端測試
