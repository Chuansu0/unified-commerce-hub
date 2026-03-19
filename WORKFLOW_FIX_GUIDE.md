# n8n Workflow 修正指南

## 問題

原始 workflow 使用環境變數 `{{$env.POCKETBASE_URL}}`，但 n8n 中未設定此變數，導致 URL 錯誤。

## 解決方案

使用修正版 workflow，直接使用完整 URL。

## 快速修正步驟

### 1. 刪除舊的 Workflow（如果已匯入）

1. 開啟 n8n
2. 找到 **Webchat Batch Notification** workflow
3. 點擊右上角 **⋮** → **Delete**
4. 確認刪除

### 2. 匯入修正版 Workflow

1. 點擊右上角 **☰** 選單
2. 選擇 **Import from file**
3. 選擇：`n8n/webchat-batch-notification-fixed.json`
4. 點擊 **Import**

### 3. 檢查配置

修正版已包含：
- ✅ 完整 PocketBase URL：`https://www.neovega.cc/pb/api/collections/messages/records`
- ✅ Telegram 群組 ID：`-1002329510026`
- ✅ 所有必要的節點配置

### 4. 配置 Telegram Credentials

1. 點擊 **Send to Telegram** 節點
2. 在 **Credential to connect with** 下拉選單中選擇或建立 Telegram credential
3. 儲存

### 5. 啟用 Workflow

1. 點擊右上角 **Inactive** 開關
2. 切換為 **Active** ✅

### 6. 測試

1. 點擊 **Test workflow** 按鈕
2. 點擊 **Execute workflow**
3. 檢查執行結果

## 主要差異

### 原始版本（錯誤）
```json
"url": "={{$env.POCKETBASE_URL}}/api/collections/messages/records"
```

### 修正版本（正確）
```json
"url": "https://www.neovega.cc/pb/api/collections/messages/records"
```

## 完成！

現在 workflow 應該可以正常執行了。
