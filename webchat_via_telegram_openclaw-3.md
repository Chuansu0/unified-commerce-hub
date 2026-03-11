# Web Chat 通過 Telegram 與 OpenClaw 通訊整合方案 - 第三階段

**日期**：2026-03-11  
**版本**：v3.0  
**狀態**：待實施  
**前置文件**：webchat_via_telegram_openclaw-2.md、webchat_via_telegram_openclaw-2-report-GLM5.md

---

## 1. 第二階段執行成果檢視與問題發現

### 1.1 已完成項目 ✅

| 任務 | 檔案 | 狀態 |
|------|------|------|
| 任務1：ChatWidget 改用 Telegram 中繼 | `src/components/storefront/ChatWidget.tsx` | ✅ 完成 |
| 任務2：擴充 Telegram 服務模組 | `src/services/telegram.ts` | ✅ 完成 |
| 任務3：建立 useTelegramChat hook | `src/hooks/useTelegramChat.ts` | ✅ 完成 |
| 任務4：改進 handleOpenClawReply | `telegram-webhook/src/index.ts` | ⚠️ 部分完成 |
| 任務5：改進訊息格式解析 | `telegram-webhook/src/index.ts` | ✅ 完成 |
| 任務7：更新 nginx 配置 | `nginx.conf` | ⚠️ 部分完成 |

### 1.2 發現的問題 ❌

#### 問題 A：handleOpenClawReply 未被正確呼叫

**現況**：`/webhook/telegram` 端點中只呼叫了 `handleIncomingMessage`，未根據 chat ID 區分是否為 OpenClaw 的回覆：

```typescript
// 目前的程式碼（有問題）
app.post('/webhook/telegram', async (req: Request, res: Response) => {
    // ...
    if (update.message) {
        await handleIncomingMessage(update.message);  // ← 所有訊息都走這裡
    }
    // ...
});
```

**應該改為**：
```typescript
app.post('/webhook/telegram', async (req: Request, res: Response) => {
    // ...
    if (update.message) {
        const chatId = update.message.chat.id;
        if (chatId.toString() === OPENCLAW_CHAT_ID) {
            await handleOpenClawReply(update.message);  // ← OpenClaw 回覆
        } else {
            await handleIncomingMessage(update.message);  // ← 一般用戶訊息
        }
    }
    // ...
});
```

#### 問題 B：nginx.conf 不完整

**現況**：只添加了 `/api/send-to-openclaw` 一個路由，缺少以下路由：
- `/webhook/telegram` — Telegram webhook 回調
- `/api/bind-telegram` — 綁定 API
- `/api/unbind-telegram` — 解綁 API
- `/api/telegram-status` — 狀態查詢 API

#### 問題 C：nginx proxy_pass 路徑問題

**現況**：
```nginx
location /api/send-to-openclaw {
    proxy_pass http://telegram-webhook:3000/send-to-openclaw;  # ← 路徑不對
}
```

**問題**：telegram-webhook 的路由是 `/api/send-to-openclaw`，但 proxy_pass 去掉了 `/api` 前綴。

**應該改為**：
```nginx
location /api/send-to-openclaw {
    proxy_pass http://telegram-webhook:3000/api/send-to-openclaw;
}
```

#### 問題 D：sendToOpenClaw 參數不一致

**現況**：`src/services/telegram.ts` 中的 `sendToOpenClaw` 接受 `(userId, message)` 兩個獨立參數：
```typescript
export async function sendToOpenClaw(userId: string, message: string): Promise<void> {
    body: JSON.stringify({ userId, message }),
```

**但 telegram-webhook 端點期望**：`{ message, userId, sessionId }`

缺少 `sessionId` 參數，訪客用戶無法使用。

### 1.3 未執行項目

| 任務 | 說明 | 狀態 |
|------|------|------|
| 任務6：設定 Telegram Webhook | 需要人類執行 API 呼叫 | ❌ 未完成 |
| 任務8：環境變數配置 | 需要在 Zeabur 設定 | ❌ 未完成 |
| 任務9：Docker 配置 | docker-compose 整合 | ❌ 未執行 |
| 任務10：端到端測試 | 需要完整環境 | ❌ 未執行 |

---

## 2. 架構澄清與環境變數配置說明

### 2.1 關鍵架構問題：OpenClaw 自帶 Telegram vs 我們的 telegram-webhook 服務

