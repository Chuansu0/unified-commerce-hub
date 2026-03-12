# All-in-One Integration Plan: OpenClaw + n8n + OpenViking

**日期**: 2026-03-12  
**版本**: 1.2 (已整合用戶回饋)  
**專案**: unified-commerce-hub (Zeabur)  
**域名**: www.neovega.cc

---

## 決策紀錄

| 項目 | 決策 |
|------|------|
| OpenViking 部署 | 使用官方 Docker image `ghcr.io/volcengine/openviking:main`，如需自訂則 fork Dockerfile |
| n8n API Key | 用戶將在 n8n Settings → API 中建立並提供 |
| 遷移策略 | **漸進遷移** — 保留 telegram-webhook，逐步將邏輯遷至 n8n |
| VLM 模型 | `opencode-go/kimi-k2.5` (Primary)，`opencode-go/glm-5` (Linus)，`opencode-go/minimax-m2.5` |
| Embedding 模型 | `gemini-embedding-2-preview` (Google Gemini, 多模態, dim=3072) |
| Agent 配置 | main (kimi-k2.5), linus (glm-5), andrea (kimi-k2.5), umio (kimi-k2.5) |

---

## 一、現有架構概覽

```mermaid
graph LR
    subgraph Zeabur ["Zeabur 專案 (現有)"]
        NGINX["Nginx + Vite-React"]
        PB["PocketBase"]
        TW["telegram-webhook"]
        OC["OpenClaw (andrea/linus/umio)"]
        N8N["N8N v2.3.6"]
        PG["PostgreSQL 17"]
        RD["Redis 7"]
    end
    
    USER["Web Chat 訪客"] --> NGINX
    NGINX -->|/pb/| PB
    NGINX -->|/api/send-to-openclaw| TW
    TW -->|轉發| TG["Telegram 群組"]
    TG --> OC
    OC -->|回覆| TG
    TG -->|webhook| TW
    TW -->|存入| PB
```

### 現有服務 (project.yaml)

| 服務 | 端口 | 狀態 |
|-----|------|------|
| Nginx (前端 SPA) | 8080 | ✅ 運作中 |
| PocketBase | 8090 | ✅ 運作中 |
| telegram-webhook | 8080 | ✅ 運作中 |
| OpenClaw | 18789 | ✅ 運作中 |
| N8N | 5678 | ✅ 已部署但**未整合** |
| PostgreSQL | 5432 | ✅ 運作中 (N8N DB) |
| Redis | 6379 | ✅ 運作中 (N8N Queue) |
| Runners | 5679 | ✅ 運作中 |

---

## 二、目標架構

```mermaid
graph TB
    subgraph Zeabur ["Zeabur 統一專案"]
        NGINX["Nginx + Vite-React"]
        N8N["N8N (工作流引擎)"]
        TW["telegram-webhook (保留)"]
        OC["OpenClaw"]
        OV["OpenViking (Context DB)"]
        PB["PocketBase"]
    end
    
    USER["Web Chat"] -->|POST /api/webhook/chat| NGINX
    NGINX -->|proxy| N8N
    N8N -->|存入 PB| PB
    N8N -->|轉發 TG| TG["Telegram 群組"]
    TG -->|webhook| TW
    TW -->|forward to n8n| N8N
    N8N -->|存回 PB| PB
    OC <-->|context| OV
    OC <-->|Telegram| TG
    PB -->|Realtime| USER
```

---

## 三、四大模塊

### 模塊 A：Web Chat → n8n Webhook (漸進遷移)

> [!NOTE]
> 保留 `/api/send-to-openclaw` 相容路由，新增 `/api/webhook/chat` 走 n8n。前端可切換。

#### A1. n8n 新增 Workflow:「Web Chat Inbound」

```
Webhook Node (POST /webhook/chat-inbound)
  → Set Node (格式化: sessionId, message, timestamp)
  → HTTP Request → PocketBase (存入 messages)
  → HTTP Request → Telegram Bot API (sendMessage 到群組)
  → HTTP Request → Telegram Bot API (@neovegaandrea_bot 觸發)
  → Respond to Webhook (回傳 success + messageId)
```

#### A2. nginx.conf 新增路由

