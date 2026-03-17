# Webchat 快取清除指南

## 問題

代碼已修正，但錯誤還在發生

## 原因

瀏覽器使用舊的編譯版本（`index-C_4zwTy3.js`）

## 解決步驟

### 步驟 1：確認檔案已儲存

檢查 `src/services/umioChat.ts` 第 100-115 行：

```typescript
const replyContent = data.response || data.message || "收到訊息";
await saveAssistantMessage(sessionId, replyContent);
```

### 步驟 2：重新啟動 Vite

```powershell
# 停止當前的 Vite（Ctrl + C）
# 重新啟動
npm run dev
```

### 步驟 3：強制清除瀏覽器快取

1. 開啟 DevTools（F12）
2. 右鍵點擊重新整理按鈕
3. 選擇「清除快取並強制重新整理」

或使用快捷鍵：**Ctrl + Shift + R**

### 步驟 4：驗證新版本載入

1. 開啟 DevTools → Network 標籤
2. 重新整理頁面
3. 檢查載入的 JS 檔案名稱是否改變（不再是 `index-C_4zwTy3.js`）

### 步驟 5：測試

發送測試訊息，應該看到：

```
✅ Created new conversation
✅ Saved user message
✅ Response status: 200
✅ Response data: {success: true, message: 'Message received', ...}
✅ Saved assistant message  ← 這行應該出現
```

## 如果還是失敗

檢查 Console 中的完整錯誤訊息，特別是：
- `replyContent` 的值
- `conversation.id` 的值
