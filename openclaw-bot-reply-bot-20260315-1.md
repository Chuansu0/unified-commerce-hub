# OpenClaw Bot 互動增強計畫

**建立日期：** 2026-03-15  
**狀態：** 計畫中  
**優先級：** 高

## 問題分析

### 原始問題描述

> "Telegram 會自動過濾 bot 發出的訊息而不讓其他 bot 讀取反應，達不到互動的目標"

### 真實問題診斷

經過深入分析，發現問題的根本原因**不是** Telegram 過濾 bot 訊息，而是：

**⚠️ Webhook 和 getUpdates 模式衝突**

**技術細節：**
- Telegram Bot API 限制：同一個 bot 不能同時使用 webhook 和 getUpdates
- 當前架構：
  - OpenClaw Bot 使用 Webhook 模式（透過 webhook-bridge）
  - Andrea/Umio Bots 使用 getUpdates 模式（輪詢）
- 結果：當 webhook 啟用時，getUpdates 返回空結果，導致 agents 無法接收訊息

**症狀：**
1. Webhook Bridge 啟用後，Zeabur 上的 agents 停止回應
2. 重啟 OpenClaw 服務後才能暫時恢復
3. 看起來像是"bot 訊息被過濾"，實際上是 API 模式衝突

## 解決方案評估

### 方案 A：統一使用 Webhook 模式 ⭐ (推薦)

**概述：**
所有 bots（OpenClaw、Andrea、Umio）都使用 webhook 模式，透過 Webhook Bridge 統一接收和處理訊息。

**優點：**
- ✅ 即時性最佳（無輪詢延遲）
- ✅ 資源效率高（無需持續輪詢）
- ✅ 架構統一，易於維護和擴展
- ✅ 符合現代 bot 開發最佳實踐
- ✅ 已有 Webhook Bridge 基礎，只需擴展

**缺點：**
- ⚠️ 需要修改現有 Zeabur agents 代碼
- ⚠️ 需要公開的 webhook URL（已有）
- ⚠️ 實施工作量中等

**技術架構：**
```
Telegram API
  ├── OpenClaw Bot → webhook-bridge/webhook/openclaw
  ├── Andrea Bot → webhook-bridge/webhook/andrea
  └── Umio Bot → webhook-bridge/webhook/umio

Webhook Bridge (webhook-bridge.neovega.cc)
  ├── 接收所有 bots 的 webhook 更新
  ├── 解析並路由訊息
  ├── 轉發到 n8n 進行智能路由
  └── 接收回覆並發送回 Telegram

n8n Workflows
  ├── message-router: 分析訊息並決定路由
  ├── andrea-handler: 處理 Andrea 相關訊息
  └── umio-handler: 處理 Umio 相關訊息
```

**實施步驟：**
1. 擴展 Webhook Bridge 添加 `/webhook/andrea` 和 `/webhook/umio` 端點
2. 為 Andrea 和 Umio bots 設定 webhook
3. 修改 Zeabur agents 移除 getUpdates 邏輯
4. 測試完整流程

**預估工時：** 4-6 小時

---

### 方案 B：統一使用 getUpdates 模式

**概述：**
移除所有 webhook 設定，所有 bots 都使用 getUpdates（輪詢）模式。

**優點：**
- ✅ 實施簡單（移除 webhook 即可）
- ✅ 不需要公開的 webhook URL
- ✅ 適合開發和測試環境

**缺點：**
- ❌ 需要持續輪詢（消耗資源）
- ❌ 延遲較高（輪詢間隔通常 1-3 秒）
- ❌ 不適合高流量場景
- ❌ 不符合生產環境最佳實踐
- ❌ 失去 Webhook Bridge 的優勢

**技術架構：**
```
Telegram API
  ├── OpenClaw Bot ← getUpdates 輪詢
  ├── Andrea Bot ← getUpdates 輪詢
  └── Umio Bot ← getUpdates 輪詢

Zeabur Services
  ├── OpenClaw Agent (輪詢 + 處理)
  ├── Andrea Agent (輪詢 + 處理)
  └── Umio Agent (輪詢 + 處理)
```

