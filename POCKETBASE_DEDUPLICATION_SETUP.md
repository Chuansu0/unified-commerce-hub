# Umio 重複發送問題修復指南

## 問題描述

Umio 在 Telegram 群組中重複發送相同的 webchat 訊息。

## 解決方案

使用 `sent_to_telegram` 布林欄位來追蹤哪些訊息已發送到 Telegram。

### 流程

```
User 發送訊息 → PocketBase (sent_to_telegram=false)
                      ↓
              n8n Sender Workflow (每2分鐘檢查)
                      ↓
              查詢 sent_to_telegram=false 的訊息
                      ↓
              發送到 Telegram 群組
                      ↓
              更新 sent_to_telegram=true
                      ↓
              下次不再重複發送
```

## 步驟一：更新 PocketBase Messages Collection

### 方法 A：手動新增欄位

1. 登入 PocketBase Admin UI: `https://www.neovega.cc/pb/_`
2. 進入 **Settings** → **Collections**
3. 選擇 **messages** collection
4. 點擊 **New Field**：
   - 欄位名稱：`sent_to_telegram`
   - 類型：**Boolean**
   - 預設值：**false**
5. 點擊 **New Field**：
   - 欄位名稱：`sent_at`
   - 類型：**Date**

### 方法 B：匯入 JSON（如果支援）

```bash
# 使用 curl 匯入（需 admin token）
curl -X PATCH https://www.neovega.cc/pb/api/collections/messages \
  -H "Authorization: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @pocketbase/messages_collection.json
```

## 步驟二：重新匯入 n8n Sender Workflow

1. 登入 n8n: `https://n8n.neovega.cc`
2. **Workflows** → **Import from File**
3. 選擇 `n8n/bot-collaboration-sender.json`
4. 開啟 Workflow，確認以下節點設定：

### 「Get Unsent Messages」節點

```json
{
  "url": "https://www.neovega.cc/pb/api/collections/messages/records",
  "method": "GET",
  "queryParameters": [
    { "name": "filter", "value": "sent_to_telegram=false" },
    { "name": "sort", "value": "created" },
    { "name": "perPage", "value": "20" }
  ]
}
```

### 「Mark as Sent」節點

```json
{
  "url": "=https://www.neovega.cc/pb/api/collections/messages/records/{{ $json.msgId }}",
  "method": "PATCH",
  "jsonBody": "={\n  \"sent_to_telegram\": true,\n  \"sent_at\": \"{{ $now.toISO() }}\"\n}"
}
```

5. **Save** workflow
6. **Activate** workflow

## 步驟三：測試驗證

1. 在 webchat 發送一條測試訊息
2. 等待最多 2 分鐘
3. 檢查 Telegram 群組是否收到訊息（應該只收到一次）
4. 檢查 PocketBase 該訊息的 `sent_to_telegram` 欄位是否變為 `true`
5. 等待下一個 2 分鐘週期
6. 確認訊息沒有重複發送

## 如何手動回覆群組中的訊息

目前機制是 **單向同步**（Webchat → Telegram），要回覆有以下方式：

### 方式一：在 Telegram 群組直接回覆

1. 在群組中看到 Umio 發送的訊息
2. 回覆該訊息（Reply）
3. 需要額外的 workflow 將 Telegram 回覆同步回 webchat

### 方式二：使用 n8n 手動觸發回覆

建立一個手動 workflow：

1. **Manual Trigger** → 輸入訊息 ID 和回覆內容
2. **Update Message** → 更新 PocketBase 中的訊息
3. **Send to Webchat** → 透過 webhook 發送回前端

### 方式三：建立雙向同步

需要額外的 workflow：

```
Telegram 群組回覆 → n8n Webhook → 更新 PocketBase → 前端 Realtime 更新
```

## 完整資料流

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Webchat   │─────▶│  PocketBase  │─────▶│     n8n     │
│  (前端網站)  │      │  (訊息儲存)   │      │ (Sender WF) │
└─────────────┘      └──────────────┘      └──────┬──────┘
       ▲                                          │
       │                                          ▼
       │                                   ┌─────────────┐
       │                                   │  Telegram   │
       │                                   │   群組      │
       │                                   └──────┬──────┘
       │                                          │
       └──────────────────────────────────────────┘
                    (需要雙向同步 workflow)
```

## 常見問題

### Q: 為什麼還是會重複發送？

A: 檢查以下幾點：
1. `sent_to_telegram` 欄位是否正確建立
2. Sender workflow 的 filter 是否正確設定為 `sent_to_telegram=false`
3. 「Mark as Sent」節點的 PATCH 請求是否成功
4. 查看 n8n Execution log 是否有錯誤

### Q: 如何清空已發送的訊息記錄？

A: 在 PocketBase Admin UI 中：
```javascript
// 在 JavaScript console 執行
pb.collection('messages').getFullList({
  filter: 'sent_to_telegram = true'
}).then(records => {
  records.forEach(r => {
    pb.collection('messages').update(r.id, { sent_to_telegram: false });
  });
});
```

### Q: 可以調整檢查頻率嗎？

A: 可以，修改「Every 2 Minutes」節點：
- 改為 5 分鐘：更省資源，但延遲較高
- 改為 1 分鐘：更快同步，但較耗資源

## 檔案位置

- Schema: `pocketbase/messages_collection.json`
- Workflow: `n8n/bot-collaboration-sender.json`