# Web Chat 系統診斷與修復指南

**建立日期**: 2026-03-12  
**目的**: 診斷並修復 Web Chat 與 Telegram OpenClaw 整合的問題

---

## 一、當前架構概述

### 1.1 訊息流程

```
Web Chat (www.neovega.cc)
    ↓ useTelegramChat.sendMessage()
    ↓ sendToOpenClaw() → /api/send-to-openclaw
nginx 反向代理
    ↓ proxy_pass http://telegram-webhook:3000
telegram-webhook 服務
    ↓ umio bot 發送訊息
Telegram Group (ID: -1003806455231)
    ↓ [WebChat:userId] message
OpenClaw Agents (linus, andrea)
    ↓ 看到訊息並回覆
    ↓ [WebChat:userId] reply
Telegram Webhook
    ↓ POST /webhook/telegram
telegram-webhook 服務
    ↓ handleOpenClawReply()
    ↓ 儲存到 PocketBase messages collection
PocketBase Realtime
    ↓ pb.collection('messages').subscribe()
useTelegramChat hook
    ↓ subscribeToReplies()
Web Chat 顯示回覆
```

### 1.2 關鍵組件

1. **前端** (`src/hooks/useTelegramChat.ts`)
   - 發送訊息到 `/api/send-to-openclaw`
   - 訂閱 PocketBase realtime 更新

2. **後端** (`telegram-webhook/src/index.ts`)
   - 接收 Web Chat 訊息
   - 使用 umio bot 轉發到 Telegram
   - 處理 OpenClaw 回覆
   - 儲存到 PocketBase

3. **反向代理** (`nginx.conf`)
   - 路由 `/api/send-to-openclaw` 到 telegram-webhook
   - 路由 `/webhook/telegram` 到 telegram-webhook

---

## 二、常見問題診斷

### 2.1 PocketBase Realtime 連線失敗

**症狀**：
- Web Chat 無法接收 OpenClaw 的回覆
- 瀏覽器 console 顯示 WebSocket 連線錯誤
- `Failed to subscribe to replies` 錯誤

**可能原因**：
1. PocketBase URL 不正確
2. PocketBase realtime API 未啟用
3. 網路連線問題
4. CORS 設定問題

**診斷步驟**：

```bash
# 1. 檢查 PocketBase 服務是否運行
curl http://pocketbase:8090/api/health

# 2. 檢查 PocketBase 是否可從前端訪問
# 在瀏覽器 console 執行：
fetch('http://your-domain/api/health').then(r => r.json())

# 3. 檢查 WebSocket 連線
# 在瀏覽器 console 執行：
const ws = new WebSocket('ws://your-domain/_/');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (e) => console.error('WebSocket error:', e);
```

**修復方案**：

**方案 A: 確保 PocketBase URL 正確**

檢查 `src/services/pocketbase.ts`:
```typescript
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');
```

確保環境變數 `VITE_POCKETBASE_URL` 設定正確。

**方案 B: 配置 nginx 代理 PocketBase**

