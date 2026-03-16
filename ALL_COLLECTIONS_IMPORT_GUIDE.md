# 完整集合匯入指南

**檔案：** `pocketbase/all_collections.json`

**包含集合：** 6 個（按相依性順序排列）

---

## 集合清單

1. ✅ **users** (auth) - 用戶認證
2. ✅ **conversations** (base) - 對話記錄
3. ✅ **messages** (base) - 訊息內容
4. ✅ **products** (base) - 商品資料
5. ✅ **orders** (base) - 訂單管理
6. ✅ **members** (base) - 會員系統

---

## 立即匯入（3 步驟）

### 步驟 1：開啟 PocketBase Admin
```
http://localhost:8090/_/
```

### 步驟 2：匯入集合
1. 點擊 **Settings**
2. 點擊 **Import collections**
3. 選擇：`pocketbase/all_collections.json`
4. 點擊 **Import**

### 步驟 3：確認成功
左側選單應該出現所有 6 個集合

---

## 驗證匯入

```javascript
// 測試所有集合
const collections = ['users', 'conversations', 'messages', 'products', 'orders', 'members'];

collections.forEach(name => {
  fetch(`http://localhost:8090/api/collections/${name}/records`)
    .then(r => r.json())
    .then(data => console.log(`✅ ${name}:`, data))
    .catch(err => console.error(`❌ ${name}:`, err));
});
```

---

## 相依性說明

**正確的匯入順序（已自動處理）：**
1. users - 基礎認證集合
2. conversations - messages 依賴它
3. messages - 依賴 conversations
4. products - 獨立
5. orders - 依賴 users
6. members - 依賴 users

**注意：** 此檔案已按照正確順序排列，一次匯入即可。

---

## 下一步

1. ✅ 重新啟動 Vite: `npm run dev`
2. ✅ 清除瀏覽器快取: `Ctrl + Shift + R`
3. ✅ 測試所有功能

**相關文檔：**
- `WEBCHAT_POCKETBASE_TEST_GUIDE.md` - Webchat 測試
- `POCKETBASE_SCHEMA_IMPORT_GUIDE.md` - Schema 匯入指南
