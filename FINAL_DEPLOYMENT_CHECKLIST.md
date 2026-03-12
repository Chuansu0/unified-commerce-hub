# 最終部署檢查清單

**建立日期**: 2026-03-12  
**目的**: 完成所有配置並部署到 Zeabur

---

## ✅ 已完成的配置

### 1. nginx.conf
- ✅ DNS resolver: `10.43.0.20`
- ✅ PocketBase: `pocketbase-convo.zeabur.internal:8090`
- ✅ telegram-webhook: `unified-commerce-hub-oscie.zeabur.internal:3000`
- ✅ 所有 locations 使用變數進行動態 DNS 解析

### 2. telegram-webhook/src/index.ts
- ✅ PocketBase URL: `http://pocketbase-convo.zeabur.internal:8090`

### 3. 前端配置
- ✅ 使用相對路徑 `/pb` 訪問 PocketBase

---

## 📋 部署步驟

### 步驟 1: 提交代碼

```bash
git add nginx.conf telegram-webhook/src/index.ts
git commit -m "fix: 更新為正確的 Zeabur 服務名稱"
git push origin main
```

### 步驟 2: 等待 Zeabur 自動部署

1. 登入 [Zeabur Dashboard](https://zeabur.com)
2. 查看部署狀態
3. 等待所有服務部署完成

### 步驟 3: 設定環境變數

確認 `unified-commerce-hub-oscie` 服務的環境變數：

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

## 🧪 測試流程

### 測試 1: 服務健康檢查

```bash
# PocketBase
curl https://www.neovega.cc/pb/api/health

# telegram-webhook
curl https://www.neovega.cc/health

# Telegram Bot
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"
```

### 測試 2: Web Chat 完整流程

1. 訪問 https://www.neovega.cc/shop
2. 開啟聊天視窗
3. 發送測試訊息："你好"
4. 檢查 Telegram group (-1003806455231) 是否收到訊息
5. 在 Telegram 中回覆（使用 @umio 或直接回覆）
6. 確認 Web Chat 顯示回覆

### 測試 3: 檢查日誌

在 Zeabur Dashboard 中查看各服務的日誌：
- nginx 服務：確認沒有 DNS 解析錯誤
- unified-commerce-hub-oscie：確認訊息正常轉發
- PocketBase-convo：確認資料正常儲存

---

## 🔍 故障排除

### 如果仍然出現 502 錯誤

1. 檢查 `unified-commerce-hub-oscie` 服務是否正常運行
2. 檢查環境變數是否正確設定
3. 查看服務日誌

### 如果 Telegram 訊息沒有轉發到 Web Chat

1. 檢查 Webhook 是否正確設定
2. 檢查 PocketBase 連線
3. 查看 unified-commerce-hub-oscie 日誌

---

## 📚 參考文件

- `ZEABUR_DEPLOYMENT_GUIDE_20260312.md` - 完整部署指南
- `NGINX_RESOLVER_CONFIG.md` - nginx resolver 配置說明
- `ZEABUR_SERVICE_NAMES.md` - 服務名稱配置指南
- `test-zeabur-services.sh` - 服務健康檢查腳本

---

**最後更新**: 2026-03-12 10:35 (UTC+8)
