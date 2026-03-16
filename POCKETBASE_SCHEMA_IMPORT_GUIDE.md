# PocketBase Schema 匯入指南

**問題：** `messages` 集合不存在，導致 404 錯誤

**原因：** PocketBase 實例中沒有匯入 schema.json 定義的集合

---

## 快速修復步驟

### 方法 1：匯入 Schema（推薦）

**步驟 1：開啟 PocketBase Admin**

訪問 PocketBase 管理介面：
```
http://localhost:8090/_/
```

或您的 Zeabur PocketBase URL。

**步驟 2：匯入 Schema**

1. 點擊左側選單的 **Settings**（設定）
2. 點擊 **Import collections**（匯入集合）
3. 選擇 `pocketbase/schema.json` 檔案
4. 點擊 **Import**（匯入）

**步驟 3：確認集合已建立**

檢查以下集合是否存在：
- ✅ users（auth 類型）
- ✅ products
- ✅ orders
- ✅ conversations
- ✅ **messages**（關鍵！）
- ✅ members

---

### 方法 2：手動建立 messages 集合

如果匯入失敗，可以手動建立 `messages` 集合：

**步驟 1：建立集合**

1. 在 PocketBase Admin 中點擊 **New collection**
2. 名稱：`messages`
3. 類型：**Base**

**步驟 2：新增欄位**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| conversation | Relation | ✅ | 關聯到 conversations |
| sender | Select | ✅ | 選項：user, assistant, system, agent |
| content | Text | ✅ | 訊息內容 |
| channel | Select | ❌ | 選項：web, telegram |
| intent | Text | ❌ | 意圖分類 |
| metadata | JSON | ❌ | 額外資訊 |

**步驟 3：設定 Relation 欄位**

conversation 欄位設定：
- Collection: `conversations`
- Max select: 1
- Cascade delete: ✅（刪除對話時一併刪除訊息）

**步驟 4：設定 API 規則**

建議的規則（訪客模式）：
- **List rule**: 空字串（允許所有人）
- **View rule**: 空字串（允許所有人）
- **Create rule**: 空字串（允許所有人）
- **Update rule**: 空字串（允許所有人）
- **Delete rule**: 空字串（允許所有人）

⚠️ **注意**：這是開發環境的寬鬆設定，生產環境需要更嚴格的規則。

---

## 驗證修復

### 測試 1：檢查集合存在

在瀏覽器 Console 執行：
```javascript
fetch('http://localhost:8090/api/collections/messages/records')
  .then(r => r.json())
  .then(console.log)
```

**預期結果：**
```json
{
  "page": 1,
  "perPage": 30,
  "totalItems": 0,
  "totalPages": 0,
  "items": []
}
```

**不應該**看到 404 錯誤。

### 測試 2：測試 Webchat

1. 重新載入網頁
2. 開啟 webchat
3. 發送訊息：「測試」
4. 檢查 Console

**預期結果：**
- ✅ 沒有 404 錯誤
- ✅ 顯示 "Saved user message"
- ✅ 訊息成功發送

### 測試 3：檢查 PocketBase 資料

1. 在 PocketBase Admin 開啟 `messages` 集合
2. 應該看到剛才發送的訊息

**預期資料：**
```json
{
  "id": "xxx",
  "conversation": "abc123",
  "sender": "user",
  "channel": "web",
  "content": "測試",
  "created": "2026-03-16T03:46:00.000Z"
}
```

---

## 完整 Schema 匯入（如果需要）

如果您的 PocketBase 是全新的，建議匯入完整 schema：

**包含的集合：**
1. **users**（auth）- 用戶認證
2. **products** - 商品管理
3. **orders** - 訂單管理
4. **conversations** - 對話管理
5. **messages** - 訊息記錄
6. **members** - 會員管理

**匯入後的好處：**
- ✅ 所有集合一次建立
- ✅ 欄位類型正確
- ✅ 關聯關係正確
- ✅ 索引已設定

---

## 常見問題

### Q1：匯入 schema 失敗

**可能原因：**
- Schema 格式不正確
- PocketBase 版本不相容
- 已存在同名集合

**解決方案：**
1. 檢查 PocketBase 版本（建議 0.20.0+）
2. 刪除衝突的集合
3. 使用手動建立方式

### Q2：匯入後仍然 404

**檢查：**
1. 確認集合名稱正確（`messages` 不是 `message`）
2. 重新啟動 PocketBase
3. 清除瀏覽器快取

### Q3：API 規則設定

**開發環境（寬鬆）：**
```
所有規則設為空字串（允許所有人）
```

**生產環境（嚴格）：**
```
List/View: @request.auth.id != ""
Create: @request.auth.id != ""
Update/Delete: @request.auth.id = conversation.user.id
```

---

## 下一步

修復完成後：
1. ✅ 重新啟動 Vite（如果需要）
2. ✅ 清除瀏覽器快取
3. ✅ 測試 webchat 功能
4. ✅ 檢查 PocketBase 資料

**相關文檔：**
- `WEBCHAT_POCKETBASE_RESTART_GUIDE.md` - 重新啟動指南
- `WEBCHAT_POCKETBASE_TEST_GUIDE.md` - 完整測試指南
- `pocketbase/README.md` - PocketBase 設定指南

---

**建立時間：** 2026-03-16 11:46
