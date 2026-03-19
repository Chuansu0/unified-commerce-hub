# Format Message 節點修復指南

## 問題描述

Webchat Batch Notification (Simple) workflow 的 Format Message 節點出現以下問題：
1. **超時錯誤**：Task request timed out after 10 seconds
2. **編碼問題**：第10行的破折號字符顯示不正確

## 修復內容

### 1. Format Message 節點改進

**原始代碼問題**：
- 缺少安全的數據檢查
- 可能因為數據結構不正確導致錯誤和超時

**修復後的代碼**：
```javascript
// 安全地獲取訊息
const inputData = $input.all();
if (!inputData || inputData.length === 0 || !inputData[0].json || !inputData[0].json.items) {
  return [];
}

const messages = inputData[0].json.items;

if (messages.length === 0) {
  return [];
}

// 簡單格式化
let text = '@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot\n\n';
text += '📬 新的 Webchat 訊息\n';
text += '━━━━━━━━━━━━━━━━\n\n';

messages.forEach((msg, index) => {
  const icon = msg.sender === 'user' ? '👤' : '🤖';
  text += `${index + 1}. ${icon} ${msg.content}\n`;
});

return [{
  json: {
    text: text,
    messageIds: messages.map(m => m.id)
  }
}];
```

**改進點**：
- ✅ 添加了完整的數據驗證
- ✅ 使用正確的 Unicode 字符 `━` (U+2501)
- ✅ 防止空數據導致的錯誤
- ✅ 提前返回避免不必要的處理

### 2. Mark as Sent 節點簡化

**原始問題**：
- 在 Code 節點中使用 HTTP 請求可能不穩定

**修復方案**：
- 簡化為只輸出 messageIds
- 後續可以添加 HTTP Request 節點來更新 PocketBase

## 導入修復版本

### 方法 1：在 n8n 界面中手動更新

1. 打開 n8n: https://n8n.neovega.cc
2. 找到 "Webchat Batch Notification (Simple)" workflow
3. 點擊 "Format Message" 節點
4. 將上面的修復代碼複製貼上
5. 點擊 "Execute node" 測試
6. 保存 workflow

### 方法 2：導入新的 workflow

1. 打開 n8n: https://n8n.neovega.cc
2. 點擊右上角的 "+" 按鈕
3. 選擇 "Import from File"
4. 選擇 `n8n/webchat-batch-notification-simple-fixed.json`
5. 導入後測試

## 測試步驟

### 1. 準備測試數據

確保 PocketBase 中有未發送的訊息：
```sql
-- 檢查是否有 sent_to_telegram=false 的訊息
SELECT * FROM messages WHERE sent_to_telegram = false LIMIT 5;
```

### 2. 測試 Format Message 節點

1. 在 n8n 中打開 workflow
2. 點擊 "Format Message" 節點
3. 點擊 "Execute node" 按鈕
4. 查看輸出是否正確格式化

**預期輸出**：
```json
{
  "text": "@neovegaandrea_bot, @neovegalele_bot, @neovegalinus_bot, @neovegalittleq_bot\n\n📬 新的 Webchat 訊息\n━━━━━━━━━━━━━━━━\n\n1. 👤 測試訊息內容\n",
  "messageIds": ["id1", "id2", "id3"]
}
```

### 3. 完整 Workflow 測試

1. 點擊 "Execute workflow" 按鈕
2. 查看執行日誌
3. 確認訊息已發送到 Telegram 群組
4. 檢查 PocketBase 中的訊息是否標記為已發送

## 常見問題

### Q1: 仍然出現超時錯誤

**解決方案**：
- 檢查 PocketBase API 是否正常運作
- 確認 `sent_to_telegram` 欄位存在
- 減少 `perPage` 參數（從 50 改為 10）

### Q2: 訊息格式不正確

**解決方案**：
- 檢查 `msg.sender` 和 `msg.content` 欄位是否存在
- 確認數據結構符合預期

### Q3: Telegram 發送失敗

**解決方案**：
- 檢查 Telegram Bot API credentials
- 確認 chatId 正確：`-1002459090412`
- 測試 bot 是否在群組中

## 下一步

完成測試後，可以：
1. 啟用定時觸發器（每5分鐘執行一次）
2. 監控執行日誌
3. 根據需要調整訊息格式
4. 添加更多的錯誤處理邏輯

## 相關文件

- `n8n/webchat-batch-notification-simple.json` - 原始 workflow
- `n8n/webchat-batch-notification-simple-fixed.json` - 修復版本
- `SIMPLE_WORKFLOW_GUIDE.md` - 完整設置指南
