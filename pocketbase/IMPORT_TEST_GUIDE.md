# PocketBase 匯入測試指南

## 🎯 目的
診斷 PocketBase schema 匯入功能的問題，找出失敗的根本原因。

## 📋 測試步驟

### 測試 1：空 Collections
**文件：** `test-empty.json`  
**內容：** 只包含空的 collections 陣列

**操作：**
1. 登入 https://www.neovega.cc/pb/_/
2. Settings → Import collections
3. 上傳 `test-empty.json`

**預期結果：** 應該成功（不會建立任何 collection）

**如果失敗：** PocketBase 匯入功能本身有問題或被禁用

---

### 測試 2：最簡單的 Collection
**文件：** `test-minimal.json`  
**內容：** 一個名為 `test_collection` 的空 collection（沒有欄位）

**操作：**
1. 上傳 `test-minimal.json`

**預期結果：** 應該成功建立 `test_collection`

**如果失敗：** PocketBase 不允許建立空 collection

---

### 測試 3：帶欄位的 Collection
**文件：** `test-simple.json`  
**內容：** 一個名為 `test_simple` 的 collection，包含一個文字欄位 `title`

**操作：**
1. 上傳 `test-simple.json`

**預期結果：** 應該成功建立 `test_simple` collection

**如果失敗：** 欄位定義有問題

---

## 🔍 診斷結果

### 情況 A：所有測試都失敗
**可能原因：**
- PocketBase 版本不支援匯入功能
- 匯入功能被禁用
- 需要特定的管理員權限

**解決方案：**
- 使用手動建立方式（參考 `CREATE_AGENT_WORKFLOWS_MANUAL.md`）

### 情況 B：測試 1 成功，測試 2/3 失敗
**可能原因：**
- Collection 定義格式不正確
- 缺少必要的欄位

**解決方案：**
- 檢查 PocketBase 版本和文件
- 調整 JSON 格式

### 情況 C：所有測試都成功
**可能原因：**
- `agent_workflows_only.json` 的結構太複雜
- 包含不支援的欄位類型（如 Relation）

**解決方案：**
- 簡化 `agent_workflows_only.json`
- 先建立基本 collection，再手動添加複雜欄位

---

## 📝 測試結果記錄

請記錄每個測試的結果：

- [ ] 測試 1 (test-empty.json): ⬜ 成功 / ⬜ 失敗
- [ ] 測試 2 (test-minimal.json): ⬜ 成功 / ⬜ 失敗  
- [ ] 測試 3 (test-simple.json): ⬜ 成功 / ⬜ 失敗

**錯誤訊息：**
```
（請貼上錯誤訊息）
```

---

**完成測試後，請告訴我結果，我會根據情況提供下一步方案！**
