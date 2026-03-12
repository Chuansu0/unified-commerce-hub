# n8n Workflow 除錯指南

## 錯誤分析

錯誤：`{"message":"Workflow execution failed"}`

這個錯誤通常有以下幾個原因：

### 1. Workflow 未啟動
在 n8n 匯入 workflow 後，必須點擊 **「Active」開關** 啟動 workflow。

### 2. Webhook URL 不正確
檢查 n8n 中的 webhook 實際 URL：
- 登入 n8n → 點擊 WebChat Webhook 節點
- 查看 "Webhook URLs" 區塊
- 確認 Production URL 是：`https://www.neovega.cc/api/webhook/chat-inbound`

### 3. Credential 未設定
Telegram Bot Credential 必須在 n8n 中手動建立：
- Settings → Credentials → Add Credential
- 選擇 "Telegram API"
- 輸入 Bot Token: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`
- 在 workflow 中選擇此 credential

### 4. PocketBase 連線問題
檢查 PocketBase 服務名稱是否正確。

## 除錯步驟

### 步驟 1：登入 n8n 檢查

1. 開啟 https://neovegan8n.zeabur.app
2. 點擊左上角的 "Workflows"
3. 查看是否有 "WebChat Inbound Handler"
4. 確認 toggle 開關是開啟狀態（綠色）

### 步驟 2：手動匯入 Workflow

如果 workflow 不存在，手動匯入：

1. Workflows → Add Workflow
2. 點擊右上角的三個點 → Import from File
3. 選擇 `n8n/webchat-inbound-workflow.json`
4. 點擊 Save

### 步驟 3：設定 Credential

1. 點擊左側選單 Settings → Credentials
2. 點擊 "Add Credential"
3. 搜尋 "Telegram"
4. 選擇 "Telegram API"
5. 輸入：
   - Name: `telegram-bot-credential`
   - Bot Token: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`
6. 點擊 Save

### 步驟 4：在 Workflow 中選擇 Credential

1. 開啟 "WebChat Inbound Handler" workflow
2. 點擊 "Send to Telegram Group" 節點
3. 在 "Credential for Telegram API" 下拉選單選擇剛建立的 credential
4. 對 "Mention @andrea" 節點重複相同步驟
5. 點擊 Save

### 步驟 5：啟動 Workflow

1. 點擊右上角的 "Active" toggle（開關）
2. 確認變成綠色
3. 點擊 "Execute Workflow" 測試

### 步驟 6：測試 Webhook

```bash
# 測試 webhook
curl -X POST https://www.neovega.cc/api/webhook/chat-inbound \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"測試訊息","platform":"webchat"}'
```

### 步驟 7：查看執行記錄

1. 在 n8n 左側選單點擊 "Executions"
2. 查看最近的執行記錄
3. 點擊失敗的執行查看詳細錯誤訊息

## 簡化測試 Workflow

我建立了一個簡化的測試 workflow：`n8n/webchat-test-workflow.json`

這個 workflow：
- 只有 Webhook → Set 兩個節點
- 不需要 Telegram credential
- 更容易測試 nginx 代理是否正確

測試步驟：

1. 匯入 `webchat-test-workflow.json`
2. 啟動 workflow
3. 執行：
```bash
curl -X POST https://www.neovega.cc/api/webhook/test-inbound \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

預期回應：
```json
{
  "received": "Hello",
  "success": true
}
```

如果這個測試成功，表示 nginx 代理設定正確，問題在於完整的 workflow 設定（credential 或其他節點）。

## 常見錯誤解決

### 錯誤："Could not resolve host: n8n.zeabur.internal"

這表示在 nginx 容器內無法解析 n8n 服務的內部域名。

解決方案：
1. 檢查 n8n 服務是否正常運行
2. 在 Zeabur Dashboard 確認服務名稱
3. 可能需要使用完整的 service domain

### 錯誤："No active execution found"

Workflow 未啟動。點擊 Active toggle 啟動。

### 錯誤："Credential not found"

Credential ID 在 workflow JSON 中是空的。需要在 n8n UI 中手動選擇 credential。

### 錯誤：Telegram API 錯誤

1. 檢查 bot token 是否正確
2. 確認 bot 已加入群組 `-1003806455231`
3. 確認 bot 有權限發送訊息

### 錯誤：PocketBase 連線失敗

1. 檢查 `http://pocketbase.zeabur.internal:8090` 是否可連線
2. 確認 messages collection 存在
3. 檢查 schema 是否正確

## 直接呼叫 n8n（繞過 nginx）

測試 n8n 本身是否正常：

```bash
# 取得 webhook URL 後直接呼叫
# 這需要知道 n8n 的實際 webhook production URL

# 在 n8n UI 中，點擊 Webhook 節點
# 查看 "Production URL"
# 可能是：https://neovegan8n.zeabur.app/webhook/chat-inbound

curl -X POST https://neovegan8n.zeabur.app/webhook/chat-inbound \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"直接測試","platform":"webchat"}'
```

如果直接呼叫成功但透過 nginx 失敗，問題在於 nginx 設定或服務發現。

## 下一步行動

請按照上述步驟：

1. **先測試簡化版**：匯入 `webchat-test-workflow.json`，測試基本 webhook 功能
2. **檢查執行記錄**：在 n8n Executions 查看具體錯誤
3. **設定 credential**：確保 Telegram bot credential 已正確設定
4. **啟動 workflow**：確認 toggle 是開啟狀態

完成後告訴我測試結果和看到的錯誤訊息！