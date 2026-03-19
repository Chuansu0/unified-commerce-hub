# PocketBase Filter 語法修正

## 問題診斷

**錯誤訊息：**
```
400 - "{"code":400,"message":"Invalid filter parameters.","data":{}}"
```

**原因：**
PocketBase filter 語法錯誤：
```
❌ =sent_to_telegram = false && created >= "..."
```

## 解決方案

**修正後的語法：**
```
✅ sent_to_telegram=false && created>='...'
```

**主要修正：**
1. 移除開頭多餘的 `=`
2. 等號周圍不加空格
3. 使用單引號包裹日期

## 快速更新步驟

### 1. 刪除舊的 Workflow

1. 開啟 n8n
2. 找到 **Webchat Batch Notification** workflow
3. 點擊右上角 **⋮** → **Delete**

### 2. 匯入修正版

1. 點擊右上角 **☰** → **Import from file**
2. 選擇：`n8n/webchat-batch-notification-fixed.json`
3. 點擊 **Import**

### 3. 配置 Telegram Credential

1. 點擊 **Send to Telegram** 節點
2. 選擇或建立 Telegram credential
3. 儲存

### 4. 啟用並測試

1. 點擊右上角開關，啟用 workflow
2. 點擊 **Test workflow** → **Execute workflow**
3. 檢查執行結果

## 預期結果

**成功執行後應該看到：**
- ✅ Query New Messages 節點成功
- ✅ 返回 PocketBase 資料
- ✅ 如果有新訊息，會發送到 Telegram

## 完成！

現在 workflow 應該可以正常執行了。
