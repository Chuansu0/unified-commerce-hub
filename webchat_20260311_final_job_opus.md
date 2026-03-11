# Web Chat 透過 Telegram 與 OpenClaw 整合 - 最終工作計畫

**建立日期**: 2026-03-11  
**專案**: unified-commerce-hub  
**目標**: 實現 www.neovega.cc 線上聊天與 Telegram OpenClaw agents 的雙向通訊

---

## 一、專案概述

### 1.1 需求說明

- **umio bot** 在 Telegram chat 的發言 = www.neovega.cc 線上聊天客戶的發言
- Telegram chat 裡其他 agent 對 umio 的發言 = 回覆到 www.neovega.cc 的線上聊天室

### 1.2 架構說明

```
Web Chat (www.neovega.cc)
    ↓ 用戶發送訊息
telegram-webhook 服務 (/api/send-to-openclaw)
    ↓ umio bot 發送
Telegram Group (ID: -1003806455231)
    ↓ linus/andrea agents 看到並回覆
OpenClaw Agents (linus, andrea)
    ↓ 回覆訊息
Telegram Webhook
    ↓ handleOpenClawReply
PocketBase (儲存對話)
    ↓ Web Chat 讀取
Web Chat 顯示回覆
```

### 1.3 涉及的 Telegram Bots

