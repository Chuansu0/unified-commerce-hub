# 環境變數設定指南

**建立日期**: 2026-03-12  
**目的**: 修復 Mixed Content 錯誤和配置正確的服務連線

---

## 一、問題說明

### 1.1 Mixed Content 錯誤

**問題**：
- 網站使用 HTTPS (https://www.neovega.cc)
- 嘗試訪問 HTTP 資源 (http://your-domain/api/health)
- 瀏覽器阻止了這個請求

**解決方案**：
- 通過 nginx 代理 PocketBase
- 前端使用相對路徑 `/pb` 訪問 PocketBase
- 所有請求都通過 HTTPS

### 1.2 服務名稱更新

**PocketBase 服務名稱**：
- 舊名稱: `pocketbase:8090`
- 新名稱: `pocketbase-convo:8090` ✅

---

## 二、已完成的配置更新

### 2.1 nginx.conf ✅

**添加的配置**：

```nginx
# PocketBase API 代理
location /pb/ {
    resolver 8.8.8.8 valid=30s;
    set $pocketbase http://pocketbase-convo:8090;
    proxy_pass $pocketbase/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# PocketBase Realtime WebSocket
location /_/ {
    resolver 8.8.8.8 valid=30s;
    set $pocketbase http://pocketbase-convo:8090;
    proxy_pass $pocketbase/_/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**說明**：
- `/pb/` - 代理 PocketBase API 請求
- `/_/` - 代理 PocketBase Realtime WebSocket 連線
- 使用 DNS resolver 避免啟動時解析失敗
- 使用變數避免 nginx 在服務啟動前嘗試解析 DNS

### 2.2 前端配置 ✅

**src/services/pocketbase.ts**：

```typescript
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || '/pb';
```

**說明**：
- 預設使用相對路徑 `/pb`
- 通過 nginx 代理訪問 PocketBase
- 自動使用 HTTPS（與網站相同的協議）

### 2.3 telegram-webhook 配置 ✅

**telegram-webhook/src/index.ts**：

```typescript
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://pocketbase-convo:8090';
```

**說明**：
- 預設使用內部服務名稱 `pocketbase-convo:8090`
- 在 Docker/Zeabur 網路內部使用 HTTP（不需要 HTTPS）
- 可通過環境變數覆蓋

---

## 三、環境變數設定

### 3.1 前端服務（可選）

前端已經使用預設值 `/pb`，通常不需要設定環境變數。

如果需要自訂，可以設定：

```bash
VITE_POCKETBASE_URL=/pb
```

### 3.2 telegram-webhook 服務（必需）

**Zeabur 環境變數設定**：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `POCKETBASE_URL` | `http://pocketbase-convo:8090` | PocketBase 內部服務 URL |
| `TELEGRAM_BOT_TOKEN` | `8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw` | umio bot token |
| `OPENCLAW_CHAT_ID` | `-1003806455231` | Telegram group ID |
| `POCKETBASE_ADMIN_EMAIL` | `<您的管理員email>` | PocketBase 管理員帳號 |
| `POCKETBASE_ADMIN_PASSWORD` | `<您的管理員密碼>` | PocketBase 管理員密碼 |
| `PORT` | `3000` | 服務端口（可選） |

**設定步驟**：

1. 登入 Zeabur Dashboard
2. 選擇 `telegram-webhook` 服務
3. 進入 "Variables" 或"環境變數" 頁面
4. 添加上述環境變數
5. 儲存並重啟服務

### 3.3 驗證環境變數

**在 Zeabur 中查看日誌**：

```bash
# 服務啟動時會顯示：
Telegram Webhook Handler running on port 3000
PocketBase URL: http://pocketbase-convo:8090
Telegram Bot Token configured: true
```

**測試健康檢查**：

```bash
curl https://your-domain/health
```

預期回應：
```json
{
  "status": "ok",
  "pocketbase": "connected",
  "telegram": true,
  "timestamp": "2026-03-12T01:19:04.054Z"
}
```

---

## 四、部署步驟

### 4.1 更新 nginx 配置

1. 確認 `nginx.conf` 已包含 PocketBase 代理配置
2. 重新部署 nginx 服務
3. 驗證配置：
   ```bash
   curl https://your-domain/pb/api/health
   ```

### 4.2 更新 telegram-webhook 服務

1. 確認 `telegram-webhook/src/index.ts` 已更新
2. 設定 Zeabur 環境變數
3. 重新部署 telegram-webhook 服務
4. 檢查日誌確認服務正常啟動

### 4.3 設定 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain/webhook/telegram",
    "allowed_updates": ["message", "edited_message"],
    "drop_pending_updates": true
  }'
```

**驗證 Webhook**：

```bash
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
```

### 4.4 測試完整流程

1. **測試 PocketBase 連線**：
   ```bash
   # 從瀏覽器訪問
   https://your-domain/pb/api/health
   ```

2. **測試 Web Chat 發送訊息**：
   - 開啟 https://www.neovega.cc/shop
   - 開啟聊天視窗
   - 發送測試訊息

3. **檢查 Telegram Group**：
   - 確認收到 umio bot 的訊息
   - 格式：`[WebChat:guest:xxx] 測試訊息`

4. **檢查 OpenClaw 回覆**：
   - 等待 linus 或 andrea bot 回覆
   - 確認 Web Chat 顯示回覆

---

## 五、故障排除

### 5.1 Mixed Content 錯誤仍然出現

**檢查項目**：

1. **nginx 配置是否生效**：
   ```bash
   # 測試 /pb/ 路由
   curl https://your-domain/pb/api/health
   ```

2. **前端是否使用正確的 URL**：
   - 開啟瀏覽器開發者工具
   - 檢查 Network 標籤
   - 確認請求 URL 是 `https://your-domain/pb/...`

3. **環境變數是否正確**：
   ```bash
   # 在前端構建時
   echo $VITE_POCKETBASE_URL
   # 應該是 /pb 或未設定（使用預設值）
   ```

### 5.2 PocketBase 連線失敗

**檢查項目**：

1. **服務名稱是否正確**：
   ```bash
   # 在 telegram-webhook 容器中
   ping pocketbase-convo
   curl http://pocketbase-convo:8090/api/health
   ```

2. **環境變數是否正確**：
   ```bash
   # 在 telegram-webhook 容器中
   echo $POCKETBASE_URL
   # 應該是 http://pocketbase-convo:8090
   ```

3. **PocketBase 服務是否運行**：
   ```bash
   # 檢查 PocketBase 日誌
   # 在 Zeabur 中查看 pocketbase-convo 服務的日誌
   ```

### 5.3 WebSocket 連線失敗

**檢查項目**：

1. **nginx WebSocket 代理是否配置**：
   - 確認 `location /_/` 配置存在
   - 確認包含 `Upgrade` 和 `Connection` headers

2. **測試 WebSocket 連線**：
   ```javascript
   // 在瀏覽器 console 執行
   const ws = new WebSocket('wss://your-domain/_/');
   ws.onopen = () => console.log('WebSocket connected');
   ws.onerror = (e) => console.error('WebSocket error:', e);
   ```

3. **如果 WebSocket 無法使用**：
   - 參考 `webchat_diagnosis_fix_20260312.md`
   - 使用輪詢機制代替 realtime

### 5.4 Telegram Webhook 未收到訊息

**檢查項目**：

1. **Webhook URL 是否正確**：
   ```bash
   curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
   ```

2. **測試 webhook endpoint**：
   ```bash
   curl -X POST "https://your-domain/webhook/telegram" \
     -H "Content-Type: application/json" \
     -d '{"message": {"text": "test"}}'
   ```

3. **檢查 telegram-webhook 日誌**：
   - 在 Zeabur 中查看日誌
   - 確認服務正在運行
   - 確認沒有錯誤訊息

---

## 六、快速檢查清單

### 6.1 配置檢查

- [x] nginx.conf 包含 `/pb/` 和 `/_/` 代理配置
- [x] src/services/pocketbase.ts 使用 `/pb` 作為預設 URL
- [x] telegram-webhook/src/index.ts 使用 `pocketbase-convo:8090`
- [ ] Zeabur 環境變數已設定
- [ ] nginx 服務已重啟
- [ ] telegram-webhook 服務已重啟

### 6.2 測試檢查

- [ ] `https://your-domain/pb/api/health` 回應正常
- [ ] `https://your-domain/health` 回應正常
- [ ] Telegram webhook 已設定
- [ ] Web Chat 可以發送訊息
- [ ] Telegram group 收到訊息
- [ ] Web Chat 顯示回覆

### 6.3 服務健康檢查

```bash
# 1. PocketBase
curl https://your-domain/pb/api/health

# 2. telegram-webhook
curl https://your-domain/health

# 3. Telegram Bot
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"

# 4. Telegram Webhook
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
```

---

## 七、下一步

### 7.1 立即執行

1. ✅ 更新 nginx.conf（已完成）
2. ✅ 更新 telegram-webhook/src/index.ts（已完成）
3. ⏳ 設定 Zeabur 環境變數
4. ⏳ 重啟服務
5. ⏳ 設定 Telegram Webhook
6. ⏳ 測試完整流程

### 7.2 驗證步驟

1. 在瀏覽器訪問 `https://www.neovega.cc/shop`
2. 開啟開發者工具（F12）
3. 開啟聊天視窗
4. 檢查 Console 是否有錯誤
5. 檢查 Network 標籤，確認所有請求都是 HTTPS
6. 發送測試訊息
7. 確認 Telegram group 收到訊息
8. 確認 Web Chat 顯示回覆

### 7.3 如果遇到問題

參考以下文件：
- `webchat_diagnosis_fix_20260312.md` - 詳細的診斷和修復指南
- `webchat_20260311_final_job_opus.md` - 完整的工作計畫

---

**最後更新**: 2026-03-12 09:19 (UTC+8)
