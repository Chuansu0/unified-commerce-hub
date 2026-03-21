# Umio 沒有回覆 - 除錯指南

## 問題現象
- n8n workflow 顯示執行成功
- 前端收到 `umio is processing your request...`
- 但沒有收到真正的 Umio 回覆

## 檢查步驟

### 1. 檢查 n8n Executions（最重要）

開啟 n8n → **Executions** 頁面：

1. 找到最新的 workflow 執行記錄
2. 點擊進入詳細頁面
3. **檢查每個節點的輸出：**

#### Call OpenClaw 節點
- 狀態是 ✅ Success 還是 ❌ Error？
- 輸出是什麼？
  - 點擊節點查看 `JSON` 輸出
  - 應該要有 `text` 或 `response` 欄位包含 Umio 的回覆

#### Save to PocketBase 節點
- 狀態是 ✅ Success 還是 ❌ Error？
- 如果有錯誤，錯誤訊息是什麼？

### 2. 測試 OpenClaw API 直接呼叫

在終端機測試 OpenClaw 是否正常：

```bash
curl -X POST https://openclaw.neovega.cc/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "請回答",
    "sessionId": "test-session-123",
    "platform": "umio",
    "agentId": "umio"
  }'
```

**預期結果：** 應該要收到 Umio 的回覆 JSON

### 3. 常見問題

#### 問題 A: OpenClaw 回覆格式不正確
如果 Call OpenClaw 節點成功，但回覆格式不是預期的：

檢查 OpenClaw 回覆格式是否包含以下欄位之一：
- `text`
- `response`
- `message`

目前的 Extract Reply 節點使用：
```
{{ $json.text || $json.response || $json.message || '收到您的訊息，我來想想該如何回覆' }}
```

如果 OpenClaw 回覆格式不同，需要調整。

#### 問題 B: Save to PocketBase 失敗
檢查 Save to PocketBase 節點的錯誤訊息：

常見錯誤：
- `400 Bad Request` - 欄位格式不正確
- `403 Forbidden` - 權限問題
- `404 Not Found` - collection 不存在

#### 問題 C: OpenClaw 服務沒啟動
檢查 OpenClaw 服務狀態：
- 開啟 https://openclaw.neovega.cc
- 確認服務是否正常運作

### 4. 查看 Zeabur Log

開啟 Zeabur Console：
1. 查看 openclaw 服務的 log
2. 查看是否有收到請求
3. 查看是否有錯誤訊息

### 5. 前端除錯

開啟瀏覽器 Console (F12)，執行：

```javascript
// 測試 PocketBase Realtime 訂閱
pb.collection('messages').subscribe('*', function (e) {
  console.log('PocketBase event:', e);
});
```

## 快速修復方案

### 如果 OpenClaw 沒有回應

在 workflow 中加入 No Operation 路徑，當 OpenClaw 失敗時回覆預設訊息：

1. 在 `Call OpenClaw` 節點後加入 **IF** 節點
2. 檢查 `$json.text` 是否存在
3. 如果不存在，回覆預設訊息

### 如果 Save to PocketBase 失敗

1. 檢查 messages collection 的欄位：
   - conversation (string)
   - content (string)
   - sender (string)
   - channel (string)
   - metadata (json)

2. 檢查 API 權限

## 回報資訊

請提供以下資訊以便進一步協助：

1. **n8n Executions 截圖** - 特別是 Call OpenClaw 和 Save to PocketBase 節點的輸出
2. **OpenClaw API 測試結果** - 直接呼叫 API 的回應
3. **Zeabur openclaw log** - 最近的 log 內容