**您的問題**：目前 Zeabur 上的 Telegram 是 OpenClaw 自帶的，那 `telegram-webhook` 服務是必須另外架設嗎？

**答案：是的，`telegram-webhook` 服務必須在 Zeabur 上另外架設。**

**理由**：OpenClaw 自帶的 Telegram 整合，其功能是「接收來自 Telegram 群組/頻道的訊息，並由 OpenClaw AI 處理後回覆」。但這個整合是 **OpenClaw → Telegram** 的單向，沒有辦法讓「Web Chat 頁面的訊息」經由 Telegram 送進 OpenClaw，更無法讓 OpenClaw 的回覆即時推播回 Web Chat 介面。

我們的 `telegram-webhook` 服務扮演的角色是：

```
[架構對比]

OpenClaw 自帶的 Telegram 整合：
Telegram → OpenClaw（AI 處理）→ Telegram 回覆

我們需要的完整架構：
Web Chat 
  → telegram-webhook (/api/send-to-openclaw)
  → Telegram Bot API
  → Telegram Chat（OpenClaw 監聽的 Chat）
  → OpenClaw 處理後回覆到 Telegram
  → telegram-webhook (/webhook/telegram，接收回覆)
  → PocketBase messages（儲存回覆）
  → PocketBase Realtime 推播
  → Web Chat 顯示回覆
```

**結論**：
- OpenClaw 自帶的 Telegram = 處理 Telegram 使用者傳來的訊息
- 我們的 telegram-webhook = 橋接 Web Chat 到 Telegram（再到 OpenClaw）的中介服務
- **兩者是互補的，不是替代關係**，必須同時存在

### 2.2 各服務環境變數配置表

以下所有環境變數都應設定在 **Zeabur 上的 `telegram-webhook` 服務**中：

| 環境變數 | 設定位置 | 說明 |
|---------|---------|------|
| `TELEGRAM_BOT_TOKEN` | **telegram-webhook 服務** | Telegram Bot Token（@neovegaandrea_bot 的 Token） |
| `OPENCLAW_CHAT_ID` | **telegram-webhook 服務** | OpenClaw 監聽的 Chat ID（`-1003806455231`） |
| `POCKETBASE_URL` | **telegram-webhook 服務** | PocketBase 內部服務 URL |
| `POCKETBASE_ADMIN_EMAIL` | **telegram-webhook 服務** | PocketBase 管理員 Email（`admin@neovega.cc`） |
| `POCKETBASE_ADMIN_PASSWORD` | **telegram-webhook 服務** | PocketBase 管理員密碼 |
| `PORT` | **telegram-webhook 服務** | 服務監聽埠號（預設 3000） |

**不需要**設定在 OpenClaw 服務的環境變數：以上這些都與 OpenClaw 服務無關，OpenClaw 有它自己的設定。

**為什麼 telegram-webhook 需要 POCKETBASE_ADMIN_EMAIL？**

因為 `telegram-webhook/src/index.ts` 的 `subscribeToMessages()` 函數需要以 **PocketBase 管理員**身份認證，才能訂閱 messages collection 並讀取任意用戶的資料：

```typescript
async function subscribeToMessages(): Promise<void> {
    if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.POCKETBASE_ADMIN_PASSWORD
        );
    }
    // 訂閱 messages collection...
}
```

### 2.3 Zeabur 服務架構圖

```
Zeabur 平台
├── unified-commerce-hub（前端 + nginx）
│   ├── 服務 URL：https://www.neovega.cc
│   └── 環境變數：（無需 Telegram 相關設定）
│
├── pocketbase（資料庫）
│   ├── 服務 URL：http://pocketbase:8090（內部）
│   └── 管理密碼：由 PocketBase 本身管理
│
├── telegram-webhook（中介服務）← 需要新增此服務
│   ├── 監聽 Port：3000
│   └── 環境變數：
│       ├── TELEGRAM_BOT_TOKEN
│       ├── OPENCLAW_CHAT_ID
│       ├── POCKETBASE_URL
│       ├── POCKETBASE_ADMIN_EMAIL
│       ├── POCKETBASE_ADMIN_PASSWORD
│       └── PORT
│
└── OpenClaw（AI Agent，OpenClaw 自帶 Telegram 整合）
    └── 自帶 Telegram Bot 整合（獨立運作，無需我們設定）
```

---

