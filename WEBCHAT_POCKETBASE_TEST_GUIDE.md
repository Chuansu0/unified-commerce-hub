# Webchat PocketBase 記錄測試指南

**建立日期：** 2026-03-16  
**目的：** 驗證 webchat 對話是否正確記錄到 PocketBase

---

## 測試前準備

### 1. 確認服務運行

確保以下服務正在運行：
- ✅ PocketBase 服務
- ✅ Vite React 前端
- ✅ Umio Bot (OpenClaw Agent)

### 2. 開啟 PocketBase Admin

訪問 PocketBase Admin 介面：
```
http://localhost:8090/_/
```

或 Zeabur 部署的 PocketBase URL。

---

## 測試步驟

### 測試 1：建立新對話

**步驟：**
1. 開啟網站的 webchat 小工具
2. 發送第一條訊息：「你好」
3. 等待 AI 回覆

**驗證：**
1. 在 PocketBase Admin 中開啟 `conversations` 集合
2. 找到最新的對話記錄
3. 確認以下欄位：
   - `platform`: "umio" ✅
   - `status`: "active" ✅
   - `guest_session_id`: 有值（如果是訪客）✅
   - `last_message`: 最後一條訊息內容 ✅
   - `last_message_at`: 時間戳記 ✅

**預期結果：**
```json
{
  "id": "abc123xyz",
  "platform": "umio",
  "guest_session_id": "guest_1234567890",
  "status": "active",
  "last_message": "你好",
  "last_message_at": "2026-03-16T03:26:00.000Z",
  "metadata": {
    "telegram_chat_id": "123456789"
  }
}
```

---

### 測試 2：驗證用戶訊息儲存

**步驟：**
1. 在同一個對話中發送第二條訊息：「測試訊息」
2. 等待 AI 回覆

**驗證：**
1. 在 PocketBase Admin 中開啟 `messages` 集合
2. 篩選該對話的訊息（使用 conversation ID）
3. 確認用戶訊息記錄：
   - `sender`: "user" ✅
   - `channel`: "web" ✅
   - `content`: "測試訊息" ✅
   - `conversation`: 對話 ID ✅

**預期結果：**
```json
{
  "id": "msg123",
  "conversation": "abc123xyz",
  "sender": "user",
  "channel": "web",
  "content": "測試訊息",
  "metadata": {
    "source": "webchat"
  },
  "created": "2026-03-16T03:27:00.000Z"
}
```

---

### 測試 3：驗證 AI 回覆儲存

**驗證：**
1. 在 `messages` 集合中找到 AI 的回覆
2. 確認以下欄位：
   - `sender`: "assistant" ✅
   - `channel`: "web" ✅
   - `content`: AI 回覆內容 ✅
   - `conversation`: 同一個對話 ID ✅

**預期結果：**
```json
{
  "id": "msg124",
  "conversation": "abc123xyz",
  "sender": "assistant",
  "channel": "web",
  "content": "你好！我是 AI 助手...",
  "metadata": {
    "telegram_message_id": "456"
  },
  "created": "2026-03-16T03:27:02.000Z"
}
```

---

### 測試 4：對話歷史載入

**步驟：**
1. 重新載入網頁
2. 開啟 webchat 小工具
3. 檢查是否顯示之前的對話歷史

**預期結果：**
- ✅ 顯示之前的所有訊息
- ✅ 訊息順序正確（時間由舊到新）
- ✅ 用戶訊息和 AI 回覆都顯示

---

### 測試 5：多輪對話

**步驟：**
1. 連續發送 3-5 條訊息
2. 每次等待 AI 回覆

**驗證：**
1. 檢查 `messages` 集合
2. 確認所有訊息都被記錄
3. 確認訊息順序正確

**預期結果：**
- ✅ 所有用戶訊息都被儲存
- ✅ 所有 AI 回覆都被儲存
- ✅ 訊息順序正確
- ✅ 時間戳記正確

---

## 檢查清單

### 資料完整性

- [ ] 對話記錄建立（conversations 集合）
- [ ] platform 欄位正確（"umio"）
- [ ] 用戶訊息儲存（messages 集合，sender="user"）
- [ ] AI 回覆儲存（messages 集合，sender="assistant"）
- [ ] 訊息關聯正確（conversation ID 一致）
- [ ] 時間戳記正確
- [ ] metadata 欄位有值

### 功能測試

- [ ] 新對話建立正常
- [ ] 訊息發送正常
- [ ] AI 回覆正常
- [ ] 對話歷史載入正常
- [ ] 多輪對話正常
- [ ] 重新載入後歷史保留

---

## 常見問題排查

### 問題 1：用戶訊息沒有儲存

**症狀：** `messages` 集合中只有 AI 回覆，沒有用戶訊息

**檢查：**
1. 確認 `src/services/umioChat.ts` 中的 `saveUserMessage()` 已啟用
2. 檢查瀏覽器 Console 是否有錯誤
3. 檢查 PocketBase 權限設定

**解決：**
```typescript
// 確認這段代碼已修改
async function saveUserMessage(...) {
  return saveUserMessageEnabled(...);  // ✅ 應該調用這個
  // return;  // ❌ 不應該直接返回
}
```

---

### 問題 2：對話沒有建立

**症狀：** `conversations` 集合中沒有新記錄

**檢查：**
1. 檢查 `getOrCreateConversation()` 函數
2. 檢查 PocketBase 連接
3. 檢查瀏覽器 Console 錯誤

**解決：**
- 確認 PocketBase URL 正確
- 確認 API 權限設定正確

---

### 問題 3：對話歷史沒有載入

**症狀：** 重新載入後看不到之前的訊息

**檢查：**
1. 檢查 `useUmioChat.ts` 中的 `getUmioConversation()` 函數
2. 檢查 session ID 是否保持一致
3. 檢查瀏覽器 LocalStorage

**解決：**
- 確認 session ID 正確儲存在 LocalStorage
- 確認查詢邏輯正確

---

## 成功標準

✅ **所有測試通過：**
- 對話正確建立
- 用戶訊息正確儲存
- AI 回覆正確儲存
- 對話歷史正確載入
- 多輪對話正常運作

---

## 相關文檔

- 實施計畫：`openclaw-bot-reply-bot-20260316-1.md`
- PocketBase Schema：`pocketbase/schema.json`
- Umio Chat Service：`src/services/umioChat.ts`
- Umio Chat Hook：`src/hooks/useUmioChat.ts`

---

**文件版本：** 1.0  
**最後更新：** 2026-03-16
