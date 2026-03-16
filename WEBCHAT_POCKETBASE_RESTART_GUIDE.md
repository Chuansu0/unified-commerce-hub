# Webchat PocketBase 功能啟用指南

**問題：** 代碼已修改，但前端仍使用舊版本

**原因：** Vite 開發伺服器需要重新啟動才能載入新代碼

---

## 解決步驟

### 步驟 1：重新啟動 Vite 開發伺服器

**在終端機中：**

1. 停止當前的 Vite 伺服器（按 `Ctrl+C`）

2. 重新啟動：
```powershell
npm run dev
```

或

```powershell
pnpm dev
```

### 步驟 2：清除瀏覽器快取

**選項 A：硬重新整理（推薦）**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**選項 B：清除快取並重新載入**
1. 開啟開發者工具（F12）
2. 右鍵點擊重新整理按鈕
3. 選擇「清除快取並強制重新整理」

### 步驟 3：驗證新代碼已載入

開啟瀏覽器 Console，應該看到：
```
[UmioChat] Saved user message to conversation abc123
```

**不應該**看到：
```
[UmioChat] Skipping PocketBase save (guest mode)  ❌ 舊版本
```

---

## 測試驗證

1. 開啟 webchat
2. 發送訊息：「測試」
3. 檢查 Console 輸出
4. 檢查 PocketBase `messages` 集合

**預期結果：**
- ✅ Console 顯示 "Saved user message"
- ✅ PocketBase 中有用戶訊息記錄
- ✅ sender="user", channel="webchat"

---

## 如果仍然有問題

### 檢查 1：確認代碼修改

檢查 `src/services/umioChat.ts` 第 128 行：

```typescript
async function saveUserMessage(...): Promise<void> {
    return saveUserMessageEnabled(...);  // ✅ 應該是這樣
}
```

### 檢查 2：確認 Vite 編譯

終端機應該顯示：
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 檢查 3：確認瀏覽器載入新版本

在 Console 中執行：
```javascript
// 檢查時間戳記
console.log(new Date().toISOString());
```

然後重新載入頁面，時間應該更新。

---

**建立時間：** 2026-03-16 11:40