```nginx
# n8n Webhook 代理
location /api/webhook/ {
    set $n8n n8n.zeabur.internal:5678;
    proxy_pass http://$n8n/webhook/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### A3. 前端修改

**檔案**: `src/services/telegram.ts` (或新建 `src/services/n8nChat.ts`)

```diff
- const response = await fetch('/api/send-to-openclaw', { ... });
+ const response = await fetch('/api/webhook/chat', { ... });
```

保留原有 endpoint 不刪除，讓 feature flag 可切換。

---

### 模塊 B：OpenClaw Agents 管理 n8n Workflow

#### B1. OpenClaw 環境變數新增

| 變數 | 值 |
|------|-----|
| `N8N_API_URL` | `http://n8n.zeabur.internal:5678` |
| `N8N_API_KEY` | *(用戶提供)* |

#### B2. 新建 OpenClaw Skill: `n8n-workflow-manager`

```
~/.openclaw/skills/n8n-workflow-manager/
├── SKILL.md
└── scripts/
    ├── create_workflow.mjs
    ├── test_workflow.mjs
    ├── list_workflows.mjs
    └── activate_workflow.mjs
```

核心功能：create / test / activate / list — 透過 n8n REST API v1。

#### B3. 群組協作流程

1. andrea 收到 webchat → 分析需求
2. andrea 可指揮 agent 用 skill 建立 n8n workflow
3. 群組中討論並 `test` workflow
4. 測試通過後 `activate` 上線

---

### 模塊 C：Telegram ↔ Web Chat 回覆閉環

#### C1. telegram-webhook 新增 n8n 轉發

在 `telegram-webhook/src/index.ts` 的 `handleOpenClawReply()` 中：

```typescript
// 偵測到 agent 回覆後，同時轉發到 n8n 做記錄
await fetch('http://n8n.zeabur.internal:5678/webhook/telegram-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, replyText, agentName, timestamp })
});
```

#### C2. n8n 新增 Workflow:「Telegram Reply Handler」

```
Webhook Node (POST /webhook/telegram-reply)
  → IF Node (是 webchat 回覆?)
  → HTTP Request → PocketBase (存 assistant message)
  → (PocketBase Realtime 自動推送前端)
```

---

### 模塊 D：OpenViking 部署

#### D1. Zeabur 服務 (project.yaml 新增)

```yaml
- name: OpenViking
  template: PREBUILT_V2
  spec:
    source:
      image: ghcr.io/volcengine/openviking:main
    ports:
      - id: web
        port: 1933
        type: HTTP
    volumes:
      - id: data
        dir: /app/data
    configs:
      - path: /app/ov.conf
        template: |
          {
            "storage": { "workspace": "/app/data" },
            "log": { "level": "INFO", "output": "stdout" },
            "embedding": {
              "dense": {
                "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
                "api_key": "${GEMINI_API_KEY}",
                "provider": "openai",
                "dimension": 3072,
                "model": "gemini-embedding-2-preview"
              },
              "max_concurrent": 10
            },
            "vlm": {
              "api_base": "https://opencode.ai/zen/go/v1",
              "api_key": "${OPENCODE_GO_API_KEY}",
              "provider": "litellm",
              "model": "kimi-k2.5",
              "max_concurrent": 50
            }
          }
    env:
      OPENCODE_GO_API_KEY:
        default: "${ANTHROPIC_API_KEY}"
        expose: false
      GEMINI_API_KEY:
        default: "AIzaSyDkQ3L1tQ3AUhRjRpk8noNDovChFT_lAoM"
        expose: false
```

> [!IMPORTANT]
> OpenViking 官方 Docker image 已存在 (`ghcr.io/volcengine/openviking:main`)，無需自建 Dockerfile。如日後需要自訂（如加入 OpenClaw memory plugin 打包），可 fork 官方 Dockerfile。

#### D2. OpenClaw ↔ OpenViking 整合

在 OpenClaw config 中啟用 OpenViking memory plugin（需確認 OpenClaw 版本 2026.3.2 的 plugin 支援方式）。

#### D3. Context 結構

```
viking://
├── resources/neovega/         # 商品、FAQ、政策
├── resources/n8n-workflows/   # workflow 文件
├── user/memories/             # 用戶偏好
└── agent/
    ├── skills/                # n8n-workflow-manager 等
    └── memories/              # 任務記憶
```

#### D4. 預期效益

| 指標 | 改善 |
|------|------|
| 記憶準確率 | +43~49% |
| Input Token 消耗 | 降至 4~17% |
| 上下文管理 | 自動 L0/L1/L2 分層 |
| 記憶迭代 | 自動 Session 壓縮 |

---

## 四、實施階段

