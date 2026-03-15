# 手動建立 agent_workflows Collection

## 🎯 目標
在 PocketBase 中建立 `agent_workflows` collection 以支援訊息路由功能。

## 📋 操作步驟

### 1. 登入 PocketBase Admin
1. 訪問：https://www.neovega.cc/pb/_/
2. 使用 admin 憑證登入

### 2. 建立新 Collection
1. 點擊左側選單的 **"Collections"**
2. 點擊右上角 **"New collection"** 按鈕
3. 選擇 **"Base collection"**
4. Collection name: `agent_workflows`
5. 點擊 **"Create"**

### 3. 添加欄位

依次添加以下欄位（點擊 "New field" 按鈕）：

#### 欄位 1: conversation
- Type: **Relation**
- Name: `conversation`
- Required: ✅ 勾選
- Collection: 選擇 `conversations`
- Max select: `1`

#### 欄位 2: workflow_type
- Type: **Select**
- Name: `workflow_type`
- Required: ✅ 勾選
- Values: 添加 3 個選項
  - `single`
  - `sequential`
  - `parallel`
- Max select: `1`

#### 欄位 3: agents
- Type: **JSON**
- Name: `agents`
- Required: ✅ 勾選

#### 欄位 4: status
- Type: **Select**
- Name: `status`
- Required: ✅ 勾選
- Values: 添加 4 個選項
  - `pending`
  - `in_progress`
  - `completed`
  - `failed`
- Max select: `1`

#### 欄位 5: current_agent_index
- Type: **Number**
- Name: `current_agent_index`
- Required: ❌ 不勾選
- Default: `0`

#### 欄位 6: results
- Type: **JSON**
- Name: `results`
- Required: ❌ 不勾選

#### 欄位 7: error
- Type: **Text**
- Name: `error`
- Required: ❌ 不勾選

### 4. 設定 API Rules

在 Collection 設定頁面，找到 **"API Rules"** 區塊：

- **List rule**: 留空（允許所有人）
- **View rule**: 留空（允許所有人）
- **Create rule**: 留空（允許所有人）
- **Update rule**: 留空（允許所有人）
- **Delete rule**: `@request.auth.id != ''`（只有已認證用戶）

### 5. 儲存設定
點擊右上角 **"Save changes"** 按鈕

## ✅ 驗證

在 PowerShell 中執行以下命令驗證 collection 建立成功：

```powershell
$body = '{"conversation":"9rra1vi7oun1l8a","workflow_type":"sequential","agents":["linus","andrea"],"status":"pending","current_agent_index":0}'
Invoke-WebRequest -Uri "https://www.neovega.cc/pb/api/collections/agent_workflows/records" -Method POST -Body $body -ContentType "application/json"
```

如果返回 **200 狀態碼**，表示建立成功！

---

**完成後通知我繼續測試 n8n workflows！**
