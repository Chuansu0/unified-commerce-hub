# n8n Workflow 資料引用修復指南

## 問題描述

`Update Workflow Status` 節點出現 404 錯誤，因為從錯誤的來源讀取 `workflowId`。

## 修復內容

### Orchestrator Workflow

**問題節點**: `Update Workflow Status`

**錯誤引用**:
```json
"url": "=.../agent_workflows/records/{{ $json.workflowId }}"
```
- `$json` 指向 `Create Bot Reply` 的回應，不包含 `workflowId`

**正確引用**:
```json
"url": "=.../agent_workflows/records/{{ $('Process Agent').item.json.workflowId }}"
```
- 明確從 `Process Agent` 節點讀取 `workflowId`

### Sender Workflow

**問題節點**: `Mark as Sent`

**錯誤引用**:
```json
"url": "=.../messages/records/{{ $json.msgId }}"
```
- `$json` 指向 `Send to Telegram` 的回應，不包含 `msgId`

**正確引用**:
```json
"url": "=.../messages/records/{{ $('Format Text').item.json.msgId }}"
```
- 明確從 `Format Text` 節點讀取 `msgId`

## n8n 資料引用語法

### 正確的跨節點引用方式

```javascript
// 從特定節點讀取當前 item 的資料
{{ $('Node Name').item.json.fieldName }}

// 從特定節點讀取第一個 item 的資料
{{ $('Node Name').first().json.fieldName }}

// 從特定節點讀取所有 items
{{ $('Node Name').all()[0].json.fieldName }}
```

### 常見錯誤

```javascript
// ❌ 錯誤：依賴上游節點的輸出結構
{{ $json.fieldName }}

// ❌ 錯誤：使用 $input 可能指向不對的節點
{{ $input.json.fieldName }}

// ✅ 正確：明確指定來源節點
{{ $('Specific Node').item.json.fieldName }}
```

## 修復 3: Telegram Rate Limit (429)

**問題**: `Send to Telegram` 節點收到 429 "Too Many Requests" 錯誤

**解決方案**: 增加 batch interval 到 15 秒

```json
"batching": {
    "batch": {
        "batchSize": 1,
        "batchInterval": 15000
    }
}
```

## 部署步驟

1. **重新匯入 Orchestrator Workflow**:
   ```bash
   # n8n → Workflows → Import from File
   # 選擇: n8n/bot-collaboration-orchestrator.json
   ```

2. **重新匯入 Sender Workflow**:
   ```bash
   # n8n → Workflows → Import from File
   # 選擇: n8n/bot-collaboration-sender.json
   ```

3. **驗證節點引用**:
   - 開啟 Workflow
   - 點擊 `Update Workflow Status` 節點
   - 確認 URL 欄位顯示正確的 `$('Process Agent').item.json.workflowId`

4. **驗證 Rate Limit 設定**:
   - 開啟 `Bot Collaboration Sender`
   - 點擊 `Send to Telegram` 節點
   - 確認 Options → Batching → Batch Interval = 15000ms

5. **啟動 Workflows**:
   - Save 並 Activate 所有三個 workflows

## 測試驗證

1. **Webchat 發送訊息**
2. **等待 2-3 分鐘**
3. **檢查 n8n Executions**:
   - Router: 應成功建立 workflow
   - Orchestrator: 應成功更新 status 為 processing
   - Sender: 應成功發送到 Telegram

## 檔案位置

- `n8n/bot-collaboration-orchestrator.json`
- `n8n/bot-collaboration-sender.json`