### Phase 1：n8n Webhook 整合 (1-2 天)
- [ ] n8n 建立 Web Chat Inbound workflow
- [ ] nginx.conf 新增 `/api/webhook/*` 代理
- [ ] 前端新增 n8n 發送路徑（保留舊路徑）
- [ ] 測試 WebChat → n8n → PB → Telegram

### Phase 2：回覆閉環 (1-2 天)
- [ ] n8n 建立 Telegram Reply Handler workflow
- [ ] telegram-webhook 增加 n8n 轉發
- [ ] 測試 Agent 回覆 → n8n → PB → WebChat 即時顯示

### Phase 3：OpenClaw n8n Skill (2-3 天)
- [ ] 建立 `n8n-workflow-manager` skill
- [ ] 設定 n8n API key
- [ ] 群組測試 workflow CRUD + pre-production 驗證

### Phase 4：OpenViking 部署 (2-3 天)
- [ ] 部署 OpenViking 到 Zeabur
- [ ] 設定 OpenClaw Memory Plugin
- [ ] 匯入初始 context
- [ ] 驗證記憶改善效果

---

## 五、環境變數匯總

| 服務 | 變數 | 值 |
|------|------|-----|
| OpenClaw | `N8N_API_URL` | `http://n8n.zeabur.internal:5678` |
| OpenClaw | `N8N_API_KEY` | *(用戶提供)* |
| OpenClaw | `OPENVIKING_URL` | `http://openviking.zeabur.internal:1933` |
| telegram-webhook | `N8N_WEBHOOK_URL` | `http://n8n.zeabur.internal:5678/webhook` |
| OpenViking | `OPENCODE_GO_API_KEY` | *(與 OpenClaw opencode-go provider 共用)* |
| OpenViking | `GEMINI_API_KEY` | `AIzaSyDkQ3L1tQ3AUhRjRpk8noNDovChFT_lAoM` |

---

## 六、Nginx 最終路由表

| 路徑 | 目標 | 用途 |
|------|------|------|
| `/` | 靜態檔案 | Vite-React SPA |
| `/pb/*` | pocketbase-convo:8090 | PocketBase API |
| `/api/webhook/*` | n8n:5678/webhook/* | **新增** n8n Webhook |
| `/api/send-to-openclaw` | telegram-webhook:8080 | **保留** 漸進遷移 |
| `/webhook/telegram` | telegram-webhook:8080 | Telegram Bot Webhook |
| `/api/openclaw/*` | OpenClaw:18789 | OpenClaw API |

---

## 七、驗證計畫

### Phase 1 驗證 (n8n Webhook)

```bash
# 健康檢查
curl https://www.neovega.cc/pb/api/health

# n8n Webhook 測試
curl -X POST https://www.neovega.cc/api/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"n8n測試","platform":"webchat"}'
```

手動驗證：在 www.neovega.cc/shop 開 WebChat 發訊息 → 確認 Telegram 群組收到

### Phase 2 驗證 (回覆閉環)

手動驗證：在 Telegram 群組 reply webchat 訊息 → 確認 WebChat UI 顯示回覆

### Phase 3 驗證 (n8n Skill)

在 OpenClaw Telegram 中 `@andrea list n8n workflows` → 確認能列出 workflows

### Phase 4 驗證 (OpenViking)

```bash
# OpenViking 健康檢查
curl http://openviking.zeabur.internal:1933/health
```

在 OpenClaw 對話中測試上下文記憶 → 確認 token 消耗降低

---

## 八、風險與注意事項

> [!WARNING]
> **漸進遷移**：Phase 1-2 完成後評估穩定性再決定是否廢棄 telegram-webhook。

> [!CAUTION]
> **n8n API 安全**：n8n API 僅在 Zeabur 內部網路可存取，不對外公開。

1. **服務啟動順序**：PostgreSQL → Redis → N8N → OpenViking → OpenClaw → Nginx
2. **Gemini Embedding API**：使用 `gemini-embedding-2-preview`，支援多模態 (文字/圖片/影片/音訊/PDF)，維度 3072，輸入限制 8192 tokens
3. **OpenClaw Memory Plugin 相容性**：需確認 OpenClaw 2026.3.2 是否已內建 OpenViking 支援
4. **Gemini Embedding API Key**：獨立的 Google API Key (`AIzaSy...`), 使用 OpenAI 相容 endpoint (`/v1beta/openai/embeddings`)

---

**最後更新**: 2026-03-12 16:36 (UTC+8)
