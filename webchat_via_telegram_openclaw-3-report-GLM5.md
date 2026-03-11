# Web Chat 通過 Telegram 與 OpenClaw 通訊整合 - 第三階段執行報告

**日期**：2026-03-11
**執行者**：GLM5
**基於文件**：webchat_via_telegram_openclaw-3.md

---

## 執行摘要

| 任務 | 狀態 | 說明 |
|------|------|------|
| 任務 3-1 | ✅ 完成 | 修復 webhook/telegram 端點路由判斷 |
| 任務 3-2 | ✅ 完成 | 補全 nginx.conf 路由 |
| 任務 3-3 | ✅ 完成 | 修復 sendToOpenClaw 參數支援 sessionId |
| 任務 3-4 | ⚠️ 需人類操作 | 設定 Zeabur 環境變數 |
| 任務 3-5 | ⚠️ 需人類操作 | 設定 Telegram Webhook |
| 任務 3-6 | ✅ 完成 | telegram-webhook Dockerfile 建立 |
| 任務 3-7 | ❌ 未執行 | 端到端測試（需先完成 3-4、3-5） |

---

## 已完成任務詳情

### 任務 3-1：修復 webhook/telegram 端點路由判斷

**檔案**：`telegram-webhook/src/index.ts`

**修改內容**：在 `/webhook/telegram` 端點中，根據 chat ID 和 is_bot 屬性區分 OpenClaw 回覆和一般用戶訊息。

```typescript
if (update.message) {
    const chatId = update.message.chat.id;

    // 檢查是否來自 OpenClaw Chat（Bot 回覆）
    if (chatId.toString() === OPENCLAW_CHAT_ID && update.message.from?.is_bot) {
        console.log('[Routing] OpenClaw reply detected');
        await handleOpenClawReply(update.message);
    } else {
        console.log('[Routing] Regular user message');
        await handleIncomingMessage(update.message);
    }
}
```

---

### 任務 3-2：補全 nginx.conf 路由

**檔案**：`nginx.conf`

**新增路由**：
- `/webhook/telegram` — Telegram Webhook 回調
- `/api/send-to-openclaw` — Web Chat 發送訊息
- `/api/bind-telegram` — Telegram 綁定
- `/api/unbind-telegram` — Telegram 解綁
- `/api/telegram-status` — 狀態查詢

**修正**：所有 proxy_pass 路徑都正確指向 `http://telegram-webhook:3000/`

---

### 任務 3-3：修復 sendToOpenClaw 參數

**檔案**：
- `src/services/telegram.ts`
- `src/hooks/useTelegramChat.ts`

**修改內容**：將 `sendToOpenClaw(userId, message)` 改為 `sendToOpenClaw({ message, userId?, sessionId? })`，支援訪客用戶使用 sessionId。

---

### 任務 3-6：telegram-webhook Dockerfile

**檔案**：`telegram-webhook/Dockerfile`

**內容**：
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

---

## 需要人類操作的任務

### 任務 3-4：設定 Zeabur 環境變數

**操作位置**：Zeabur Dashboard → telegram-webhook 服務 → 環境變數

**需設定的變數**：
```
TELEGRAM_BOT_TOKEN=8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y
OPENCLAW_CHAT_ID=-1003806455231
POCKETBASE_URL=http://pocketbase:8090
POCKETBASE_ADMIN_EMAIL=admin@neovega.cc
POCKETBASE_ADMIN_PASSWORD=<你的管理員密碼>
PORT=3000
```

---

### 任務 3-5：設定 Telegram Webhook

**狀態：** ⏳ 待用戶確認環境變數設定

#### 關於 POCKETBASE_ADMIN_PASSWORD 的說明

**用戶提問**：`POCKETBASE_ADMIN_PASSWORD` 必須跟 Zeabur 上佈署的 pocketbase 的環境變數 PASSWORD 相同嗎？

**答案：不需要相同，這是兩個不同的設定。**

##### POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD

這是 **telegram-webhook 服務** 使用的環境變數，用於以管理員身份認證到 PocketBase，以便訂閱 messages collection。

**設定步驟：**

1. 訪問 PocketBase 管理後台：`https://您的pocketbase網址/_/`
2. 首次訪問會要求建立管理員帳號（設定 Email 和密碼）
3. 將這組 Email 和密碼設定到 **telegram-webhook 服務** 的環境變數：
   - `POCKETBASE_ADMIN_EMAIL` = 管理員 Email
   - `POCKETBASE_ADMIN_PASSWORD` = 管理員密碼

##### Zeabur PocketBase 的 PASSWORD 環境變數

這是 Zeabur 上 PocketBase 服務的環境變數，可能用於：
- 初始管理員密碼（視 template 而定）
- 或其他服務配置

**重要：** 請以 PocketBase 管理後台建立的帳密為主，不要依賴 Zeabur 的 PASSWORD 環境變數。

**前置條件**：
1. telegram-webhook 服務已在 Zeabur 部署
2. 環境變數已設定
3. nginx 配置已生效

**執行命令**：
```bash
# 設定 Webhook
curl -X POST "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.neovega.cc/webhook/telegram",
    "allowed_updates": ["message"]
  }'

# 驗證設定
curl "https://api.telegram.org/bot8647752152:AAFt7U18c_BfVf5zEKW-TMZD41NDtUOHx-Y/getWebhookInfo"
```

