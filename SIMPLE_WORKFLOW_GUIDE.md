# 超簡化版 Workflow 使用指南

## 這個版本的特點

✅ **移除了複雜的日期條件**
- 只使用 `sent_to_telegram=false` 作為 filter
- 避免了日期格式和時區問題

✅ **簡化了訊息格式**
- 不再按對話分組
- 簡單列出所有新訊息

✅ **保留核心功能**
- 自動查詢未發送的訊息
- 發送到 Telegram 群組
- 標記為已發送

## 快速匯入步驟

### 1. 刪除舊的 Workflow（如果有）

1. 開啟 n8n
2. 刪除之前的 "Webchat Batch Notification" workflow

### 2. 匯入簡化版

1. 點擊右上角 **☰** → **Import from file**
2. 選擇：`n8n/webchat-batch-notification-simple.json`
3. 點擊 **Import**

### 3. 配置 Telegram Credential

1. 點擊 **Send to Telegram** 節點
2. 選擇或建立 Telegram credential
3. 儲存

### 4. 測試

1. 點擊 **Test workflow** → **Execute workflow**
2. 查看執行結果

## 預期結果

如果有新訊息，Telegram 會收到：

```
@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot

📬 新的 Webchat 訊息
━━━━━━━━━━━━━━━━

1. 👤 用戶訊息內容
2. 🤖 Bot 回覆內容
3. 👤 另一個用戶訊息
```

## 如果還是失敗

請提供：
1. 哪個節點失敗了？
2. 完整的錯誤訊息
3. 錯誤截圖

## 完成！

這個版本應該可以正常運作了。