**實施步驟：**
1. 刪除所有 bots 的 webhook 設定
2. 停用 Webhook Bridge 服務
3. 確保所有 agents 使用 getUpdates 邏輯
4. 測試完整流程

**預估工時：** 2-3 小時

---

### 方案 C：混合模式（不推薦）

**概述：**
使用不同的 bot tokens 分別處理不同的功能。

**架構：**
- OpenClaw Bot（webhook）- 接收用戶訊息
- Andrea Bot（getUpdates）- AI 回覆
- Umio Bot（getUpdates）- AI 回覆

**優點：**
- ✅ 技術上可行

**缺點：**
- ❌ 需要管理多個 bot tokens
- ❌ 用戶體驗差（看到多個不同的 bots）
- ❌ 架構複雜且難以維護
- ❌ 訊息流程混亂
- ❌ 不符合單一 bot 的設計理念

**結論：** 不推薦此方案

---

## 推薦方案

### ⚠️ 更新：用戶選擇方案 B

**決策日期：** 2026-03-15  
**理由：** 成功率最高，實施風險最低

詳細實施指南請參考：`GETUPDATES_IMPLEMENTATION_GUIDE.md`

---

### 🎯 原推薦方案 A：統一使用 Webhook 模式

**理由：**

1. **性能最佳** - 即時接收訊息，無輪詢延遲
2. **資源效率** - 不需要持續輪詢，節省伺服器資源
3. **架構優勢** - 已有 Webhook Bridge 基礎設施
4. **可擴展性** - 易於添加新的 bots 或功能
5. **生產就緒** - 符合企業級應用最佳實踐

**關鍵成功因素：**
- ✅ Webhook Bridge 已部署並運行正常
- ✅ 已有 n8n 工作流程基礎
- ✅ 域名和 SSL 證書已配置
- ✅ 團隊熟悉 webhook 架構

---

## 詳細實施計劃

### 階段 1：擴展 Webhook Bridge（2 小時）

**任務 1.1：添加多 bot 端點**

修改 `webhook-bridge/src/index.ts`：

```typescript
// Andrea Bot webhook endpoint
app.post('/webhook/andrea', async (req, res) => {
    try {
        const update = req.body;
        const message = update.message;
        
        if (!message) {
            return res.sendStatus(200);
        }
        
        console.log('[Andrea] Received:', {
            chat_id: message.chat.id,
            text: message.text,
            from: message.from.username
        });
        
        // 轉發到 n8n 進行處理
        const n8nResponse = await axios.post(
            process.env.N8N_WEBHOOK_URL + '/andrea',
            {
                bot: 'andrea',
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: message.text,
                from: message.from
            }
        );
        
        res.sendStatus(200);
    } catch (error) {
        console.error('[Andrea] Error:', error);
        res.sendStatus(500);
    }
});

// Umio Bot webhook endpoint
app.post('/webhook/umio', async (req, res) => {
    // 類似的實作
});
```

**任務 1.2：更新環境變數**

添加到 `webhook-bridge/.env`：
```
TELEGRAM_ANDREA_BOT_TOKEN=your_andrea_token
TELEGRAM_UMIO_BOT_TOKEN=your_umio_token
```

**任務 1.3：部署更新**
```bash
cd webhook-bridge
npm run build
git add .
git commit -m "Add Andrea and Umio webhook endpoints"
git push
```

### 階段 2：設定 Webhooks（30 分鐘）

**任務 2.1：設定 Andrea Bot webhook**

```powershell
$andreaToken = $env:TELEGRAM_ANDREA_BOT_TOKEN
Invoke-RestMethod -Uri "https://api.telegram.org/bot$andreaToken/setWebhook" `
    -Method Post `
    -Body (@{
        url = "https://webhook-bridge.neovega.cc/webhook/andrea"
        max_connections = 40
        allowed_updates = @("message", "edited_message")
    } | ConvertTo-Json) `
    -ContentType "application/json"
