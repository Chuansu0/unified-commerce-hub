# Telegram Webhook 與 getUpdates 衝突問題

## 問題描述

**症狀：**
- Zeabur 上的 agents（Andrea, Umio 等）不在 Telegram 上回應
- 重啟 OpenClaw 服務後才能正常回應
- Webhook Bridge 啟用後，agents 停止工作

## 根本原因

**Telegram Bot API 的限制：**
> ⚠️ **Webhook 和 getUpdates 不能同時使用！**

- 如果設定了 webhook，`getUpdates` 會返回空結果
- 如果使用 `getUpdates`，webhook 不會收到消息
- 同一個 bot 只能選擇一種模式

**當前架構的衝突：**

```
OpenClaw Bot (Webhook Bridge)
├── 使用 Webhook 模式 ✅
└── 接收消息正常

Andrea/Umio Bots (Zeabur Services)
├── 使用 getUpdates 模式 ❌
└── 無法接收消息（被 webhook 阻擋）
```

## 解決方案

### 方案 1：統一使用 Webhook 模式（推薦）⭐

**優點：**
- ✅ 即時性最好（無需輪詢）
- ✅ 節省資源（不需要持續輪詢）
- ✅ 架構統一，易於維護

**實施步驟：**

1. **為每個 bot 設定 webhook**
   ```bash
   # Andrea Bot
   curl -X POST "https://api.telegram.org/bot<ANDREA_TOKEN>/setWebhook" \
     -d "url=https://webhook-bridge.neovega.cc/webhook/andrea"
   
   # Umio Bot
   curl -X POST "https://api.telegram.org/bot<UMIO_TOKEN>/setWebhook" \
     -d "url=https://webhook-bridge.neovega.cc/webhook/umio"
   ```

2. **修改 Webhook Bridge 支援多個 bots**
   - 添加 `/webhook/andrea` 端點
   - 添加 `/webhook/umio` 端點
   - 每個端點接收對應 bot 的消息

3. **移除 Zeabur agents 的 getUpdates 代碼**
   - 停用輪詢邏輯
   - 改為被動接收 webhook 消息


