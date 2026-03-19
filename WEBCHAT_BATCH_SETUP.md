# Webchat 批次通知快速設定指南

## 概述

將 webchat 訊息改為每 5 分鐘批次發送到 Telegram 群組，自動 mention 所有 bots。

## 前置需求

- ✅ PocketBase 正常運作
- ✅ n8n 正常運作
- ✅ Telegram Bot Token 已配置

## 步驟 1：更新 PocketBase Schema

### 1.1 開啟 PocketBase Admin

```
https://www.neovega.cc/pb/_/
```

### 1.2 編輯 messages 集合

1. 點擊 **Collections** → **messages**
2. 點擊 **+ New field**
3. 新增欄位：

**欄位 1：sent_to_telegram**
- Type: Bool
- Default: false
- Required: No

**欄位 2：sent_at**
- Type: Date
- Required: No

4. 點擊 **Save**

## 步驟 2：匯入 n8n Workflow

### 2.1 開啟 n8n

```
https://你的n8n網址
```

### 2.2 匯入 Workflow

1. 點擊右上角 **三條線選單** → **Import from File**
2. 選擇：`n8n/webchat-batch-notification.json`
3. 點擊 **Import**

### 2.3 配置環境變數

確認 n8n 環境變數已設定：

```bash
POCKETBASE_URL=https://www.neovega.cc/pb
TELEGRAM_GROUP_CHAT_ID=-1001234567890  # 你的群組 ID
```

### 2.4 配置 Telegram Credentials

1. 開啟 workflow
2. 點擊 **Send to Telegram** 節點
3. 配置 Telegram credentials（如果尚未配置）
4. 測試連線

### 2.5 啟用 Workflow

1. 點擊右上角 **Inactive** 切換為 **Active**
2. 確認 Cron 已啟動（每 5 分鐘執行一次）

## 步驟 3：測試

### 3.1 發送測試訊息

1. 開啟 webchat：`https://www.neovega.cc`
2. 發送測試訊息：「測試批次通知」
3. 檢查 PocketBase：
   - 訊息已儲存 ✅
   - `sent_to_telegram = false` ✅

### 3.2 等待 5 分鐘

Cron 會在下一個 5 分鐘間隔執行（例如：13:00, 13:05, 13:10...）

### 3.3 檢查結果

**Telegram 群組應該收到：**
```
@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot

📬 新的 Webchat 對話
━━━━━━━━━━━━━━━━

💬 對話 1 (umio-xxx)
👤 測試批次通知
🤖 Message received
```

**PocketBase 應該更新：**
- `sent_to_telegram = true` ✅
- `sent_at = 2026-03-18T...` ✅

## 步驟 4：調整（可選）

### 修改時間間隔

1. 開啟 workflow
2. 點擊 **Every 5 Minutes** 節點
3. 修改 `minutesInterval` 值
4. 儲存並重新啟用

### 修改訊息格式

1. 開啟 workflow
2. 點擊 **Format Message** 節點
3. 修改 JavaScript 代碼
4. 儲存

## 常見問題

### Q: 沒有收到 Telegram 訊息？

**檢查清單：**
- [ ] n8n workflow 已啟用
- [ ] Telegram credentials 已配置
- [ ] TELEGRAM_GROUP_CHAT_ID 正確
- [ ] PocketBase 中有 `sent_to_telegram = false` 的訊息
- [ ] 檢查 n8n execution log

### Q: 訊息重複發送？

**原因：** `sent_to_telegram` 欄位未正確更新

**解決：**
1. 檢查 **Mark as Sent** 節點
2. 確認 PocketBase API 權限
3. 檢查 execution log 中的錯誤

### Q: 如何立即測試而不等 5 分鐘？

**方法：**
1. 開啟 workflow
2. 點擊 **Test workflow** 按鈕
3. 手動執行一次

## 監控

### 檢查 n8n Execution Log

1. 開啟 n8n
2. 點擊左側 **Executions**
3. 查看 **Webchat Batch Notification** 的執行記錄
4. 檢查是否有錯誤

### 檢查 PocketBase

定期檢查是否有訊息卡在 `sent_to_telegram = false` 狀態。

## 完成！

現在 webchat 訊息會每 5 分鐘批次發送到 Telegram 群組，自動 mention 所有 bots。

**相關文檔：**
- `webchat-automation-20260318-1.md` - 完整計畫
- `n8n/webchat-batch-notification.json` - Workflow 檔案
