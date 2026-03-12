# Zeabur 部署指南

**建立日期**: 2026-03-12  
**目的**: 在 Zeabur 環境中部署和測試 Web Chat 系統

---

## 一、配置更新摘要

### 1.1 已更新的文件

1. **nginx.conf** ✅
   - PocketBase URL: `http://pocketbase-convo.zeabur.internal:8090`

2. **telegram-webhook/src/index.ts** ✅
   - PocketBase URL: `http://pocketbase-convo.zeabur.internal:8090`

3. **src/services/pocketbase.ts** ✅
   - 前端使用相對路徑: `/pb`

---

## 二、部署步驟

### 步驟 1: 提交代碼到 Git

```bash
# 在本地專案目錄執行
git add nginx.conf telegram-webhook/src/index.ts
git commit -m "fix: 更新 PocketBase 內部 URL 為 zeabur.internal"
git push origin main
```

### 步驟 2: 在 Zeabur 重新部署

1. 登入 [Zeabur Dashboard](https://zeabur.com)
2. 選擇您的專案
3. Zeabur 會自動偵測 Git 更新並重新部署
4. 或手動觸發重新部署：
   - 點擊服務 → "Redeploy" 按鈕

### 步驟 3: 設定環境變數（telegram-webhook）

在 Zeabur Dashboard 中為 `telegram-webhook` 服務設定：

| 變數名稱 | 值 |
|---------|-----|
| `TELEGRAM_BOT_TOKEN` | `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw` |
| `OPENCLAW_CHAT_ID` | `-1003806455231` |
| `POCKETBASE_URL` | `http://pocketbase-convo.zeabur.internal:8090` |

### 步驟 4: 設定 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.neovega.cc/webhook/telegram", "drop_pending_updates": true}'
```

---

## 三、測試和驗證

### 3.1 使用 Zeabur Terminal

1. 在 Zeabur Dashboard 中選擇 nginx 服務
2. 點擊 "Terminal" 或 "Console" 標籤
3. 執行測試命令：

```bash
# 測試 PocketBase 連線
curl http://pocketbase-convo.zeabur.internal:8090/api/health

# 測試 DNS 解析
nslookup pocketbase-convo.zeabur.internal
```

### 3.2 查看服務日誌

1. 在 Zeabur Dashboard 中選擇服務
2. 點擊 "Logs" 標籤
3. 查看即時日誌輸出

### 3.3 測試完整流程

1. 訪問 https://www.neovega.cc/shop
2. 開啟聊天視窗
3. 發送測試訊息
4. 檢查 Telegram group 是否收到訊息
5. 等待 OpenClaw agents 回覆
6. 確認 Web Chat 顯示回覆

---

## 四、故障排除

### 4.1 如果 nginx 仍然無法解析

檢查 nginx 日誌：
```bash
# 在 Zeabur nginx Terminal 中
tail -f /var/log/nginx/error.log
```

### 4.2 如果 telegram-webhook 無法連線 PocketBase

檢查環境變數：
```bash
# 在 Zeabur telegram-webhook Terminal 中
echo $POCKETBASE_URL
```

### 4.3 快速健康檢查

```bash
# PocketBase
curl https://www.neovega.cc/pb/api/health

# telegram-webhook
curl https://www.neovega.cc/health

# Telegram Bot
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"
```

---

**最後更新**: 2026-03-12 09:38 (UTC+8)
