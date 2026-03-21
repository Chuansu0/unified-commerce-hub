# n8n V11 Workflow 快速修復

## 問題確認
PocketBase 收到訊息 ✅  
Call OpenClaw Bridge 失敗 ❌ (message 和 sessionId 為空)

## 正確的 V11 語法

在 n8n V11 中，要引用上游節點的資料，使用：
```
$('節點名稱').item.json.body.欄位名
```

## 在 n8n 中修復 (2 分鐘)

1. 登入 https://n8n.neovega.cc
2. 打開 **Webchat Umio Simple V11 (Fixed URL)** workflow
3. 點擊 **Prepare Request** 節點
4. 修改以下 4 個欄位的值：

| 欄位名 | 改成這個值 |
|-------|-----------|
| `sessionId` | `={{ $('Umio Chat Webhook').item.json.body.sessionId }}` |
| `conversationId` | `={{ $('Umio Chat Webhook').item.json.body.conversationId }}` |
| `message` | `={{ $('Umio Chat Webhook').item.json.body.message }}` |
| `platform` | `={{ $('Umio Chat Webhook').item.json.body.context?.platform \|\| 'umio' }}` |

5. 點擊 **Save** 保存
6. 點擊 **Call OpenClaw Bridge** 節點
7. 修改 `jsonBody`：
```json
{
  "message": "{{ $('Prepare Request').item.json.message }}",
  "sessionId": "{{ $('Prepare Request').item.json.sessionId }}"
}
```
8. 保存並重新啟動 workflow

## 驗證測試

發送訊息後檢查 n8n 執行記錄：
- Prepare Request 節點輸出應該有正確的 `message` 和 `sessionId`
- Call OpenClaw Bridge 不應該再出現 400 錯誤

## 替代方案：重新匯入

如果不想手動改，可以：
1. 在 n8n 中刪除現有的 V11 workflow
2. 匯入 `n8n/webchat-umio-simple-v11.json`（已修正為正確語法）
3. 啟動 workflow
