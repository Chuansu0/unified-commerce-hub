# Agent Workflows API 設定指南

## 問題診斷

**錯誤：** n8n workflow 執行失敗，無法建立 agent_workflows 記錄

**原因：** agent_workflows collection 沒有設定 API 規則，預設拒絕所有存取

## 解決方案

### 方案 1：設定公開寫入（測試用）

1. 登入 PocketBase Admin UI
2. 進入 Collections > agent_workflows
3. 設定 API Rules：
   - **createRule**: `""` (空字串 = 公開)
   - **listRule**: `""` 
   - **viewRule**: `""`
   - **updateRule**: `""`
   - **deleteRule**: `"@request.auth.id != ''"`

### 方案 2：使用 Admin Token（推薦）

待補充...

### 方案 3：服務帳號認證

待補充...