```

**任務 2.2：設定 Umio Bot webhook**

```powershell
$umioToken = $env:TELEGRAM_UMIO_BOT_TOKEN
Invoke-RestMethod -Uri "https://api.telegram.org/bot$umioToken/setWebhook" `
    -Method Post `
    -Body (@{
        url = "https://webhook-bridge.neovega.cc/webhook/umio"
        max_connections = 40
        allowed_updates = @("message", "edited_message")
    } | ConvertTo-Json) `
    -ContentType "application/json"
```

**任務 2.3：驗證 webhook 設定**

```powershell
# 檢查 Andrea
Invoke-RestMethod -Uri "https://api.telegram.org/bot$andreaToken/getWebhookInfo"

# 檢查 Umio
Invoke-RestMethod -Uri "https://api.telegram.org/bot$umioToken/getWebhookInfo"
```

### 階段 3：修改 Zeabur Agents（1.5 小時）

**任務 3.1：停用 getUpdates 邏輯**

在 Andrea 和 Umio 的 Zeabur 服務中：
- 移除或註解掉 `bot.startPolling()` 或類似的輪詢代碼
- 保留訊息處理邏輯
- 改為被動等待 n8n 的調用

**任務 3.2：確認 n8n 工作流程**

確保 n8n 中有對應的工作流程：
- `andrea-handler` - 接收並處理 Andrea 訊息
- `umio-handler` - 接收並處理 Umio 訊息

### 階段 4：測試與驗證（1 小時）

**任務 4.1：單元測試**

```powershell
# 測試 Andrea webhook
$body = @{
    message = @{
        chat = @{ id = 123456789 }
        text = "測試 Andrea"
        from = @{ username = "testuser" }
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://webhook-bridge.neovega.cc/webhook/andrea" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**任務 4.2：端到端測試**

1. 在 Telegram 向 Andrea bot 發送訊息
2. 檢查 Webhook Bridge 日誌
3. 檢查 n8n 執行記錄
4. 確認收到回覆

**任務 4.3：壓力測試**

發送多條訊息，確認系統穩定性。

---

## 風險評估與緩解

### 風險 1：Webhook 遺失訊息

**風險等級：** 中  
**影響：** 用戶訊息可能遺失  
**緩解措施：**
- 實作重試機制
- 添加訊息佇列（如 Redis）
- 監控 webhook 失敗率

### 風險 2：Zeabur Agents 修改失敗

**風險等級：** 低  
**影響：** 需要回滾到方案 B  
**緩解措施：**
- 保留原始代碼備份
- 分階段修改和測試
- 準備快速回滾方案

### 風險 3：n8n 工作流程配置錯誤

**風險等級：** 中  
**影響：** 訊息路由失敗  
**緩解措施：**
- 詳細測試每個工作流程
- 添加錯誤處理和日誌
- 準備備用路由邏輯

---

## 成功標準

✅ **技術標準：**
1. 所有 bots 的 webhook 設定成功
2. Webhook Bridge 正常接收所有 bots 的訊息
3. n8n 工作流程正確路由訊息
4. 端到端測試 100% 通過
5. 無訊息遺失或延遲

✅ **業務標準：**
1. 用戶可以正常與所有 bots 互動
2. 回覆時間 < 2 秒
3. 系統穩定運行 24 小時無故障

---

## 時程規劃

| 階段 | 任務 | 預估時間 | 負責人 |
|------|------|----------|--------|
| 1 | 擴展 Webhook Bridge | 2 小時 | 開發團隊 |
| 2 | 設定 Webhooks | 30 分鐘 | 開發團隊 |
| 3 | 修改 Zeabur Agents | 1.5 小時 | 開發團隊 |
| 4 | 測試與驗證 | 1 小時 | QA 團隊 |
| **總計** | | **5 小時** | |

**建議實施時間：** 非高峰時段（例如：週末或深夜）

---

## 總結

本計畫解決了 Telegram Bot 互動問題的根本原因（Webhook/getUpdates 衝突），並提供了三種解決方案的詳細評估。

**推薦採用方案 A（統一 Webhook 模式）**，因為：
- 性能和資源效率最佳
- 架構統一且易於維護
- 已有基礎設施支援
- 符合生產環境最佳實踐

預估總工時 5 小時，風險可控，建議盡快實施。

---

**文件版本：** 1.0  
**最後更新：** 2026-03-15  
**狀態：** 待審核


