# Messages 集合快速匯入指南

**目的：** 快速建立 `messages` 集合，解決 404 錯誤

---

## 快速匯入步驟

### 步驟 1：開啟 PocketBase Admin

訪問：`http://localhost:8090/_/` 或您的 Zeabur PocketBase URL

### 步驟 2：匯入集合

1. 點擊左側選單 **Settings**
2. 點擊 **Import collections**
3. 選擇檔案：`pocketbase/messages_collection.json`
4. 點擊 **Import**

### 步驟 3：確認成功

檢查左側選單是否出現 **messages** 集合

---

## 集合結構

**名稱：** messages  
**類型：** Base Collection

**欄位：**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| conversation | Relation | ✅ | 關聯到 conversations |
| sender | Select | ✅ | user/assistant/system/agent |
| channel | Select | ❌ | web/telegram |
| content | Text | ✅ | 訊息內容 |
| intent | Text | ❌ | 意圖分類 |
| metadata | JSON | ❌ | 額外資訊 |

**API 規則：** 全部開放（開發環境）

---

## 驗證匯入

在瀏覽器 Console 執行：

```javascript
fetch('http://localhost:8090/api/collections/messages/records')
  .then(r => r.json())
  .then(console.log)
```

**預期結果：** 返回空陣列（不是 404）

---

## 完成後

1. ✅ 重新啟動 Vite：`npm run dev`
2. ✅ 清除瀏覽器快取：`Ctrl + Shift + R`
3. ✅ 測試 webchat 功能

**相關文檔：**
- `WEBCHAT_POCKETBASE_RESTART_GUIDE.md`
- `WEBCHAT_POCKETBASE_TEST_GUIDE.md`