---

## 未執行任務

### 任務 3-7：端到端測試

**原因**：需要先完成任務 3-4 和 3-5

**測試步驟**（待環境準備好後執行）：
1. 測試 `/api/send-to-openclaw` 端點
2. 驗證 Telegram Chat 收到訊息
3. 驗證 OpenClaw 回覆被儲存到 PocketBase
4. 驗證前端 Web Chat 可正常收發訊息

---

## 下一步

1. 在 Zeabur 上部署 telegram-webhook 服務
2. 設定環境變數（任務 3-4）
3. 執行 Telegram Webhook 設定命令（任務 3-5）
4. 執行端到端測試（任務 3-7）

---

**報告完成時間**：2026-03-11 08:46

---

## 附錄：Grammy 模板部署問題

### 問題描述

用戶嘗試使用 Zeabur 的 Grammy/Java Telegram Bot 模板，但出現以下錯誤：

```
sh: 1: ts-node: not found
ELIFECYCLE Command failed.
```

### 問題原因

1. Grammy 模板的 `ts-node` 放在 `devDependencies`
2. Zeabur 生產環境只安裝 `dependencies`
3. 導致 `npm run start` 執行 `ts-node src/bot.ts` 時找不到 ts-node

### 解決方案

**推薦**：使用我們自建的 `telegram-webhook` 服務

已在 `telegram-webhook/` 目錄新增：
- `zbpack.json` — Zeabur 構建配置
- `DEPLOY.md` — 詳細部署指南

**部署步驟**：

1. 在 Zeabur 刪除 Grammy 模板服務
2. 新增 Git 服務，選擇 `unified-commerce-hub` 倉庫
3. 設定 Root Directory 為 `/telegram-webhook`
4. 設定環境變數（見上方任務 3-4）
5. 部署

**優勢**：
- 已整合 PocketBase SDK
- 提供完整的 API 端點（/api/send-to-openclaw 等）
- 支援 Web Chat → OpenClaw 雙向通訊
- 無 ts-node 依賴問題

---

**更新時間**：2026-03-11 09:14

---

## 附錄 B：TypeScript 編譯錯誤修復（2026-03-11 12:30）

### 問題描述

部署 telegram-webhook 服務時，TypeScript 編譯失敗：

```
src/index.ts(222,14): error TS18046: 'result' is of type 'unknown'.
src/index.ts(274,33): error TS2352: Conversion of type 'RecordModel' to type 'PocketBaseMessage' may be a mistake because neither type sufficiently overlaps with the other.
```

### 修復內容

#### 1. 第 222 行修復

**原始碼**：
```typescript
const result = await response.json();
```

**修復後**：
```typescript
const result = await response.json() as { ok: boolean; description?: string };
```

**原因**：`response.json()` 返回 `unknown` 類型，需要明確的類型斷言。

#### 2. 第 274 行修復

**原始碼**：
```typescript
const message = e.record as PocketBaseMessage;
```

**修復後**：
```typescript
const message = e.record as unknown as PocketBaseMessage;
```

**原因**：PocketBase 的 `RecordModel` 與自定義的 `PocketBaseMessage` 類型沒有直接重疊，需要通過 `unknown` 中間轉換。

### 提交記錄

- Commit: `13ee5c9`
- 訊息: `fix: 修復 telegram-webhook TypeScript 類型錯誤 - 修復第 222 行和第 274 行的類型問題`
- 已推送至: `origin/main`

### 下一步

重新部署 telegram-webhook 服務，驗證編譯成功。

---

## 附錄 C：PocketBase 連線錯誤排查（2026-03-11 13:54）

### 問題描述

telegram-webhook 服務啟動後，無法連接到 PocketBase：

```
Error: connect ECONNREFUSED 43.167.184.207:8080
```

### 錯誤分析

1. **Telegram Webhook 設定成功** ✅
   - URL: `https://www.neovega.cc/webhook/telegram`
   - `allowed_updates`: `["message"]`

2. **PocketBase 連線失敗** ❌
   - 錯誤 IP: `43.167.184.207:8080`
   - 這不是正確的 PocketBase 位址

### 解決方案

#### 檢查環境變數設定

在 Zeabur Dashboard → telegram-webhook 服務 → 環境變數，確認：

```
POCKETBASE_URL=http://pocketbase:8090
```

**重要**：
- 如果 PocketBase 服務名稱不是 `pocketbase`，請使用正確的服務名稱
- 在 Zeabur 內部網路，使用服務名稱而非外部 URL
- 端口應該是 `8090`（PocketBase 預設端口），不是 `8080`

#### 如何找到正確的 POCKETBASE_URL

1. 在 Zeabur Dashboard 找到 PocketBase 服務
2. 查看服務的「內部網路」或「Private URL」
3. 通常格式為：`http://<服務名稱>:8090`

#### 如果使用外部 URL

如果必須使用外部 URL（不推薦）：
```
POCKETBASE_URL=https://<您的pocketbase網址>
```

但這需要額外處理 HTTPS 憑證問題。

### 重新部署

修正環境變數後，重新部署 telegram-webhook 服務：
1. Zeabur Dashboard → telegram-webhook
2. 點擊「Redeploy」
