# Webchat 部署和測試指南

## 當前狀況

- ✅ 代碼已修正（添加詳細日誌）
- ❌ Zeabur 還在使用舊代碼
- ❌ Zeabur 端口 8080 被佔用

## 選項 1：本地測試（推薦）

### 步驟 1：啟動本地開發伺服器

```powershell
# 在專案目錄執行
npm run dev
```

### 步驟 2：開啟瀏覽器

```
http://localhost:5173
```

### 步驟 3：測試 Webchat

1. 開啟 DevTools（F12）→ Console
2. 發送測試訊息
3. 觀察詳細日誌：

```
✅ [UmioChat] Sending message...
✅ [UmioChat] Created new conversation
✅ [UmioChat] Saved user message
✅ [UmioChat] Response status: 200
✅ [UmioChat] Response data: {...}
✅ [UmioChat] Saving assistant message for session: umio-xxx
✅ [UmioChat] Content to save: "Message received"
✅ [UmioChat] Found conversation: xxx
✅ [UmioChat] Creating message with data: {...}
✅ [UmioChat] Saved assistant reply
```

## 選項 2：部署到 Zeabur

### 步驟 1：提交代碼

```powershell
git add .
git commit -m "fix: Add detailed logging for assistant message saving"
git push origin main
```

### 步驟 2：解決端口佔用問題

Zeabur 錯誤：`EADDRINUSE: address already in use :::8080`

**可能原因：**
- 多個服務嘗試使用同一端口
- 舊的進程沒有正確關閉

**解決方案：**

1. 開啟 Zeabur Dashboard
2. 找到 `unified-commerce-hub` 服務
3. 點擊 **Redeploy** 或 **Restart**
4. 檢查環境變數中的 `PORT` 設定

### 步驟 3：等待部署完成

- Zeabur 會自動從 GitHub 拉取最新代碼
- 重新建置並部署
- 通常需要 2-5 分鐘

### 步驟 4：測試生產環境

```
https://www.neovega.cc
```

## 診斷 400 錯誤

如果還是出現 400 錯誤，檢查 Console 日誌：

### 關鍵資訊：

1. **Content 值**
   ```
   [UmioChat] Content to save: "..."
   ```
   - 如果是 `undefined` → 回應格式問題
   - 如果是空字串 → n8n workflow 問題

2. **Conversation ID**
   ```
   [UmioChat] Found conversation: "xxx"
   ```
   - 如果沒有這行 → conversation 查找失敗

3. **Message Data**
   ```
   [UmioChat] Creating message with data: {...}
   ```
   - 檢查所有欄位是否正確

## 常見問題

### Q: 本地測試成功，但 Zeabur 失敗？

A: 檢查環境變數配置：
- `VITE_POCKETBASE_URL`
- `VITE_UMIO_API_URL`

### Q: 端口佔用無法解決？

A: 檢查 `zbpack.json` 中的端口配置，或聯繫 Zeabur 支援

### Q: n8n webhook 404？

A: 確認 workflow 已匯入並啟用：
- 開啟 n8n
- 匯入 `n8n/webchat-umio-simple.json`
- 啟用 workflow