1. **umio bot** (Token: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`)
   - 用途: telegram-webhook 服務使用
   - 功能: 代表 Web Chat 用戶發言、接收 webhook

2. **linus bot** (OpenClaw agent)
   - 用途: OpenClaw 基礎設施工程師
   - 功能: 在 Telegram group 中回覆訊息

3. **andrea bot** (OpenClaw agent)
   - 用途: OpenClaw 執行助理
   - 功能: 在 Telegram group 中回覆訊息

---

## 二、OpenClaw 配置

### 2.1 匿名訪問設定 ✅ 已完成

OpenClaw 配置檔案 (`zeabur_openclaw_config_20260310.json`) 中已包含：

```json
{
  "gateway": {
    "mode": "local",
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true,
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "trustedProxies": ["10.0.0.0/8", "172.16.0.0/12"]
  }
}
```

**說明**: `dangerouslyDisableDeviceAuth: true` 已禁用 device identity 驗證，解決了 "device identity required" 錯誤。

### 2.2 Telegram Channel 配置

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "accounts": {
        "linus": {
          "botToken": "<linus_bot_token>"
        },
        "andrea": {
          "botToken": "<andrea_bot_token>"
        },
        "default": {
          "botToken": "<default_bot_token>"
        }
      },
      "dmPolicy": "open",
      "groupPolicy": "open"
    }
  }
}
```

### 2.3 Agent Bindings

```json
{
  "bindings": [
    {
      "agentId": "linus",
      "channelId": "telegram",
      "accountId": "linus"
    },
    {
      "agentId": "andrea",
      "channelId": "telegram",
      "accountId": "andrea"
    },
    {
      "agentId": "main",
      "channelId": "web"
    }
  ]
}
```

---

## 三、部署步驟

### 3.1 Zeabur 環境變數設定

**服務**: telegram-webhook

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `TELEGRAM_BOT_TOKEN` | `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw` | umio bot token |
| `OPENCLAW_CHAT_ID` | `-1003806455231` | Telegram group ID |
| `POCKETBASE_URL` | `http://pocketbase:8090` | PocketBase 內部服務 URL |
| `POCKETBASE_ADMIN_EMAIL` | `<您的管理員email>` | PocketBase 管理員帳號 |
| `POCKETBASE_ADMIN_PASSWORD` | `<您的管理員密碼>` | PocketBase 管理員密碼 |
| `WEBHOOK_SECRET` | `<隨機生成的密鑰>` | Webhook 驗證密鑰 |

**生成隨機密鑰**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.2 設定 Telegram Webhook

**方法 1: 使用 curl**
```bash
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<您的域名>/webhook/telegram",
    "allowed_updates": ["message", "edited_message"]
  }'
```

**方法 2: 使用瀏覽器**
```
https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook?url=https://<您的域名>/webhook/telegram
```

**驗證 Webhook 設定**:
```bash
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
```

### 3.3 Telegram Group 設定

**必須完成的步驟**:

1. **建立 Telegram Group** (如果尚未建立)
   - Group ID: `-1003806455231`

2. **將所有 bots 加入 group**:
   - ✅ umio bot (8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw)
   - ✅ linus bot (OpenClaw agent)
   - ✅ andrea bot (OpenClaw agent)

3. **設定 bot 權限**:
   - 所有 bots 都需要有「發送訊息」權限
   - umio bot 需要有「讀取所有訊息」權限（用於接收 webhook）

4. **取得 Group ID** (如果不確定):
   ```bash
   # 在 group 中發送訊息後，使用以下 API 查看
   curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getUpdates"
   ```

### 3.4 重啟服務

**重啟順序**:
1. OpenClaw 服務（確保配置生效）
2. telegram-webhook 服務（確保環境變數生效）
3. PocketBase 服務（確保資料庫連線正常）
4. 前端服務（確保 Web Chat 正常運作）

---

## 四、程式碼檢查清單

### 4.1 telegram-webhook/src/index.ts ✅

**關鍵功能**:
- ✅ `/api/send-to-openclaw` - 接收 Web Chat 訊息並轉發到 Telegram
- ✅ `handleOpenClawReply` - 處理 OpenClaw 回覆並儲存到 PocketBase
- ✅ 排除 umio bot 自己的訊息（避免循環）
- ✅ 支援 `[WebChat:userId]` 和 `[WebChat:guest:sessionId]` 格式

### 4.2 src/hooks/useTelegramChat.ts ✅

**關鍵功能**:
- ✅ `sendMessage` - 發送訊息到 `/api/send-to-openclaw`
- ✅ `subscribeToReplies` - 訂閱 PocketBase 的訊息更新
- ✅ 支援 userId 和 sessionId

### 4.3 src/services/telegram.ts ✅

**關鍵功能**:
- ✅ `sendToOpenClaw` - 發送訊息到 telegram-webhook
- ✅ `subscribeToReplies` - 訂閱 PocketBase 的訊息更新

### 4.4 src/components/storefront/ChatWidget.tsx ✅

**關鍵功能**:
- ✅ 使用 `useTelegramChat` hook
- ✅ 顯示訊息歷史
- ✅ 發送訊息功能

### 4.5 nginx.conf ✅

**關鍵路由**:
```nginx
location /api/send-to-openclaw {
    proxy_pass http://telegram-webhook:3000;
}

location /webhook/telegram {
    proxy_pass http://telegram-webhook:3000;
}
```

---

## 五、測試驗證步驟

### 5.1 基本連線測試

**測試 1: PocketBase 連線**
```bash
curl http://pocketbase:8090/api/health
```

**測試 2: telegram-webhook 服務**
```bash
curl http://telegram-webhook:3000/health
```

**測試 3: Telegram Bot API**
```bash
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"
```

### 5.2 訊息流程測試

**測試流程**:

1. **Web Chat → Telegram**
   - 在 www.neovega.cc 開啟聊天視窗
   - 發送測試訊息: "Hello from Web Chat"
   - 檢查 Telegram group 是否收到 umio bot 的訊息
   - 預期格式: `[WebChat:guest:xxx] Hello from Web Chat`

2. **Telegram → Web Chat**
   - 在 Telegram group 中，使用 linus 或 andrea bot 回覆
   - 回覆格式: `[WebChat:guest:xxx] Hello from OpenClaw`
   - 檢查 www.neovega.cc 聊天視窗是否顯示回覆

3. **檢查 PocketBase 資料**
   - 登入 PocketBase Admin UI
   - 檢查 `conversations` 和 `messages` collection
   - 確認訊息已正確儲存

### 5.3 錯誤排查

**常見問題**:

1. **PocketBase 連線失敗**
   - 錯誤: `Error: connect ECONNREFUSED`
   - 解決: 確認 `POCKETBASE_URL=http://pocketbase:8090`（不是外部 IP）

2. **Telegram Webhook 未收到訊息**
   - 檢查: `curl "https://api.telegram.org/bot.../getWebhookInfo"`
   - 確認: `url` 正確且 `pending_update_count` 為 0

3. **OpenClaw agents 未回覆**
   - 確認: linus 和 andrea bots 已加入 Telegram group
   - 確認: OpenClaw 服務正在運行
   - 檢查: OpenClaw logs

---

## 六、工作檢查清單

### 6.1 配置檢查

- [x] OpenClaw 配置包含 `dangerouslyDisableDeviceAuth: true`
- [x] OpenClaw Telegram channel 已啟用
- [x] OpenClaw agents (linus, andrea) 已配置
- [x] telegram-webhook 程式碼已完成
- [x] nginx.conf 路由已配置
- [ ] Zeabur 環境變數已設定
- [ ] Telegram webhook 已設定
- [ ] 所有 bots 已加入 Telegram group

### 6.2 部署檢查

- [ ] telegram-webhook 服務已部署到 Zeabur
- [ ] 環境變數已正確設定
- [ ] Telegram webhook URL 已設定
- [ ] OpenClaw 服務已重啟
- [ ] PocketBase 服務正常運行
- [ ] 前端服務正常運行

### 6.3 測試檢查

- [ ] PocketBase 連線測試通過
- [ ] telegram-webhook 服務測試通過
- [ ] Telegram Bot API 測試通過
- [ ] Web Chat → Telegram 訊息流程測試通過
- [ ] Telegram → Web Chat 訊息流程測試通過
- [ ] PocketBase 資料儲存測試通過

---

## 七、後續優化建議

### 7.1 功能增強

1. **訊息格式優化**
   - 支援 Markdown 格式
   - 支援圖片、檔案傳輸
   - 支援表情符號

2. **錯誤處理**
   - 增加重試機制
   - 增加錯誤通知
   - 增加日誌記錄

3. **效能優化**
   - 增加訊息快取
   - 優化資料庫查詢
   - 增加連線池

### 7.2 監控與維護

1. **監控指標**
   - 訊息發送成功率
   - 訊息延遲時間
   - 服務可用性

2. **日誌管理**
   - 集中式日誌收集
   - 錯誤追蹤
   - 效能分析

3. **備份策略**
   - PocketBase 資料備份
   - 配置檔案備份
   - 定期備份驗證

---

## 八、聯絡資訊

**Telegram Group ID**: `-1003806455231`  
**umio Bot Token**: `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw`  
**網站**: www.neovega.cc

---

## 九、參考文件

- `telegram-webhook/DEPLOY.md` - 部署說明
- `telegram-webhook/.env.example` - 環境變數範例
- `zeabur_openclaw_config_20260310.json` - OpenClaw 配置
- `webchat_via_telegram_openclaw-3-report-GLM5.md` - 實作報告

---

**最後更新**: 2026-03-11 23:42 (UTC+8)
