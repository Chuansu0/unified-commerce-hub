# Schema 修正指南

**問題：** PocketBase 不支援 `autodate` 類型

**解決：** 已將所有 `autodate` 替換成 `date`

---

## 修正檔案

✅ **pocketbase/schema_date_fixed.json** - 完整 schema（已修正）

✅ **pocketbase/messages_collection.json** - messages 集合（無需修正）

---

## 使用方式

### 選項 1：匯入完整 Schema（推薦）

**適用：** 全新的 PocketBase 實例

1. 訪問 PocketBase Admin: `http://localhost:8090/_/`
2. Settings → Import collections
3. 選擇 `pocketbase/schema_date_fixed.json`
4. 點擊 Import

**包含集合：**
- users（auth）
- products
- orders
- conversations
- messages ✅
- members
- telegram_bind_codes
- agent_workflows

### 選項 2：僅匯入 messages 集合

**適用：** 已有其他集合，只缺 messages

1. 訪問 PocketBase Admin
2. Settings → Import collections
3. 選擇 `pocketbase/messages_collection.json`
4. 點擊 Import

---

## 重要提醒

⚠️ **關於 date 類型：**

`date` 類型不會自動設定時間，需要手動設定。

**更好的做法：**
- 移除 schema 中的 `created` 和 `updated` 欄位
- PocketBase 會自動提供這些系統欄位
- 系統欄位會自動設定時間

**如果遇到問題：**
建議移除 schema 中所有名為 `created` 或 `updated` 的自訂欄位。

---

## 驗證匯入

測試 messages 集合：

```javascript
fetch('http://localhost:8090/api/collections/messages/records')
  .then(r => r.json())
  .then(console.log)
```

**預期：** 返回空陣列（不是 404）

---

## 下一步

1. ✅ 匯入 schema
2. ✅ 重新啟動 Vite: `npm run dev`
3. ✅ 清除瀏覽器快取: `Ctrl + Shift + R`
4. ✅ 測試 webchat

**相關文檔：**
- `MESSAGES_COLLECTION_IMPORT.md` - 快速匯入指南
- `WEBCHAT_POCKETBASE_TEST_GUIDE.md` - 測試指南
