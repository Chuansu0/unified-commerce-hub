# Telegram Bot-to-Bot 互動解決方案評估計畫

**文件編號**: openclaw-bot-reply-bot-20260315-1  
**建立日期**: 2026-03-18  
**狀態**: 評估階段

## 1. 問題描述

### 1.1 核心問題
Telegram 平台有一個已知的限制：**Bot 無法讀取其他 Bot 發送的訊息**。這是 Telegram 的設計決策，目的是防止 bot 之間的無限循環和濫用。

### 1.2 當前架構影響
在我們的 unified-commerce-hub 系統中，這個限制導致：
- Andrea Bot 無法看到 Umio Bot 的回覆
- Linus Bot 無法看到 Andrea Bot 的回覆
- 無法實現多 bot 協作的工作流程
- 客戶服務場景中的 bot 接力無法實現

### 1.3 業務需求
我們需要實現以下場景：
1. **客服接力**: Umio Bot 初步回應 → Andrea Bot 深度分析 → Linus Bot 技術支援
2. **專業分工**: 不同 bot 處理不同類型的查詢
3. **品質控制**: 一個 bot 審核另一個 bot 的回覆
4. **協作回應**: 多個 bot 共同完成複雜任務

## 2. 解決方案評估

### 方案 A: User Bot 架構（使用真實用戶帳號）

#### 2.1 技術原理
使用 Telegram User Bot（基於 MTProto API）而不是 Bot API。User Bot 使用真實用戶帳號，可以看到所有訊息。

#### 2.2 優點
- ✅ 可以讀取所有訊息，包括其他 bot 的訊息
- ✅ 功能完整，與真實用戶相同
- ✅ 可以加入群組、頻道
- ✅ 支援所有 Telegram 功能

#### 2.3 缺點
- ❌ **違反 Telegram 服務條款**（User Bot 用於自動化可能被封禁）
- ❌ 需要真實手機號碼
- ❌ 安全風險高（需要用戶的 session）
- ❌ 不穩定（Telegram 可能隨時封禁）
- ❌ 法律風險（可能違反用戶協議）

#### 2.4 實作複雜度
- 技術複雜度: ⭐⭐⭐⭐
- 維護成本: ⭐⭐⭐⭐⭐
- 風險等級: 🔴 極高

#### 2.5 建議
**不推薦**。雖然技術上可行，但違反服務條款且風險極高。

---

### 方案 B: 中間層協調架構（推薦）

#### 2.1 技術原理
使用 PocketBase 作為中間層，所有 bot 的訊息都儲存在資料庫中。Bot 之間不直接通訊，而是透過資料庫協調。

#### 2.2 架構設計

```
┌─────────────┐
│  Telegram   │
│   Group     │
└──────┬──────┘
       │
       ├──────────┐
       │          │
   ┌───▼───┐  ┌──▼────┐
   │ Umio  │  │Andrea │
   │  Bot  │  │  Bot  │
   └───┬───┘  └──┬────┘
       │         │
       └────┬────┘
            │
     ┌──────▼──────┐
     │ PocketBase  │
     │  Database   │
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │   n8n       │
     │ Workflow    │
     │ Orchestrator│
     └─────────────┘
```

#### 2.3 工作流程

**階段 1: 訊息接收**
1. 用戶在 Telegram 發送訊息
2. Umio Bot 接收訊息
3. Umio Bot 將訊息儲存到 PocketBase `messages` collection
4. Umio Bot 回覆用戶

**階段 2: 訊息路由**
5. n8n workflow 監聽 PocketBase 新訊息
6. 根據 `intent` 欄位決定需要哪些 bot 處理
7. 建立 `agent_workflows` 記錄，定義執行順序

**階段 3: Bot 協作**
8. n8n 觸發 Andrea Bot（透過 OpenClaw API）
9. Andrea Bot 從 PocketBase 讀取訊息歷史
10. Andrea Bot 生成回覆並儲存到 PocketBase
11. n8n 將 Andrea 的回覆發送到 Telegram

**階段 4: 後續處理**
12. 如果需要，n8n 觸發 Linus Bot
13. Linus Bot 讀取完整對話歷史（包括 Andrea 的回覆）
14. Linus Bot 生成最終回覆
15. n8n 發送到 Telegram

