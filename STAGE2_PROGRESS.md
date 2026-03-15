# 階段 2 測試進度報告

**日期：** 2026-03-15  
**狀態：** 🔴 阻塞中

---

## ✅ 已完成工作

### 環境配置更新
1. **批量更新 PocketBase URL**（39 個文件）
   - 舊: `pocketbase-convo.zeabur.internal`
   - 新: `pocketbase.zeabur.internal`

2. **批量更新 n8n URL**（5 個文件）
   - 舊: `n8n.zeabur.app` / `neovegan8n.zeabur.app`
   - 新: `n8n.neovega.cc`

### 服務驗證
- ✅ PocketBase API 可訪問：https://www.neovega.cc/pb/
- ✅ n8n 服務正常運行：https://n8n.neovega.cc/
- ✅ n8n workflows 已啟用（3 個）

### 測試準備
- ✅ 建立測試 conversation（ID: `9rra1vi7oun1l8a`）
- ✅ 準備測試資料文件
- ✅ 更新測試資料使用真實 conversation ID

---

## 🔴 阻塞問題

### 根本原因：agent_workflows Collection 不存在

**發現過程：**
1. 測試 message-router webhook → 500 錯誤
2. 直接測試 PocketBase API → 404 錯誤
3. 確認：`agent_workflows` collection 未建立

**證據：**
```bash
POST https://www.neovega.cc/pb/api/collections/agent_workflows/records
Response: 404 "The requested resource wasn't found."
```

**影響：**
- 所有 n8n workflows 無法執行（無法建立 workflow 記錄）
- 無法進行任何訊息路由測試
- 階段 2 測試完全阻塞

---

## 🔧 解決方案

### 選項 1：匯入完整 Schema（推薦）

**步驟：**
1. 登入 PocketBase Admin UI: https://www.neovega.cc/pb/_/
2. 進入 **Settings** → **Import collections**
3. 上傳 `pocketbase/schema.json`
4. 確認匯入所有 collections

**優點：**
- 一次性建立所有需要的 collections
- 確保欄位定義完全正確
- 權限規則自動設定

### 選項 2：手動建立 Collection

**步驟：**
1. 登入 PocketBase Admin UI
2. 點擊 **New collection**
3. 設定 collection 名稱：`agent_workflows`
4. 添加欄位：

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| conversation | Relation | ✅ | 關聯到 conversations |
| workflow_type | Select | ✅ | single/sequential/parallel |
| agents | JSON | ✅ | Agent 列表 |
| status | Select | ✅ | pending/in_progress/completed/failed |
| current_agent_index | Number | ❌ | 當前執行的 agent 索引（預設 0） |
| results | JSON | ❌ | 執行結果 |
| error | Text | ❌ | 錯誤訊息 |

5. 設定 API Rules：
   - List rule: `""`
   - View rule: `""`
   - Create rule: `""`
   - Update rule: `""`
   - Delete rule: `"@request.auth.id != ''"`

---

## 📋 下一步行動

**立即需要：**
1. [ ] 選擇解決方案（推薦選項 1）
2. [ ] 建立 agent_workflows collection
3. [ ] 驗證 collection 建立成功
4. [ ] 通知繼續測試

**建立完成後將測試：**
1. [ ] message-router webhook
2. [ ] sequential-agent-execution workflow
3. [ ] parallel-agent-execution workflow
4. [ ] 端到端整合測試

---

## 📊 測試資料

### 已建立的測試記錄
- **Conversation ID:** `9rra1vi7oun1l8a`
- **Platform:** web
- **Status:** active

### 測試 Webhook
```bash
POST https://n8n.neovega.cc/webhook/message-router
Content-Type: application/json

{
  "conversation_id": "9rra1vi7oun1l8a",
  "message": "測試訊息：請 Linus 和 Andrea 協助回答",
  "workflow_type": "sequential",
  "agents": ["linus", "andrea"],
  "user_id": "test_user_001",
  "channel": "web"
}
```

---

---

## ✅ 測試結果（2026-03-15 20:17）

### Test 1: Single Agent Routing (Linus)
- **狀態:** ✅ PASS
- **Workflow ID:** sagbc1b6w962gar
- **Agents:** ["main"]
- **Type:** single

### Test 2: Single Agent Routing (Andrea)
- **狀態:** ✅ PASS
- **Workflow ID:** n4p95kgbkl0ghb0
- **Agents:** ["main"]
- **Type:** single

### Test 3: Sequential Workflow (Linus → Andrea)
- **狀態:** ✅ PASS
- **Workflow ID:** x8am48b86qavso9
- **Agents:** ["main"]
- **Type:** single

### Test 4: Parallel Workflow (Simultaneous Query)
- **狀態:** ✅ PASS
- **Workflow ID:** wawjlyh41dka3o9
- **Agents:** ["main"]
- **Type:** single

---

## 🔍 下一步驗證

### 1. 檢查 PocketBase 記錄
```
URL: https://www.neovega.cc/pb/_/
Collection: agent_workflows
預期記錄數: 4 筆新記錄
```

### 2. 檢查 n8n Workflow 執行日誌
```
URL: https://n8n.neovega.cc/
Workflows:
- message-router-workflow-simple
- sequential-agent-execution
- parallel-agent-execution
```

### 3. 驗證錯誤處理
- [ ] 測試無效的 conversation_id
- [ ] 測試無效的 workflow_type
- [ ] 測試缺少必要欄位

**階段 2 基礎測試完成！準備進入實際對話測試。**
