# Direct Telegram Bot API 設定指南

這個方案讓你**繞過 OpenClaw**，直接使用 Telegram Bot API 發送訊息。

## 優勢

- ✅ **無需 OpenClaw WebSocket** - 直接使用 HTTPS API
- ✅ **快速回應** - 無需等待 WebSocket 連線
- ✅ **個人控制** - 使用你自己的 Bot Token
- ✅ **簡單可靠** - 單純的 HTTP API 呼叫

## 設定步驟

### 1. 建立 Telegram Bot

1. 在 Telegram 搜尋 `@BotFather`
2. 發送 `/newbot` 指令
3. 依照指示命名你的 Bot（例如：`MyWebchatBot`）
4. 取得 **Bot Token**（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### 2. 取得你的 Chat ID

#### 方法 A：個人訊息（私聊 Bot）

1. 開始與你的 Bot 對話（搜尋 Bot 名稱並點擊 Start）
2. 發送任意訊息
3. 訪問這個網址：
   ```
   https://api.telegram.org/bot<你的BotToken>/getUpdates
   ```
4. 找到 `"chat":{"id":123456789` 這個數字就是你的 User ID

#### 方法 B：群組訊息

1. 將 Bot 加入群組
2. 在群組發送一則訊息
3. 訪問 `https://api.telegram.org/bot<你的BotToken>/getUpdates`
4. 群組 ID 通常是負數（例如：`-123456789`）

### 3. 設定環境變數

在專案根目錄建立 `.env` 檔案：

```env
# 你的 Bot Token
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# 你的 Telegram User ID
VITE_TELEGRAM_USER_ID=123456789

# 或發送到群組
VITE_TELEGRAM_GROUP_ID=-123456789
```

## 使用方式

### 在 React/Vite 中使用

```typescript
import {
  sendMessageDirect,
  testBotConnection,
} from '@/services/directTelegram';

// 測試 Bot 連線
const isConnected = await testBotConnection();
console.log('Bot 連線狀態:', isConnected);

// 發送訊息
await sendMessageDirect({
  message: '你好，這是測試訊息',
  sessionId: 'user-123',
  userName: '訪客用戶',
  metadata: {
    source: 'webchat',
    page: '/contact',
  },
});
```

### 在 ChatWidget 中整合

你可以修改 `ChatWidget.tsx`，當 OpenClaw 失敗時自動切換到 Direct Telegram：

```typescript
import { sendMessageDirect } from '@/services/directTelegram';

// 發送訊息時
const sendMessage = async (message: string) => {
  try {
    // 嘗試 OpenClaw（如果有連線）
    if (openclawConnected) {
      await sendToOpenClaw({ message, sessionId });
    } else {
      // 繞過 OpenClaw，直接發送到 Telegram
      await sendMessageDirect({
        message,
        sessionId,
        userName: '網站訪客',
      });
    }
  } catch (error) {
    console.error('發送失敗:', error);
  }
};
```

## 測試

在瀏覽器 Console 測試：

```javascript
import { sendMessageDirect, testBotConnection } from '/src/services/directTelegram.ts';

// 測試連線
await testBotConnection();

// 發送測試訊息
await sendMessageDirect({
  message: '測試訊息！',
  sessionId: 'test-' + Date.now(),
});
```

## 注意事項

1. **安全性**：Bot Token 是敏感資訊，請勿提交到 Git
2. **Rate Limit**：Telegram API 有頻率限制（約 30 則/秒）
3. **訊息格式**：支援 Markdown 格式，但不要使用過多特殊字元
4. **CORS**：在開發環境可能會遇到 CORS，建議使用 Vite proxy

## 與 OpenClaw 的比較

| 功能 | Direct Telegram | OpenClaw |
|------|----------------|----------|
| WebSocket | ❌ 不需要 | ✅ 需要 |
| 即時回覆 | ❌ 需另外實作 | ✅ 支援 |
| 設定難度 | ✅ 簡單 | ⚠️ 較複雜 |
| 成本 | ✅ 免費 | 視 OpenClaw 而定 |
| AI 回覆 | ❌ 需自己整合 | ✅ OpenClaw 提供 |

## 適用場景

- **通知用途**：訂單通知、系統警報
- **簡單轉發**：將 Webchat 訊息轉發到 Telegram
- **備援方案**：當 OpenClaw 失效時的替代方案
