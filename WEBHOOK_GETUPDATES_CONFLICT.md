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

**架構圖：**
```
Telegram
  ├── OpenClaw Bot → webhook-bridge.neovega.cc/webhook/openclaw
  ├── Andrea Bot → webhook-bridge.neovega.cc/webhook/andrea
  └── Umio Bot → webhook-bridge.neovega.cc/webhook/umio

Webhook Bridge
  ├── 接收所有 bots 的消息
  ├── 轉發到 n8n 進行路由
  └── 接收 n8n 的回覆並發送回 Telegram
```

### 方案 2：統一使用 getUpdates 模式

**優點：**
- ✅ 實施簡單（移除 webhook 即可）
- ✅ 不需要公開的 webhook URL

**缺點：**
- ❌ 需要持續輪詢（消耗資源）
- ❌ 延遲較高（輪詢間隔）
- ❌ 不適合高流量場景

**實施步驟：**

1. **刪除所有 webhook 設定**
   ```bash
   # OpenClaw Bot
   curl -X POST "https://api.telegram.org/bot<OPENCLAW_TOKEN>/deleteWebhook"
   
   # Andrea Bot
   curl -X POST "https://api.telegram.org/bot<ANDREA_TOKEN>/deleteWebhook"
   
   # Umio Bot
   curl -X POST "https://api.telegram.org/bot<UMIO_TOKEN>/deleteWebhook"
   ```

2. **停用 Webhook Bridge**
   - 在 Zeabur 停止 webhook-bridge 服務

3. **確保所有 agents 使用 getUpdates**
   - 檢查 OpenClaw、Andrea、Umio 的代碼
   - 確認使用輪詢模式

### 方案 3：分離 Bot 實例（不推薦）

為每個用途使用不同的 bot token：
- OpenClaw Bot（webhook）- 用於接收用戶消息
- Andrea Bot（getUpdates）- 用於 AI 回覆
- Umio Bot（getUpdates）- 用於 AI 回覆

**缺點：**
- ❌ 需要管理多個 bot tokens
- ❌ 用戶體驗差（看到多個不同的 bots）
- ❌ 架構複雜

## 推薦實施方案

**選擇方案 1：統一使用 Webhook 模式** ⭐

理由：
1. 最佳性能和即時性
2. 架構統一，易於維護
3. 符合現代 bot 開發最佳實踐
4. Webhook Bridge 已經建立，只需擴展

## 實施計劃

### 階段 1：擴展 Webhook Bridge

修改 `webhook-bridge/src/index.ts`，添加多 bot 支援：

```typescript
// Andrea Bot webhook
app.post('/webhook/andrea', async (req, res) => {
    try {
        const update = req.body;
        console.log('[Andrea] Received update:', update.update_id);
        
        // 處理 Andrea bot 的消息
        // 可以直接處理或轉發到 n8n
        
        res.sendStatus(200);
    } catch (error) {
        console.error('[Andrea] Error:', error);
        res.sendStatus(500);
    }
});

// Umio Bot webhook
app.post('/webhook/umio', async (req, res) => {
    try {
        const update = req.body;
        console.log('[Umio] Received update:', update.update_id);
        
        // 處理 Umio bot 的消息
        
        res.sendStatus(200);
    } catch (error) {
        console.error('[Umio] Error:', error);
        res.sendStatus(500);
    }
});
```

### 階段 2：設定 Webhooks

```powershell
# 設定 Andrea Bot webhook
$andreaToken = "YOUR_ANDREA_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$andreaToken/setWebhook" `
    -Method Post `
    -Body @{ url = "https://webhook-bridge.neovega.cc/webhook/andrea" }

# 設定 Umio Bot webhook
$umioToken = "YOUR_UMIO_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$umioToken/setWebhook" `
    -Method Post `
    -Body @{ url = "https://webhook-bridge.neovega.cc/webhook/umio" }
```

### 階段 3：修改 Zeabur Agents

停用 getUpdates 輪詢邏輯，改為被動接收 webhook 消息。

### 階段 4：測試

1. 向每個 bot 發送測試消息
2. 確認 webhook 正常接收
3. 驗證回覆功能正常

---
建立時間：2026-03-15
狀態：待實施
優先級：高