#### 2.4 優點
- ✅ 完全合法，符合 Telegram 服務條款
- ✅ 可擴展，易於添加新 bot
- ✅ 完整的訊息歷史記錄
- ✅ 靈活的工作流程編排
- ✅ 易於除錯和監控
- ✅ 支援複雜的業務邏輯

#### 2.5 缺點
- ⚠️ 需要額外的基礎設施（PocketBase + n8n）
- ⚠️ 回應延遲較高（多個步驟）
- ⚠️ 實作複雜度中等

#### 2.6 實作複雜度
- 技術複雜度: ⭐⭐⭐
- 維護成本: ⭐⭐
- 風險等級: 🟢 低

#### 2.7 建議
**強烈推薦**。這是最穩定、最合法、最可維護的方案。

---

### 方案 C: Webhook 橋接架構

#### 2.1 技術原理
建立一個 Webhook Bridge 服務，接收所有 bot 的訊息，然後轉發給需要的 bot。

#### 2.2 架構設計

```
┌─────────────┐
│  Telegram   │
└──────┬──────┘
       │
   ┌───▼────────┐
   │  Webhook   │
   │   Bridge   │
   └───┬────────┘
       │
       ├──────────┬──────────┐
       │          │          │
   ┌───▼───┐  ┌──▼────┐  ┌──▼────┐
   │ Umio  │  │Andrea │  │ Linus │
   │  Bot  │  │  Bot  │  │  Bot  │
   └───────┘  └───────┘  └───────┘
```

#### 2.3 優點
- ✅ 實時性好
- ✅ 架構簡單
- ✅ 易於理解

#### 2.4 缺點
- ❌ 仍然無法解決 bot 看不到其他 bot 訊息的問題
- ❌ 需要額外的服務
- ❌ 單點故障風險

#### 2.5 實作複雜度
- 技術複雜度: ⭐⭐
- 維護成本: ⭐⭐⭐
- 風險等級: 🟡 中

#### 2.6 建議
**不推薦作為主要方案**。可以作為方案 B 的補充。

---

### 方案 D: Inline Bot 架構

#### 2.1 技術原理
使用 Telegram 的 Inline Bot 功能，讓用戶主動觸發不同的 bot。

#### 2.2 優點
- ✅ 符合 Telegram 設計理念
- ✅ 用戶體驗清晰

#### 2.3 缺點
- ❌ 需要用戶手動選擇 bot
- ❌ 無法自動化工作流程
- ❌ 不適合複雜場景

#### 2.4 建議
**不推薦**。不符合我們的自動化需求。

---

## 3. 推薦方案：方案 B（中間層協調架構）

### 3.1 選擇理由
1. **合法性**: 完全符合 Telegram 服務條款
2. **穩定性**: 不依賴任何 hack 或非官方 API
3. **可擴展性**: 易於添加新 bot 和新工作流程
4. **可維護性**: 清晰的架構，易於除錯
5. **已有基礎**: 我們已經有 PocketBase 和 n8n

### 3.2 實作階段

#### 階段 1: Schema 準備（已完成 ✅）
- [x] 在 `messages` collection 添加 `sent_to_telegram` 欄位
- [x] 在 `messages` collection 添加 `sent_at` 欄位
- [x] 驗證欄位已正確添加
- [x] 建立 `agent_workflows` collection（2026-03-19）

#### 階段 2: n8n Workflow 建立（進行中）
- [x] 建立 Message Router workflow（n8n/bot-collaboration-router.json）
- [x] 建立 Agent Orchestrator workflow（n8n/bot-collaboration-orchestrator.json）
- [x] 建立 Telegram Sender workflow（n8n/bot-collaboration-sender.json）
- [x] n8n 已有 Webchat Batch Notification (Simple) workflow
- [ ] 測試單一 bot 流程（需在 n8n UI 手動導入 workflow）
- [ ] 測試多 bot 協作流程

#### 階段 3: Bot 整合
- [x] Umio Bot 已儲存訊息到 PocketBase（15 條訊息已確認）
- [ ] 更新 Andrea Bot 以讀取 PocketBase 訊息
- [ ] 更新 Linus Bot 以讀取 PocketBase 訊息
- [ ] 實作錯誤處理機制

