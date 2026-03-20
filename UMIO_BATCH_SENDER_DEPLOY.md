# Umio Batch Sender Workflow 部署指南

## 功能說明

每 10 分鐘執行一次批次發送：
1. 查詢 PocketBase `messages` collection
2. 篩選條件：`sent_to_telegram = false` 且 `created >= 3天前`
3. 整合所有訊息為一則批次訊息
4. 發送到 Telegram Chat ID `-1003806455231`
5. 更新已發送訊息的 `sent_to_telegram` 為 `true`

## 訊息格式

```
@neovegaandrea_bot @neovegalinus_bot @neovegalele_bot @neovegamako_bot @neovegaumio_bot

📋 待處理訊息 (5 則):

1. [3/20 14:30] 第一則訊息內容
2. [3/20 14:35] 第二則訊息內容
...

---
💡 請協助回覆以上訊息
```

## PocketBase 欄位需求

`messages` collection 需要以下欄位：
- `sent_to_telegram` (Boolean) - 預設 false
- `batch_sent_at` (Date) - 批次發送時間

## 部署步驟

### 1. 確保 PocketBase 欄位已建立

如果尚未建立，執行：

```javascript
// 在 PocketBase Admin UI 或 API 新增欄位
await pb.collections.update('messages', {
  schema: [
    ...existingFields,
    {
      name: 'sent_to_telegram',
      type: 'bool',
      required: false,
      default: false
    },
    {
      name: 'batch_sent_at',
      type: 'date',
      required: false
    }
  ]
});
```

### 2. 匯入 n8n Workflow

1. 登入 n8n: https://n8n-2h8x.onrender.com
2. **Workflows** → **Add workflow**
3. 點選 **Import from file**
4. 選擇 `n8n/umio-batch-sender-workflow.json`
5. 點選 **Save**

### 3. 設定 PocketBase Credentials

1. 在 n8n 左側選單點選 **Settings**
2. 選擇 **Credentials**
3. 點選 **New** → **PocketBase API**
4. 設定：
   - **Base URL**: `https://pocketbase-xxx.zeabur.app` (你的 PocketBase URL)
   - **Authentication**: Admin Token
   - **Admin Token**: 從 PocketBase Admin UI 取得

### 4. 啟用 Workflow

1. 開啟 workflow
2. 點選右上角的 **Activate** toggle
3. workflow 會每 10 分鐘自動執行

## 測試

### 手動執行測試

1. 在 PocketBase 建立幾筆測試訊息，`sent_to_telegram` 設為 false
2. 在 n8n workflow 點選 **Execute Workflow** 手動觸發
3. 檢查：
   - Telegram 是否收到批次訊息
   - PocketBase 中的訊息 `sent_to_telegram` 是否變為 true

### 檢查 Execution Log

在 n8n 左側選單：
1. **Executions**
2. 查看最近的執行記錄
3. 確認沒有錯誤

## 調整排程

預設每 10 分鐘執行一次。如需調整：

1. 開啟 workflow
2. 點選 **ScheduleTrigger** node
3. 修改 **Interval** 設定
4. 儲存並重新啟用

## Troubleshooting

### PocketBase 連線失敗

- 確認 PocketBase URL 正確
- 確認 Admin Token 有效
- 檢查 PocketBase 服務是否正常運行

### Telegram 發送失敗

- 確認 Bot Token 正確
- 確認 Chat ID `-1003806455231` 正確
- 檢查 Bot 是否有權限發送到該群組

### 訊息未被標記為已發送

- 確認 `messages` collection 有 `sent_to_telegram` 欄位
- 確認 PocketBase credentials 有 update 權限