## 3. Telegram Webhook 設定修正

### 3.1 用戶執行的命令問題分析

用戶執行的命令：
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/telegram-webhook",
    "allowed_updates": ["message"]
  }'
```

**問題**：
1. `bot<YOUR_BOT_TOKEN>` 未替換為實際的 Bot Token
2. `url` 欄位使用了 Token 作為域名，應該使用實際的網站域名
3. 路徑 `/telegram-webhook` 不正確，應該是 `/webhook/telegram`

### 3.2 正確的設定命令

```bash
# 設定 Webhook（正確命令）
curl -X POST "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'

# 驗證設定
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"
```

### 3.3 前置條件

在設定 Webhook 之前，必須確保：
1. ✅ telegram-webhook 服務已在 Zeabur 上部署並運行
2. ✅ nginx 已配置 `/webhook/telegram` 路由
3. ✅ HTTPS 憑證有效（www.neovega.cc）
4. ✅ 環境變數已正確設定

---

## 4. 第三階段實施計畫

### 任務 3-1：修復 webhook/telegram 端點路由判斷

**檔案**：`telegram-webhook/src/index.ts`

**修改內容**：在 `/webhook/telegram` 端點中，根據 chat ID 區分 OpenClaw 回覆和一般用戶訊息。

```typescript
app.post('/webhook/telegram', async (req: Request, res: Response) => {
    try {
        const update: TelegramUpdate = req.body;
        console.log('Received Telegram update:', JSON.stringify(update, null, 2));

        if (update.message) {
            const chatId = update.message.chat.id;

            // 檢查是否來自 OpenClaw Chat
            if (chatId.toString() === OPENCLAW_CHAT_ID) {
                await handleOpenClawReply(update.message);
            } else {
                await handleIncomingMessage(update.message);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.sendStatus(500);
    }
});
```

---

### 任務 3-2：補全 nginx.conf 路由

**檔案**：`nginx.conf`

**新增/修正路由**：

```nginx
server {
    listen 8080;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # ============================================
    # Telegram Webhook 相關路由
    # ============================================

    # Telegram Webhook 回調（Telegram 伺服器 → telegram-webhook 服務）
    location /webhook/telegram {
        proxy_pass http://telegram-webhook:3000/webhook/telegram;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web Chat 發送訊息到 OpenClaw
    location /api/send-to-openclaw {
        proxy_pass http://telegram-webhook:3000/api/send-to-openclaw;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Telegram 綁定 API
    location /api/bind-telegram {
        proxy_pass http://telegram-webhook:3000/api/bind-telegram;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Telegram 解綁 API
    location /api/unbind-telegram {
        proxy_pass http://telegram-webhook:3000/api/unbind-telegram;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Telegram 狀態查詢 API
    location /api/telegram-status {
        proxy_pass http://telegram-webhook:3000/api/telegram-status;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ============================================
    # OpenClaw API proxy
    # ============================================
    location /api/openclaw/ {
        rewrite ^/api/openclaw/(.*)$ /$1 break;
        proxy_pass https://neovegaopenclaw.zeabur.app/;
        proxy_ssl_server_name on;
        proxy_set_header Host neovegaopenclaw.zeabur.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 30s;
    }

    # ============================================
    # 前端靜態檔案
    # ============================================
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### 任務 3-3：修復 sendToOpenClaw 參數支援 sessionId

**檔案**：`src/services/telegram.ts`

**修改 sendToOpenClaw**：
```typescript
export async function sendToOpenClaw(params: {
    message: string;
    userId?: string;
    sessionId?: string;
}): Promise<void> {
    const response = await fetch('/api/send-to-openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error('發送訊息到 OpenClaw 失敗');
    }
}
```

**同步修改 useTelegramChat.ts**：
```typescript
await sendToOpenClaw({
    message: content,
    userId: user?.id,
    sessionId: user?.id || `guest-${Date.now()}`,
});
```

---

### 任務 3-4：設定 Zeabur 環境變數

**服務**：telegram-webhook（在 Zeabur 平台上）

**環境變數**：
```
TELEGRAM_BOT_TOKEN=8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@neovega.cc
POCKETBASE_ADMIN_PASSWORD=<在 Zeabur 設定你的管理員密碼>
PORT=3000
```

**注意**：`POCKETBASE_URL` 需要確認 Zeabur 平台上 pocketbase 服務的內部網路 URL。可能需要使用 Zeabur 提供的內部 DNS 名稱。

**操作步驟**：
1. 登入 Zeabur Dashboard
2. 選擇 telegram-webhook 服務
3. 進入「環境變數」設定
4. 逐一添加上述環境變數
5. 重新部署服務

---

### 任務 3-5：正確設定 Telegram Webhook

**前置條件**：
- telegram-webhook 服務已部署
- nginx 配置已更新
- 環境變數已設定

**執行命令**：
```bash
# 1. 設定 Webhook
curl -X POST "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'

# 2. 驗證設定
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"

# 預期回應：
# {
#   "ok": true,
#   "result": {
#     "url": "https://www.neovega.cc/webhook/telegram",
#     "has_custom_certificate": false,
#     "pending_update_count": 0,
#     "allowed_updates": ["message"]
#   }
# }
```

---

### 任務 3-6：telegram-webhook 部署配置

**檔案**：`telegram-webhook/Dockerfile`（如不存在需建立）

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**檔案**：`telegram-webhook/tsconfig.json`（檢查是否有 outDir 設定）

確認 build 輸出目錄與 Dockerfile CMD 一致。

---

### 任務 3-7：端到端測試

**測試步驟**：

#### 步驟1：測試 telegram-webhook 健康檢查
```bash
curl https://www.neovega.cc/health
# 預期：可能需要 nginx 添加 /health 路由
```

#### 步驟2：測試發送訊息到 OpenClaw
```bash
curl -X POST https://www.neovega.cc/api/send-to-openclaw \
  -H "Content-Type: application/json" \
  -d '{
    "message": "測試訊息 from Web Chat",
    "userId": "test-user-123"
  }'
```

#### 步驟3：檢查 Telegram
- 到 OpenClaw 監聽的 Telegram Chat 查看是否收到 `[WebChat:test-user-123] 測試訊息 from Web Chat`

#### 步驟4：模擬 OpenClaw 回覆
- 在 Telegram Chat 中以 Bot 身份回覆 `[WebChat:test-user-123] 這是 AI 回覆`
- 檢查 PocketBase messages collection 是否有新記錄

#### 步驟5：前端 Web Chat 測試
- 在 www.neovega.cc 打開 Web Chat
- 登入帳號
- 發送訊息
- 等待回覆顯示

---

## 5. 實施優先順序

### 第一優先（修復程式碼問題）
1. 🔧 任務 3-1：修復 webhook/telegram 端點路由判斷
2. 🔧 任務 3-2：補全 nginx.conf 路由
3. 🔧 任務 3-3：修復 sendToOpenClaw 參數

### 第二優先（部署配置）
4. ⚙️ 任務 3-4：設定 Zeabur 環境變數（需要人類操作）
5. ⚙️ 任務 3-6：telegram-webhook 部署配置
6. ⚙️ 任務 3-5：正確設定 Telegram Webhook（需要人類操作）

### 第三優先（測試驗證）
7. 🧪 任務 3-7：端到端測試

---

## 6. 檢查清單

### 程式碼修復
- [ ] 修復 `/webhook/telegram` 端點，區分 OpenClaw 回覆和一般訊息（任務 3-1）
- [ ] 補全 nginx.conf 所有必要路由（任務 3-2）
- [ ] 修復 `sendToOpenClaw` 參數支援 sessionId（任務 3-3）

### 部署配置
- [ ] 在 Zeabur telegram-webhook 服務中設定所有環境變數（任務 3-4）
- [ ] 確認 telegram-webhook 的 Dockerfile 和 build 配置（任務 3-6）
- [ ] 部署 telegram-webhook 服務到 Zeabur
- [ ] 重新部署 nginx（unified-commerce-hub）以載入新配置

### Webhook 設定
- [ ] 使用正確命令設定 Telegram Webhook（任務 3-5）
- [ ] 驗證 Webhook 設定正確

### 測試驗證
- [ ] 測試 telegram-webhook 健康檢查端點
- [ ] 測試 `/api/send-to-openclaw` 端點
- [ ] 驗證 Telegram Chat 收到訊息
- [ ] 驗證 OpenClaw 回覆被正確儲存到 PocketBase
- [ ] 驗證前端 Web Chat 可正常收發訊息

---

**文件版本**：v3.0  
**建立日期**：2026-03-11 08:20  
**狀態**：待實施