在 `nginx.conf` 中添加：
```nginx
location /pb/ {
    proxy_pass http://pocketbase:8090/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /_/ {
    proxy_pass http://pocketbase:8090/_/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

然後更新 `VITE_POCKETBASE_URL=/pb`

**方案 C: 使用輪詢代替 realtime**

如果 WebSocket 無法使用，修改 `src/services/telegram.ts`:
```typescript
export async function subscribeToReplies(
    sessionId: string,
    onReply: (content: string) => void
): Promise<() => void> {
    let intervalId: NodeJS.Timeout;
    let lastMessageId = '';

    const poll = async () => {
        try {
            const records = await pb.collection('messages').getList(1, 10, {
                filter: `sessionId = "${sessionId}" && sender = "assistant"`,
                sort: '-created',
            });

            if (records.items.length > 0 && records.items[0].id !== lastMessageId) {
                lastMessageId = records.items[0].id;
                onReply(records.items[0].content);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    };

    // 每 2 秒輪詢一次
    intervalId = setInterval(poll, 2000);
    poll(); // 立即執行一次

    return () => clearInterval(intervalId);
}
```

### 2.2 DNS 解析問題

**症狀**：
- nginx 無法啟動
- 錯誤訊息: `host not found in upstream "telegram-webhook"`
- 服務間無法通訊

**可能原因**：
1. Docker 網路配置問題
2. 服務名稱不正確
3. nginx 在服務啟動前嘗試解析 DNS

**診斷步驟**：

```bash
# 1. 檢查 Docker 網路
docker network ls
docker network inspect <network_name>

# 2. 檢查服務是否在同一網路
docker ps
docker inspect <container_id> | grep NetworkMode

# 3. 測試服務間連線
docker exec <nginx_container> ping telegram-webhook
docker exec <nginx_container> curl http://telegram-webhook:3000/health
```

**修復方案**：

**方案 A: 使用變數避免啟動時解析**

`nginx.conf` 已經使用了這個方案：
```nginx
resolver 8.8.8.8 valid=30s;
set $telegram_webhook telegram-webhook:3000;
proxy_pass http://$telegram_webhook;
```

**方案 B: 確保所有服務在同一 Docker 網路**

在 `docker-compose.yml` 或 Zeabur 配置中確保：
```yaml
services:
  nginx:
    networks:
      - app-network
  telegram-webhook:
    networks:
      - app-network
  pocketbase:
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**方案 C: 使用 IP 地址代替服務名稱**

如果 DNS 解析持續失敗，可以使用內部 IP：
```nginx
set $telegram_webhook 10.0.0.5:3000;  # 替換為實際 IP
```

### 2.3 Telegram Webhook 未收到訊息

**症狀**：
- Web Chat 發送訊息後沒有反應
- Telegram group 沒有收到訊息
- telegram-webhook 日誌沒有請求記錄

**可能原因**：
1. Telegram webhook 未正確設定
2. webhook URL 不正確
3. umio bot token 不正確
4. 網路防火牆阻擋

**診斷步驟**：

```bash
# 1. 檢查 webhook 設定
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"

# 2. 測試 bot token
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"

# 3. 測試 webhook endpoint
curl -X POST "https://your-domain/webhook/telegram" \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "test"}}'

# 4. 檢查 telegram-webhook 日誌
# 在 Zeabur 或 Docker 中查看日誌
```

**修復方案**：

**方案 A: 重新設定 Telegram Webhook**

```bash
# 刪除現有 webhook
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/deleteWebhook"

# 設定新的 webhook
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain/webhook/telegram",
    "allowed_updates": ["message", "edited_message"],
    "drop_pending_updates": true
  }'
```

**方案 B: 使用 ngrok 測試本地開發**

```bash
# 啟動 ngrok
ngrok http 3000

# 設定 webhook 到 ngrok URL
curl -X POST "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/webhook/telegram"}'
```

### 2.4 OpenClaw Agents 未回覆

**症狀**：
- Telegram group 收到 umio bot 的訊息
- 但 linus/andrea agents 沒有回覆
- Web Chat 沒有收到回覆

**可能原因**：
1. linus/andrea bots 未加入 Telegram group
2. OpenClaw 服務未運行
3. OpenClaw 配置錯誤
4. bots 沒有權限

**診斷步驟**：

```bash
# 1. 檢查 group 成員
# 在 Telegram group 中查看成員列表，確認 linus 和 andrea bots 在列表中

# 2. 檢查 OpenClaw 服務
curl http://openclaw-service:port/health

# 3. 檢查 OpenClaw 日誌
# 查看 OpenClaw 是否收到訊息並嘗試回覆

# 4. 測試 bot 是否可以發送訊息
curl -X POST "https://api.telegram.org/bot<linus_token>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "-1003806455231",
    "text": "Test message from linus"
  }'
```

**修復方案**：

**方案 A: 將 bots 加入 Telegram Group**

1. 在 Telegram 中開啟 group
2. 點擊 "Add Members"
3. 搜尋並添加 @linus_bot 和 @andrea_bot
4. 確保 bots 有 "Send Messages" 權限

**方案 B: 檢查 OpenClaw 配置**

確認 `zeabur_openclaw_config_20260310.json` 中：
- Telegram channel 已啟用
- linus 和 andrea accounts 配置正確
- bindings 正確綁定 agents 到 telegram channel

**方案 C: 重啟 OpenClaw 服務**

```bash
# 重啟 OpenClaw 以應用配置更改
# 在 Zeabur 或 Docker 中重啟服務
```

---

## 三、環境變數檢查清單

### 3.1 telegram-webhook 服務

```bash
# 必需的環境變數
TELEGRAM_BOT_TOKEN=8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_password
WEBHOOK_SECRET=your_random_secret

# 可選的環境變數
PORT=3000
NODE_ENV=production
```

### 3.2 前端服務

```bash
# 必需的環境變數
VITE_POCKETBASE_URL=http://your-domain/pb
# 或
VITE_POCKETBASE_URL=http://localhost:8090  # 開發環境
```

### 3.3 驗證環境變數

```bash
# 在 telegram-webhook 容器中
echo $TELEGRAM_BOT_TOKEN
echo $OPENCLAW_CHAT_ID
echo $POCKETBASE_URL

# 在前端構建時
echo $VITE_POCKETBASE_URL
```

---

## 四、完整測試流程

### 4.1 單元測試

**測試 1: PocketBase 連線**
```bash
curl http://pocketbase:8090/api/health
# 預期: {"code": 200, "message": "OK"}
```

**測試 2: telegram-webhook 服務**
```bash
curl http://telegram-webhook:3000/health
# 預期: {"status": "ok"}
```

**測試 3: Telegram Bot API**
```bash
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe"
# 預期: {"ok": true, "result": {...}}
```

**測試 4: Telegram Webhook**
```bash
curl "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo"
# 預期: {"ok": true, "result": {"url": "https://your-domain/webhook/telegram", ...}}
```

### 4.2 整合測試

**測試流程**:

1. **發送測試訊息**
   - 開啟 www.neovega.cc
   - 開啟聊天視窗
   - 發送: "Hello from Web Chat"

2. **檢查 Telegram Group**
   - 開啟 Telegram group (ID: -1003806455231)
   - 確認收到 umio bot 的訊息
   - 格式應為: `[WebChat:guest:xxx] Hello from Web Chat`

3. **OpenClaw Agent 回覆**
   - 等待 linus 或 andrea bot 回覆
   - 回覆格式應為: `[WebChat:guest:xxx] <回覆內容>`

4. **檢查 Web Chat**
   - 回到 www.neovega.cc 聊天視窗
   - 確認顯示 OpenClaw 的回覆

5. **檢查 PocketBase**
   - 登入 PocketBase Admin UI
   - 檢查 `messages` collection
   - 確認訊息已儲存

### 4.3 錯誤追蹤

**啟用詳細日誌**:

在 `telegram-webhook/src/index.ts` 中添加：
```typescript
// 在每個關鍵點添加日誌
console.log('[DEBUG] Received message:', req.body);
console.log('[DEBUG] Sending to Telegram:', message);
console.log('[DEBUG] Telegram response:', response);
console.log('[DEBUG] Saved to PocketBase:', record);
```

**查看日誌**:
```bash
# Zeabur
zeabur logs <service_name>

# Docker
docker logs <container_name> -f

# 本地開發
npm run dev  # 查看 console 輸出
```

---

## 五、快速修復腳本

### 5.1 重置 Telegram Webhook

建立 `scripts/reset-webhook.sh`:
```bash
#!/bin/bash

BOT_TOKEN="8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw"
WEBHOOK_URL="https://your-domain/webhook/telegram"

echo "Deleting existing webhook..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"

echo "\nSetting new webhook..."
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\", \"drop_pending_updates\": true}"

echo "\nChecking webhook info..."
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

### 5.2 測試訊息流程

建立 `scripts/test-message-flow.sh`:
```bash
#!/bin/bash

API_URL="https://your-domain/api/send-to-openclaw"
SESSION_ID="test_$(date +%s)"

echo "Sending test message..."
curl -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Test message at $(date)\",
    \"userId\": \"${SESSION_ID}\",
    \"sessionId\": \"${SESSION_ID}\"
  }"

echo "\nMessage sent. Check Telegram group for the message."
```

### 5.3 檢查服務健康狀態

建立 `scripts/health-check.sh`:
```bash
#!/bin/bash

echo "Checking PocketBase..."
curl -s http://pocketbase:8090/api/health || echo "❌ PocketBase not responding"

echo "\nChecking telegram-webhook..."
curl -s http://telegram-webhook:3000/health || echo "❌ telegram-webhook not responding"

echo "\nChecking Telegram Bot..."
curl -s "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe" | grep -q "ok" && echo "✅ Bot is active" || echo "❌ Bot not responding"

echo "\nChecking Webhook..."
curl -s "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo" | grep -q "url" && echo "✅ Webhook is set" || echo "❌ Webhook not set"
```

---

## 六、故障排除決策樹

```
訊息未送達 Telegram?
├─ YES → 檢查 telegram-webhook 服務
│   ├─ 服務未運行? → 啟動服務
│   ├─ 環境變數錯誤? → 修正環境變數
│   └─ Bot token 錯誤? → 更新 token
│
└─ NO → OpenClaw 未回覆?
    ├─ YES → 檢查 OpenClaw 服務
    │   ├─ 服務未運行? → 啟動服務
    │   ├─ Bots 未加入 group? → 添加 bots
    │   └─ 配置錯誤? → 修正配置
    │
    └─ NO → Web Chat 未顯示回覆?
        ├─ YES → 檢查 PocketBase realtime
        │   ├─ WebSocket 連線失敗? → 使用輪詢
        │   ├─ CORS 問題? → 配置 nginx 代理
        │   └─ URL 錯誤? → 修正 POCKETBASE_URL
        │
        └─ NO → 系統正常運作 ✅
```

---

## 七、下一步行動

### 7.1 立即執行

1. ✅ 檢查所有環境變數是否正確設定
2. ✅ 執行健康檢查腳本
3. ✅ 重置 Telegram webhook
4. ✅ 測試完整訊息流程

### 7.2 短期優化

1. 實作輪詢機制作為 realtime 的備援
2. 添加詳細的錯誤日誌
3. 建立監控儀表板
4. 實作自動重試機制

### 7.3 長期改進

1. 實作訊息佇列（Redis/RabbitMQ）
2. 添加訊息持久化
3. 實作負載平衡
4. 添加效能監控

---

**最後更新**: 2026-03-12 09:07 (UTC+8)
