# Bot Collaboration Orchestrator 修正指南

## 問題
原始的 **Bot Collaboration Orchestrator** 每 3 分鐘檢查 `agent_workflows` collection，只要有 `status='pending'` 的記錄，就會建立 "[agent] is processing your request..." 訊息，導致重複發送通知。

## 修正內容
新版 `bot-collaboration-orchestrator-fixed.json` 加入**重複檢查機制**：

1. **Check Existing Reply** - 查詢該對話是否已經有 processing 通知
2. **Already Notified?** - 條件判斷：
   - ✅ **True** (已存在) → 跳過，不重複建立訊息
   - ❌ **False** (不存在) → 建立新的 processing 訊息

## 部署步驟

### 步驟 1：匯入新版 Workflow

1. 登入 n8n: https://n8n.zeabur.app
2. 點擊左側 Workflow 列表下方的 **Add Workflow**
3. 點擊右上角 **...** → **Import from JSON**
4. 開啟 `n8n/bot-collaboration-orchestrator-fixed.json` 檔案，複製全部內容
5. 貼上到 n8n 的匯入欄位
6. 點擊 **Import**

### 步驟 2：停用舊版 Workflow

1. 在左側列表找到舊的 **Bot Collaboration Orchestrator**
2. 點擊開啟
3. 點擊右上角的 **Active** 開關，改為 **關閉**
4. 可以選擇性改名為 **Bot Collaboration Orchestrator (OLD)** 以便區分

### 步驟 3：啟動新版 Workflow

1. 點擊 **Bot Collaboration Orchestrator Fixed**
2. 確認節點連線正確（應該有 10 個節點）
3. 點擊右上角的 **Active** 開關，改為 **開啟**

### 步驟 4：驗證

1. 等待 3-5 分鐘
2. 觀察 Telegram 是否還有重複的 "umio is processing your request..." 訊息
3. 預期結果：同一個 workflow 只會收到一次 processing 通知

## 工作流程圖

```
Every 3 Minutes
    ↓
Query Pending Workflows (查詢待處理的 workflow)
    ↓
Has Workflows? (有 workflow 嗎？)
    ↓ Yes
Split Workflows (拆分 workflow 列表)
    ↓
Process Agent (處理每個 agent)
    ↓
Check Existing Reply (檢查是否已發過通知)
    ↓
Already Notified? (已通知過嗎？)
    ↓
┌──────────┴──────────┐
│                     │
Yes                   No
│                     │
↓                     ↓
Skip - Already     Create Bot Reply
Notified           (建立 "is processing" 訊息)
                        ↓
                   Update Workflow Status
```

## 檢查邏輯說明

**Check Existing Reply** 節點會查詢：
```
conversation = [conversationId] 
AND sender = "assistant" 
AND content contains "is processing your request"
```

如果回傳 `totalItems > 0`，表示已經發過通知，就跳過不再建立。

## 故障排除

| 問題 | 解決方案 |
|------|----------|
| 匯入失敗 | 確認 JSON 格式正確，n8n 版本是否支援 |
| 條件判斷不生效 | 檢查 **Already Notified?** 節點的條件是否設定為 `totalItems > 0` |
| 還是收到重複訊息 | 確認舊版 workflow 已停用，新版已啟用 |
| 沒有收到任何 processing 通知 | 檢查 **Check Existing Reply** 的篩選條件是否正確 |

## 回滾方案

如果修正後有問題，可以回滾到舊版：
1. 停用 **Bot Collaboration Orchestrator Fixed**
2. 啟用舊版 **Bot Collaboration Orchestrator**

## 相關檔案

- 新版: `n8n/bot-collaboration-orchestrator-fixed.json`
- 舊版: `n8n/bot-collaboration-orchestrator.json` (備份)
