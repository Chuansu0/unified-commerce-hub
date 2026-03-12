# OpenClaw 自動回覆 Web Chat 工作計畫

**建立日期**: 2026-03-12  
**版本**: 1.1  
**狀態**: ✅ 已完成

---

## 目標

讓 Telegram 群組 `-1003806455231` 中的每條 Web Chat 訊息，都能自動觸發 **andrea** (neovegaandrea_bot) 進行思考和指揮，直到有 Agent 回覆 **umio** (neovegaumio_bot)，umio 再將回覆貼回 www.neovega.cc 的 Web Chat。

---

## 現況分析

### ✅ 已運作
- Web Chat 匿名訪客可以發訊息
- umio bot 自動轉發到 Telegram 群組，格式：`[WebChat:guest:xxx] 訊息內容`
- PocketBase Realtime 訂閱可以接收回覆
- `handleOpenClawReply()` 可以將 Telegram 回覆儲存到 PocketBase

### ❌ 已修復的問題
1. **沒有自動觸發 andrea** → ✅ 已新增 `@neovegaandrea_bot` 自動觸發
2. **回覆檢測不完整** → ✅ 已支援 Telegram 原生 reply 功能和 [WebChat:xxx] 格式
3. **訪客 conversation 查詢問題** → ✅ 已通過 `guest_session_id` 欄位處理訪客會話

---

## 訊息流程設計

```
[Web Chat 訪客]
    |
    | 輸入訊息
    ↓
[useTelegramChat.ts → sendMessage()]
    |
    | POST /api/send-to-openclaw
    ↓
[telegram-webhook/src/index.ts → /api/send-to-openclaw]
    |
    | 1. 儲存到 PocketBase (messages)
    | 2. 發送到 Telegram 群組
    |    格式：[WebChat:guest:sessionId] 訊息內容
    | 3. 【已完成】自動 @neovegaandrea_bot
    |    格式：@neovegaandrea_bot ↑ 收到 Web Chat 客服請求，請處理上述訊息
    ↓
[Telegram 群組 -1003806455231]
    |
    | andrea 看到訊息並 @mention，思考後指揮 agents
    ↓
[某個 Agent 回覆]
    |
    | 方式 A：直接 reply umio 的訊息（Telegram native reply）【已支援】
    | 方式 B：發送含 [WebChat:sessionId] 前綴的訊息
    ↓
[/webhook/telegram → handleOpenClawReply()]
    |
    | 1. 【已完成】支援兩種回覆格式
    | 2. 【已完成】提取 userId 或 guest sessionId
    | 3. 【已完成】支援登入用戶和訪客
    | 4. 儲存到 PocketBase (messages, sender: 'assistant')
    ↓
[PocketBase Realtime]
    |
    | 【已完成】subscribeToReplies() 偵測到新 assistant 訊息
    | 支援 user ID 和 guest_session_id 匹配
    ↓
[Web Chat UI 顯示回覆]
```

---

## 已完成的修改

### ✅ Task 1：自動觸發 andrea
**檔案**：`telegram-webhook/src/index.ts`

**已修改**：
- 在 `/api/send-to-openclaw` endpoint 中，發送訊息後自動觸發 `@neovegaandrea_bot`
- 觸發訊息：`@neovegaandrea_bot ↑ 收到 Web Chat 客服請求，請處理上述訊息`

### ✅ Task 2：支援 reply_to_message 格式
**檔案**：`telegram-webhook/src/index.ts`

**已修改**：
- `handleOpenClawReply()` 函數現支援兩種回覆格式：
  - **格式 A**：訊息文字包含 `[WebChat:userId]` 或 `[WebChat:guest:sessionId]` 前綴
  - **格式 B**：Telegram 原生 reply_to_message（直接 reply umio 的訊息）
- 從 `message.reply_to_message.text` 提取原始訊息內容
- 檢查被 reply 的訊息是否來自 `neovegaumio_bot`

### ✅ Task 3：支援訪客會話
**檔案**：`telegram-webhook/src/index.ts`

**已修改**：
- `send-to-openclaw`：使用 `guest_session_id` 欄位而非 `user` 欄位儲存訪客會話
- `handleOpenClawReply`：
  - 檢查 `userIdOrSession.startsWith('guest:')` 識別訪客
  - 訪客使用 `guest_session_id = "xxx"` 查詢 conversations
  - 登入用戶使用 `user = "xxx"` 查詢 conversations

### ✅ Task 4：前端訂閱支援訪客
**檔案**：`src/services/telegram.ts`

**已修改**：
- `subscribeToReplies(sessionId: string, ...)` 函數
- 同時檢查 `conversation.user === sessionId` 和 `conversation.guest_session_id === sessionId`
- 支援訪客 sessionId 的 `guest:` 前綴匹配

---

## PocketBase Schema 需求

確認 `conversations` collection 有以下欄位：

| 欄位名稱 | 型別 | 說明 | 必填 |
|---------|------|------|------|
| `user` | relation -> users | 已登入用戶 ID | 否（訪客為空） |
| `guest_session_id` | text | 訪客 session ID | 否（登入用戶為空） |
| `platform` | text | 'webchat' \| 'telegram' | 是 |
| `status` | text | 'active' \| 'closed' | 是 |
| `last_message` | text | 最後訊息內容 | 否 |
| `last_message_at` | date | 最後訊息時間 | 否 |

### Schema 更新方式

1. 登入 PocketBase Admin Console
2. 進入 `conversations` collection
3. 點擊 "New Field"
4. 添加 `guest_session_id` 欄位：
   - Type: **Plain text**
   - Name: `guest_session_id`
   - Required: No
   - Unique: No
5. 保存

---

## 部署與測試

### 部署步驟

1. **重新部署 telegram-webhook**:
   ```bash
   cd telegram-webhook
   # 確保已推送至 GitHub
   git add src/index.ts
   git commit -m "feat: auto trigger andrea on web chat message"
   git push origin main
   ```

2. **重新部署前端**:
   ```bash
   npm run build
   # 或使用 Zeabur CLI
   ```

3. **更新 PocketBase Schema**:
   - 登入 PocketBase Admin
   - 添加 `guest_session_id` 欄位到 conversations collection

### 測試驗證

1. **測試訪客發送訊息**：
   - 在 Web Chat 輸入「測試訊息」
   - 檢查 Telegram 群組是否收到：
     - `[WebChat:guest:xxx] 測試訊息`
     - `@neovegaandrea_bot ↑ 收到 Web Chat 客服請求，請處理上述訊息`

2. **測試 reply_to_message 格式**：
   - 在 Telegram 直接 reply umio 發送的訊息
   - 回覆內容：`這是回覆測試`
   - 檢查 Web Chat 是否顯示回覆

3. **測試 [WebChat:xxx] 格式**：
   - 在 Telegram 發送：`[WebChat:guest:xxx] 這是另一種回覆`
   - 檢查 Web Chat 是否顯示回覆

---

## 修改檔案清單

| 檔案 | 修改內容 | 狀態 |
|------|---------|------|
| `telegram-webhook/src/index.ts` | 自動 @andrea + reply_to_message 支援 + 訪客處理 | ✅ 完成 |
| `src/services/telegram.ts` | subscribeToReplies 支援訪客 | ✅ 完成 |

---

## 注意事項

1. **OpenClaw 中的 andrea 必須有存取該 Telegram 群組的權限**
2. **andrea 必須被配置為能在被 @mention 時觸發思考**
3. **訪客的對話不會有 user relation，只有 guest_session_id**
4. **建議在 PocketBase 中為 guest_session_id 建立索引以提升查詢效能**

---

**完成日期**: 2026-03-12