#### 階段 4: 測試與優化
- [x] PocketBase API 端到端測試通過（2026-03-19）
- [x] agent_workflows CRUD 測試通過
- [x] messages sent_to_telegram 標記測試通過
- [ ] Telegram 發送測試（需由 n8n 伺服器端執行）
- [ ] 效能優化
- [ ] 文件撰寫

### 3.3 技術細節

#### 3.3.1 PocketBase Schema

**messages collection**:
```javascript
{
  id: string,
  conversation: relation(conversations),
  sender: select("user", "assistant", "system", "agent"),
  channel: select("web", "telegram"),
  content: text,
  intent: text,
  metadata: json,
  sent_to_telegram: bool,  // 新增
  sent_at: date,           // 新增
  created: datetime,
  updated: datetime
}
```

**agent_workflows collection**:
```javascript
{
  id: string,
  conversation: relation(conversations),
  message: relation(messages),
  agents: json,  // ["umio", "andrea", "linus"]
  current_agent: text,
  status: select("pending", "processing", "completed", "failed"),
  results: json,
  created: datetime,
  updated: datetime
}
```

#### 3.3.2 n8n Workflow 邏輯

**Message Router**:
1. 監聽 PocketBase `messages` collection 的新記錄
2. 分析 `intent` 欄位
3. 決定需要哪些 agent
4. 建立 `agent_workflows` 記錄

**Agent Orchestrator**:
1. 監聽 `agent_workflows` collection
2. 按順序執行 agents
3. 將每個 agent 的回覆儲存到 `messages`
4. 更新 workflow 狀態

**Telegram Sender**:
1. 監聽 `messages` collection 中 `sent_to_telegram = false` 的記錄
2. 透過 Telegram Bot API 發送訊息
3. 更新 `sent_to_telegram = true` 和 `sent_at`

### 3.4 預期效果

#### 3.4.1 功能實現
- ✅ Bot 可以「看到」其他 bot 的回覆（透過 PocketBase）
- ✅ 支援順序執行（Umio → Andrea → Linus）
- ✅ 支援並行執行（多個 bot 同時處理）
- ✅ 支援條件執行（根據 intent 決定）

#### 3.4.2 效能指標
- 單一 bot 回應時間: < 3 秒
- 多 bot 協作回應時間: < 10 秒
- 訊息處理成功率: > 99%

#### 3.4.3 可靠性
- 完整的錯誤處理
- 訊息重試機制
- 完整的審計日誌

## 4. 替代方案考量

### 4.1 混合方案
結合方案 B 和方案 C：
- 使用 PocketBase 作為主要協調層
- 使用 Webhook Bridge 提升實時性
- 在 Webhook Bridge 失敗時降級到輪詢模式

### 4.2 未來擴展
- 支援更多 bot
- 支援更複雜的工作流程
- 支援 A/B 測試
- 支援機器學習模型選擇

## 5. 風險評估

### 5.1 技術風險
- **低**: 使用成熟的技術棧
- **緩解**: 完整的測試和監控

### 5.2 效能風險
- **中**: 多層架構可能導致延遲
- **緩解**: 優化資料庫查詢，使用快取

### 5.3 維護風險
- **低**: 清晰的架構，易於維護
- **緩解**: 完整的文件和監控

## 6. 結論

**推薦採用方案 B（中間層協調架構）**，理由如下：

1. ✅ **合法性**: 完全符合 Telegram 服務條款
2. ✅ **穩定性**: 不依賴任何非官方 API
3. ✅ **可擴展性**: 易於添加新功能
4. ✅ **已有基礎**: 可以利用現有的 PocketBase 和 n8n
5. ✅ **風險低**: 技術成熟，風險可控

## 7. 下一步行動

### 7.1 立即行動
1. ✅ 完成 PocketBase schema 更新（已完成）
2. 建立 n8n Message Router workflow
3. 測試單一 bot 流程

### 7.2 短期目標（1-2 週）
1. 完成所有 n8n workflows
2. 整合所有 bots
3. 端到端測試

### 7.3 長期目標（1-3 個月）
1. 效能優化
2. 添加更多 bots
3. 實作進階功能（A/B 測試、機器學習）

---

**文件版本**: 1.0  
**最後更新**: 2026-03-18  
**審核狀態**: 待審核
