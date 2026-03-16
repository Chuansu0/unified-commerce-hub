# Webchat 500 錯誤修正指南

## 問題

1. ~~Webchat PocketBase 儲存成功，但 `/api/umio/chat` 返回 500 錯誤~~ ✅ 已解決
2. ~~Assistant message 儲存失敗（400錯誤）~~ ✅ 已解決

## 原因

1. n8n webhook 未配置 → 已匯入簡化版 workflow
2. 回應格式不匹配 → 已修正代碼支援兩種格式

## 解決方案

### 步驟 1：匯入簡化版 Workflow

1. 開啟 n8n：`https://你的n8n網址`
2. 點擊右上角 **三條線選單** → **Import from File**
3. 選擇：`n8n/webchat-umio-simple.json`
4. 點擊 **Import**

### 步驟 2：啟用 Workflow

1. 開啟剛匯入的 **WebChat Umio Simple** workflow
2. 點擊右上角 **Inactive** 切換為 **Active**
3. 確認 webhook 路徑：`umio-chat`

### 步驟 3：測試

清除瀏覽器快取並測試 webchat：

```bash
# 重新啟動 Vite
npm run dev

# 清除快取：Ctrl + Shift + R
# 發送測試訊息
```

## Workflow 說明

**webchat-umio-simple.json** - 最簡化版本
- ✅ 接收 webhook
- ✅ 立即回應成功
- ❌ 不涉及 Telegram（避免 credentials 問題）

## 下一步

成功後可以升級到完整版：
- `webchat-umio-integration-workflow-fixed.json` - 包含 Telegram 整合


