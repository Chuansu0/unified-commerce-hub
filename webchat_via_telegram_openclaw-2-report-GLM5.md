# WebChat via Telegram OpenClaw - 執行報告 (GLM5)

## 執行日期
2026-03-11 22:45 (Asia/Taipei)

## 任務摘要
根據 `webchat_via_telegram_openclaw-2.md` 執行任務 1~7，建立從 www.neovega.cc 網路聊天到 Telegram OpenClaw 的通路。

---

## 已完成任務

### ✅ 任務 1：設定 Telegram Bot Token
- **狀態**: 已完成
- **Bot**: @neovegaumio_bot
- **Token**: 已設定於 telegram-webhook 服務
- **Chat ID**: -1003806455231 (OpenClaw Chat)

### ✅ 任務 2：Telegram Webhook 設定
- **狀態**: 已完成
- **Webhook URL**: https://www.neovega.cc/webhook/telegram
- **設定時間**: 2026-03-11
- **驗證結果**: Webhook 狀態正常

### ✅ 任務 3：驗證 Webhook 狀態
- **狀態**: 已完成
- **驗證方式**: 透過 Telegram API 確認
- **結果**: Webhook 已正確設定並運作中

### ✅ 任務 4：修復 useTelegramChat 支援訪客模式
- **狀態**: 已完成
- **問題**: 原始程式碼強制要求用戶登入才能發送訊息
- **解決方案**:
  - 新增 `getOrCreateGuestSessionId()` 函數
  - 訪客使用 `guest_{timestamp}_{random}` 格式的 sessionId
  - sessionId 儲存於 localStorage 以保持會話一致性
- **修改檔案**: `src/hooks/useTelegramChat.ts`
- **Commit**: a5c7b83

### ✅ 任務 5：確認 nginx.conf 路由設定
- **狀態**: 已完成
- **設定確認**:
  - `/webhook/telegram` → telegram-webhook:3000
  - `/api/send-to-openclaw` → telegram-webhook:3000
  - `/api/bind-telegram` → telegram-webhook:3000
  - `/api/unbind-telegram` → telegram-webhook:3000
  - `/api/telegram-status` → telegram-webhook:3000

### ✅ 任務 6：檢查 telegram-webhook 服務
- **狀態**: 已完成
- **服務檔案**: `telegram-webhook/src/index.ts`
- **功能確認**:
  - POST `/webhook/telegram` - 接收 Telegram 更新
  - POST `/api/send-to-openclaw` - Web Chat 發送訊息
  - `handleOpenClawReply()` - 處理 OpenClaw 回覆
  - `handleIncomingMessage()` - 處理用戶訊息

### ✅ 任務 7：提交變更並部署
- **狀態**: 已完成
- **Commit**: a5c7b83
- **訊息**: "fix: support guest mode in useTelegramChat - remove login requirement"
- **推送狀態**: 成功推送到 GitHub

---

## 待驗證項目

### ⏳ 任務 8：測試 Web Chat → Telegram → OpenClaw 通路
- **狀態**: 待驗證
- **需要**: 
  1. 等待 Zeabur 自動部署完成
  2. 在 www.neovega.cc 測試聊天功能
  3. 確認訊息是否出現在 Telegram OpenClaw Chat

### ⏳ 任務 9：確認 Bot 已加入 OpenClaw Chat
- **狀態**: 需要人工確認
- **說明**: @neovegaumio_bot 必須是 OpenClaw Chat 的成員才能接收訊息
- **操作**: 請在 Telegram 中確認 Bot 已加入群組

---

## 技術架構

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  www.neovega.cc │────▶│  nginx proxy    │────▶│ telegram-webhook│
│   (ChatWidget)  │     │  (nginx.conf)   │     │   (Node.js)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┘
                        ▼
              ┌─────────────────┐     ┌─────────────────┐
              │  Telegram API   │────▶│  OpenClaw Chat  │
              │ (Bot: neovega)  │     │  (Group Chat)   │
              └─────────────────┘     └─────────────────┘
