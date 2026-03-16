# 快速匯入 Conversations + Messages 集合

**解決問題：** messages 集合依賴 conversations 集合

**解決方案：** 一次匯入兩個集合

---

## 立即執行

### 步驟 1：開啟 PocketBase Admin

訪問：`http://localhost:8090/_/`

### 步驟 2：匯入集合

1. 點擊 **Settings**
2. 點擊 **Import collections**
3. 選擇：`pocketbase/conversations_and_messages.json`
4. 點擊 **Import**

### 步驟 3：確認成功

左側選單應該出現：
- ✅ conversations
- ✅ messages

---

## 包含的集合

### 1. conversations（對話）

**欄位：**
- platform: telegram/web/umio
- telegram_chat_id: Telegram 聊天 ID
- guest_session_id: 訪客 session ID
- user_name: 用戶名稱
- status: active/closed/archived
- metadata: JSON 額外資訊

### 2. messages（訊息）

**欄位：**
- conversation: 關聯到 conversations
- sender: user/assistant/system/agent
- channel: web/telegram
- content: 訊息內容
- intent: 意圖分類
- metadata: JSON 額外資訊

---

## 驗證匯入

```javascript
// 測試 conversations
fetch('http://localhost:8090/api/collections/conversations/records')
  .then(r => r.json())
  .then(console.log)

// 測試 messages
fetch('http://localhost:8090/api/collections/messages/records')
  .then(r => r.json())
  .then(console.log)
```

**預期：** 兩個都返回空陣列（不是 404）

---

## 下一步

1. ✅ 重新啟動 Vite: `npm run dev`
2. ✅ 清除瀏覽器快取: `Ctrl + Shift + R`
3. ✅ 測試 webchat
4. ✅ 檢查 PocketBase 資料

**測試指南：** `WEBCHAT_POCKETBASE_TEST_GUIDE.md`
