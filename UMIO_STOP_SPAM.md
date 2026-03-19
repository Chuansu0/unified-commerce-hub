# 停止 Umio 重複發送訊息

## 問題原因
**Bot Collaboration Orchestrator** 和 **Bot Collaboration Sender** 兩個 workflow 造成循環：

1. Orchestrator 每 3 分鐘查詢 `agent_workflows` collection
2. 如果有 `status='pending'` 的記錄，就建立訊息："umio is processing your request..."
3. Sender 每 2 分鐘抓取 `sent_to_telegram=false` 的訊息發送到 Telegram
4. 如果 `agent_workflows` 中有卡住的記錄，就會持續產生訊息

## 解決方案（選擇一個）

### 方案 1：停用 Bot Collaboration Workflow（推薦 - 最簡單）
如果不需要 bot 協作功能，直接停用：

1. 登入 n8n: https://n8n.zeabur.app
2. 點擊 **Bot Collaboration Orchestrator**
3. 點擊右上角的 **Active** 開關，改為關閉
4. 點擊 **Bot Collaboration Sender**
5. 點擊右上角的 **Active** 開關，改為關閉

這樣只保留 **WebChat Umio Simple V3** 處理 WebChat 訊息。

---

### 方案 2：清理 Pending Workflows
如果需要用 Bot Collaboration，清理卡住的記錄：

1. 登入 PocketBase Admin: https://www.neovega.cc/pb/_/
2. 進入 **agent_workflows** collection
3. 篩選 `status = pending`
4. 刪除所有 pending 的記錄，或將它們改為 `status = completed`

---

### 方案 3：修改 Orchestrator Logic
修改 **Bot Collaboration Orchestrator**，避免重複建立 processing 訊息：

修改 **Create Bot Reply** 節點的條件，只在第一次處理時建立訊息。

## 快速修復步驟

**強烈建議使用方案 1：**

1. 在 n8n 中停用這兩個 workflow：
   - ❌ Bot Collaboration Orchestrator
   - ❌ Bot Collaboration Sender
   - ❌ Bot Collaboration Router（如果有的話）

2. 保留啟用的 workflow：
   - ✅ WebChat Umio Simple V3

3. 測試 WebChat 發送訊息，應該只會收到一次通知

## 驗證修復

停用後等待 5 分鐘，確認 Telegram 不再收到 "umio is processing your request..." 訊息。

## 如果需要 Bot Collaboration 功能

請先確認：
1. `agent_workflows` collection 的用途
2. 是否真的有 workflow 需要被處理
3. 為什麼會有這麼多 pending 記錄卡住

然後再決定如何正確配置這些 workflow。