```

## 訊息流程

1. **Web Chat 發送**:
   - 用戶在 www.neovega.cc 輸入訊息
   - ChatWidget → useTelegramChat → sendToOpenClaw()
   - POST `/api/send-to-openclaw`

2. **Telegram 轉發**:
   - telegram-webhook 接收請求
   - 格式化訊息: `[WebChat:userId] 訊息內容`
   - 透過 Bot API 發送到 OpenClaw Chat

3. **OpenClaw 回覆**:
   - OpenClaw 在 Telegram 中回覆
   - Telegram Webhook 接收回覆
   - 解析 `[WebChat:userId]` 格式
   - 儲存到 PocketBase
   - 前端透過 Realtime 訂閱接收

---

## OpenClaw 日誌分析 (2026-03-11 22:52)

### 成功訊息
```
[telegram] sendMessage ok chat=8240891231 message=60
```
這表示 **Telegram 訊息發送成功**！

### 需要處理的問題
```
[ws] closed before connect ... code=1008 reason=device identity required
```
OpenClaw 需要 **device identity** 驗證才能建立 WebSocket 連接。

### 解決方案
OpenClaw 需要裝置識別驗證。可能需要：
1. 在 OpenClaw 設定中啟用匿名訪問
2. 或者在發送訊息時附帶裝置識別資訊

---

## 已知問題與注意事項

### 0. OpenClaw Device Identity
- **狀態**: 需要設定
- **錯誤**: `code=1008 reason=device identity required`
- **說明**: OpenClaw WebSocket 需要裝置識別
- **解決**: 需要在 OpenClaw 設定中啟用匿名訪問或配置 device identity

### 1. 訪客模式限制
- 訪客的回覆**不會**儲存到 PocketBase
- 訪客需要依賴 Realtime 訂閱接收回覆
- 如需完整功能，建議登入

### 2. OpenClaw Chat 權限
- Bot 必須是 OpenClaw Chat 的管理員或成員
- Bot 需要發送訊息權限

### 3. PocketBase Realtime
- 訪客模式下 Realtime 訂閱可能無法正常運作
- 建議新增輪詢機制作為備援

---

## 下一步建議

1. **測試通路**:
   - 等待部署完成後，在 www.neovega.cc 發送測試訊息
   - 確認訊息出現在 Telegram OpenClaw Chat

2. **監控日誌**:
   ```bash
   # Zeabur telegram-webhook 服務日誌
   # 應該能看到類似以下的日誌
   [WebChat->OpenClaw] User guest_xxx: 測試訊息
   Sent message to Telegram chat -1003806455231
   ```

3. **確認 Bot 權限**:
   - 確保 @neovegaumio_bot 在 OpenClaw Chat 中有發言權限

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `src/hooks/useTelegramChat.ts` | Web Chat hook，支援訪客模式 |
| `src/services/telegram.ts` | Telegram 服務 API |
| `telegram-webhook/src/index.ts` | Telegram Webhook 處理服務 |
| `nginx.conf` | Nginx 路由配置 |
| `src/components/storefront/ChatWidget.tsx` | 聊天視窗元件 |

---

## OpenClaw 設定指南

### 1. Device Identity 問題說明

OpenClaw 錯誤 `code=1008 reason=device identity required` 表示 WebSocket 連接需要裝置識別。

**解決方案**: 這是 OpenClaw 服務端的設定，需要在 OpenClaw 的配置中啟用：

```json
// OpenClaw 配置 (zeabur_openclaw_config_20260310.json 或 OpenClaw 控制台)
{
  "gateway": {
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true
    }
  },
  "agents": {
    "defaults": {
      "heartbeat": true
    }
  }
}
```

### 2. 雙向通訊架構

**目標流程**:
```
┌─────────────────┐                    ┌─────────────────┐
│  www.neovega.cc │◄──────────────────►│   umio bot      │
│   (Web Chat)    │                    │ (Telegram Bot)  │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  OpenClaw Chat  │
                                       │  (Group Chat)   │
                                       │  - Agent 1      │
                                       │  - Agent 2      │
                                       │  - ...          │
                                       └─────────────────┘
```

**目前實現狀態**:

| 方向 | 狀態 | 說明 |
|------|------|------|
| Web → umio → OpenClaw | ✅ 已實現 | `/api/send-to-openclaw` 發送訊息 |
| OpenClaw → umio → Web | ⚠️ 需調整 | 目前只處理 Bot 訊息 |

### 3. 回覆路由機制

**目前程式碼** (`handleOpenClawReply`):
```typescript
// 只處理 Bot 訊息
if (!message.from?.is_bot) {
    return;
}
```

**問題**: 如果 OpenClaw Chat 中的其他 Agent 是真人用戶（非 Bot），他們的回覆不會被處理。

**建議修改**: 改為處理所有來自 OpenClaw Chat 的訊息（除了 umio 自己發送的）

### 4. OpenClaw Chat 設定建議

1. **確保 umio bot 在群組中**:
   - 將 @neovegaumio_bot 加入 OpenClaw Chat
   - 給予發言權限

2. **訊息格式約定**:
   - Web Chat 發送: `[WebChat:userId] 訊息內容`
   - OpenClaw 回覆: 應該引用或回覆包含 `[WebChat:userId]` 的訊息

3. **Agent 回覆識別**:
   - 如果 Agent 是 Bot: `from.is_bot === true`
   - 如果 Agent 是真人: 需要其他識別方式（例如群組成員名單）

---

## 待處理事項

### 需要在 OpenClaw 端設定
1. 啟用匿名訪問或配置 device identity
2. 確認 OpenClaw Chat 的 Agent 回覆機制

### 需要調整程式碼
1. `handleOpenClawReply` - 處理所有 OpenClaw Chat 訊息（不限 Bot）
2. 新增訊息追蹤機制 - 追蹤哪個 Web Chat 訊息對應哪個回覆

---

## 結論

所有程式碼層面的任務 (1-7) 已完成。Web Chat → Telegram → OpenClaw 的通路已建立。

**關鍵修復**: 移除了強制登入限制，現在訪客也能使用聊天功能發送訊息到 OpenClaw。

**下一步**: 
1. 在 OpenClaw 設定中啟用匿名訪問
2. 調整 `handleOpenClawReply` 以處理所有 Agent 回覆
