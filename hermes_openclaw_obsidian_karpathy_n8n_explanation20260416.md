# Hermes + OpenClaw + Obsidian Multi-Vault + Karpathy LLM Wiki + n8n + Telegram 整合架構說明

> 文件日期：2026-04-16（更新自 2026-04-12 版）
>
> 本文整合 Hermes Agent 指揮架構、OpenClaw 雲地協作、Karpathy LLM Wiki 知識管理、
> Obsidian 七域 Multi-Vault 系統、n8n 訊息路由、Webhook 二段式 dispatch、
> 離線佇列容錯、以及 Telegram Bot 雙向通訊的完整系統說明。

---

## 目錄

1. [系統架構總覽](#一系統架構總覽)
2. [核心理論：Karpathy LLM Wiki](#二核心理論karpathy-llm-wiki)
3. [Obsidian 七域 Multi-Vault 系統（4/13 新增）](#三obsidian-七域-multi-vault-系統)
4. [Hermes Agent 三角色系統](#四hermes-agent-三角色系統)
5. [Webhook 二段式 Dispatch 架構（4/14 重構）](#五webhook-二段式-dispatch-架構)
6. [離線佇列與容錯機制（4/15 新增）](#六離線佇列與容錯機制)
7. [OpenClaw 雲地協作架構](#七openclaw-雲地協作架構)
8. [n8n 訊息路由機制](#八n8n-訊息路由機制)
9. [完整資料流程](#九完整資料流程)
10. [部署與啟動](#十部署與啟動)
11. [WSL/Windows 路徑轉換](#十一wslwindows-路徑轉換)
12. [操作手冊](#十二操作手冊)
13. [文件歷史](#文件歷史)

---

## 一、系統架構總覽

### 1.1 雙層控制架構（4/16 更新版）

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      雲端控制層 (Zeabur VPS)                              │
│                                                                          │
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐   │
│  │ neovegasherlock_bot │     │ Zeabur n8n (neovegan8n.zeabur.app) │   │
│  │ (Hermes Agent)      │     │ • sherlock-dispatcher (已停用)      │   │
│  │ • kimi-k2.5 分析    │     │ • 備用路由                          │   │
│  │ • JSONL 產出        │     └─────────────────────────────────────┘   │
│  │ • Webhook dispatch  │                                                │
│  │ • 離線佇列 fallback │     GitHub: Chuansu0/hermes-agent             │
│  │ neovegahermes.       │     (commit 3362c3b)                          │
│  │   zeabur.app         │                                                │
│  └──────┬──────────────┘                                                │
│         │ HTTPS POST (JSONL + X-Webhook-Secret)                         │
└─────────┼────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    本地執行層 (Home Workstation WSL)                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Cloudflare Tunnel: home-n8n.neovega.cc → localhost:5678         │   │
│  └──────┬───────────────────────────────────────────────────────────┘   │
│         ▼                                                                │
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐   │
│  │ Home n8n (Docker)   │     │ neovegacarrie_bot (WSL Python)     │   │
│  │ Port 5678           │────▶│ Port 18800                          │   │
│  │ Carrie Dispatch     │     │ • Webhook /webhook/dispatch         │   │
│  │ Relay Workflow      │     │ • Telegram polling                  │   │
│  │ 172.18.0.1:18800    │     │ • trafilatura 下載                  │   │
│  └─────────────────────┘     │ • Ollama LLM 摘要                  │   │
│                               │ • FAISS embedding                  │   │
│                               │ • 啟動時 drain 離線佇列            │   │
│                               └──────┬────────────────────────────┘   │
│                                      ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ D:\vaults\ — Obsidian 七域 Multi-Vault                          │   │
│  │ ├─ life-vault/      🏠 生活                                     │   │
│  │ ├─ work-vault/      💼 工作                                     │   │
│  │ ├─ rnd-vault/       🔬 研發                                     │   │
│  │ ├─ humanities-vault/ 📚 人文                                    │   │
│  │ ├─ science-vault/   🔭 科學                                     │   │
│  │ ├─ medicine-vault/  🏥 醫學                                     │   │
│  │ ├─ wellbeing-vault/ 🧘 身心靈                                   │   │
│  │ └─ meta-vault/      🗂️ 統合索引 + cross-links                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐   │
│  │ OpenClaw WSL        │     │ Tailscale Funnel (port 8080)       │   │
│  │ • 本地 LLM 推理     │     │ Cloudflare Tunnel (port 5678)      │   │
│  │ • Graphify 知識圖譜 │     │ 統一由 ./openclaw 腳本啟動          │   │
│  └─────────────────────┘     └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 角色分工矩陣（更新版）

| 節點 | 主要角色 | 不建議承擔的角色 |
|------|---------|----------------|
| **Zeabur VPS** | Sherlock 指揮中心、離線佇列暫存、Web UI | 大規模 wiki 重寫、本地 LLM 推理 |
| **Home n8n (Docker)** | Webhook relay、Carrie dispatch 轉發 | 直接對外暴露 |
| **Home WSL (Carrie)** | 本地 ingest、embedding、vault 寫入 | 對外公開入口 |
| **D:\vaults** | Obsidian 七域知識庫、meta-vault 統合 | 雲端同步主庫 |

### 1.3 網路拓撲

| 來源 | 目標 | 協定 | 路徑 |
|------|------|------|------|
| Sherlock (Zeabur) | Home n8n | HTTPS | `neovegahermes.zeabur.app` → `home-n8n.neovega.cc/webhook/carrie-dispatch` |
| Home n8n (Docker) | Carrie (WSL) | HTTP | `172.18.0.1:18800/webhook/dispatch` |
| Carrie (WSL) | Ollama | HTTP | `127.0.0.1:11434` |
| Carrie (WSL) | Sherlock 佇列 | HTTPS | `neovegahermes.zeabur.app/api/queue/drain` |
| Carrie (WSL) | Telegram API | HTTPS | 通知使用者 ingest 結果 |

---

## 二、核心理論：Karpathy LLM Wiki

### 2.1 設計哲學

Andrej Karpathy 提出的 LLM Wiki 方法是一種讓 AI Agent 持續維護個人知識庫的創新架構：

```
新來源 → raw/inbox/ → LLM 讀取 → 產生摘要頁 → 更新索引 → 修改相關頁面 → 記錄到 log.md
```

### 2.2 單一 Vault 目錄結構（原始設計）

```
knowledge-vault/
├─ raw/                    ← 不可變的原始資料區
│  ├─ inbox/              ← 連結下載位置（trafilatura 擷取）
│  ├─ pdf/                ← PDF OCR 輸出
│  └─ web-clips/          ← 網頁截圖
├─ wiki/                   ← 由 LLM 持續維護的 Markdown 知識頁面
│  ├─ index.md            ← 知識索引（目錄）
│  ├─ log.md              ← 操作歷史與變更記錄
│  ├─ concepts/           ← 概念頁面（主題知識）
│  ├─ entities/           ← 實體頁面（人、組織、專案）
│  └─ sources/            ← 來源摘要頁（LLM 產生）
├─ embeddings/             ← FAISS 向量索引（4/14 新增）
│  ├─ index.faiss         ← 向量索引檔
│  └─ metadata.json       ← 向量對應的文件路徑
├─ schema/                 ← Agent 規範與規則
│  ├─ AGENTS.md
│  ├─ INGEST_RULES.md
│  ├─ LINKING_RULES.md
│  └─ TAXONOMY.md
└─ ops/                    ← 腳本與狀態
   ├─ scripts/
   └─ reports/
```

### 2.3 與傳統 RAG 的區別

| 傳統 RAG | Karpathy LLM Wiki |
|---------|-------------------|
| 向量資料庫 + 嵌入搜尋 | 結構化 Markdown + LLM 主動維護 |
| 靜態索引 | 持續演化的知識圖譜 |
| 片段檢索 | 完整頁面閱讀與理解 |
| 一次性處理 | 增量更新與交叉連結 |

### 2.4 本系統的 Ingest Pipeline（完整流程）

```
URL 輸入
  ↓
trafilatura.fetch_url() + extract()    ← 下載並清理 HTML
  ↓
SHA256 去重（前 12 碼）                 ← 避免重複入庫
  ↓
raw/inbox/{sha}.md                      ← 儲存原始內容 + YAML frontmatter
  ↓
Ollama (gemma:2b) 產生摘要              ← 300-500 字結構化摘要
  ↓
wiki/sources/{timestamp}_{sha}.md       ← 摘要頁 + Obsidian [[連結]]
  ↓
nomic-embed-text → FAISS index          ← 向量 embedding
  ↓
wiki/log.md 追加記錄                    ← 操作歷史
```

---

## 三、Obsidian 七域 Multi-Vault 系統

> 4/13 新增：從單一 `knowledge-vault` 擴展為七域分類 + meta-vault 統合架構

### 3.1 設計理念

原始 Karpathy LLM Wiki 使用單一 vault，隨著知識量增長會產生分類混亂。
本系統將知識分為七個領域 vault，各自獨立運作，再由 meta-vault 統合索引與交叉連結。

### 3.2 七域 Vault 定義

| Vault ID | 名稱 | Emoji | 說明 | 路徑 |
|----------|------|-------|------|------|
| `life` | 生活 | 🏠 | 日常生活、家庭、旅遊、飲食、興趣 | `D:/vaults/life-vault` |
| `work` | 工作 | 💼 | 職場、專案管理、商業策略、客戶關係 | `D:/vaults/work-vault` |
| `rnd` | 研發 | 🔬 | 軟體開發、AI/ML、系統架構、DevOps | `D:/vaults/rnd-vault` |
| `humanities` | 人文 | 📚 | 歷史、哲學、文學、藝術、社會學 | `D:/vaults/humanities-vault` |
| `science` | 科學 | 🔭 | 物理、化學、生物、數學、天文 | `D:/vaults/science-vault` |
| `medicine` | 醫學 | 🏥 | 臨床醫學、藥理、公衛、營養、基因 | `D:/vaults/medicine-vault` |
| `wellbeing` | 身心靈 | 🧘 | 冥想、心理學、靈性成長、情緒管理 | `D:/vaults/wellbeing-vault` |

### 3.3 每個 Vault 的內部結構

每個領域 vault 都遵循 Karpathy LLM Wiki 的標準結構：

```
{id}-vault/
├─ raw/
│  └─ inbox/          ← trafilatura 下載的原始內容
├─ wiki/
│  ├─ index.md        ← 該領域的知識索引
│  ├─ log.md          ← 操作歷史
│  └─ sources/        ← LLM 產生的摘要頁
├─ embeddings/
│  ├─ index.faiss     ← 該 vault 獨立的向量索引
│  └─ metadata.json
├─ schema/
└─ ops/
   └─ scripts/
```

### 3.4 meta-vault 統合層

`meta-vault` 不存放原始內容，而是作為跨 vault 的統合索引：

```
meta-vault/
├─ schema/
│  └─ VAULT_REGISTRY.json    ← 七域 vault 路徑對照表（核心設定檔）
├─ index.md                   ← 全域知識索引
├─ cross-links.md             ← 跨 vault 交叉連結
└─ ops/
   └─ scripts/
      ├─ vault_manager.py     ← vault 管理工具
      └─ meta_linker.py       ← 跨 vault 連結產生器
```

### 3.5 VAULT_REGISTRY.json（核心設定檔）

```json
{
    "version": "1.0",
    "base_path": "D:/vaults",
    "vaults": [
        {"id": "life",       "name": "生活", "path": "D:/vaults/life-vault",       "emoji": "🏠"},
        {"id": "work",       "name": "工作", "path": "D:/vaults/work-vault",       "emoji": "💼"},
        {"id": "rnd",        "name": "研發", "path": "D:/vaults/rnd-vault",        "emoji": "🔬"},
        {"id": "humanities", "name": "人文", "path": "D:/vaults/humanities-vault", "emoji": "📚"},
        {"id": "science",    "name": "科學", "path": "D:/vaults/science-vault",    "emoji": "🔭"},
        {"id": "medicine",   "name": "醫學", "path": "D:/vaults/medicine-vault",   "emoji": "🏥"},
        {"id": "wellbeing",  "name": "身心靈","path": "D:/vaults/wellbeing-vault",  "emoji": "🧘"}
    ]
}
```

Carrie Bot 啟動時透過 `loadVaultMap()` 載入此檔案，並自動將 Windows 路徑轉換為 WSL 路徑。

### 3.6 Sherlock 的 Vault 路由

Sherlock 的 system prompt 包含七域定義，分析使用者輸入後自動判斷目標 vault：

```
使用者：「存這篇冥想文章 https://example.com/meditation」
  ↓
Sherlock 分析：冥想 → wellbeing vault
  ↓
JSONL: {"type":"action","target":"carrie","action_type":"ingest_url",
        "payload":{"url":"https://...","vault":"wellbeing"}}
  ↓
Carrie 收到後寫入 D:/vaults/wellbeing-vault/raw/inbox/
```

---

## 四、Hermes Agent 三角色系統

### 4.1 角色定義

| 角色 | Bot 名稱 | 位置 | 職責 | Token |
|------|---------|------|------|-------|
| **Sherlock** | neovegasherlock_bot | Zeabur (`neovegahermes.zeabur.app`) | 偵探/分析者，kimi-k2.5 產出 JSONL | `8505666076:AAFs...Payg` |
| **Conan** | neovegaconan_bot | Zeabur (OpenClaw) | 雲端執行者，網路搜尋/查詢 | `8622712926:AAFj...pvg` |
| **Carrie** | neovegacarrie_bot | Home WSL (port 18800) | 本地執行者，vault 寫入/embedding | `8615424711:AAGLo...GTg` |

使用者 chat_id（DISPATCH_CHAT_ID）：`8240891231`

### 4.2 Sherlock 分析流程（4/14 更新）

```
用戶發送訊息給 @neovegasherlock_bot
  ↓
Sherlock (kimi-k2.5 via opencode.ai) 分析
  ↓
產出 JSONL（含 vault 路由欄位）
  ↓
dispatch_to_bots():
  ├─ 主通道: HTTPS POST → home-n8n.neovega.cc/webhook/carrie-dispatch
  │          → n8n relay → 172.18.0.1:18800/webhook/dispatch → Carrie
  └─ Fallback: 存入 Sherlock 記憶體離線佇列（pending_queue）
```

### 4.3 Carrie 本地執行能力

| action_type | 說明 | payload 範例 |
|-------------|------|-------------|
| `ingest_url` | 下載 URL 入庫（含 vault 路由） | `{"url":"https://...","vault":"science"}` |
| `local_scan` | 本地檔案掃描 | `{"path":"D:\\vaults","pattern":"*.md"}` |
| `run_script` | 執行白名單腳本 | `{"script":"rebuild_index"}` |
| `alert` | 發送警報通知 | `{"level":"high","message":"..."}` |
| `report` | 接收報告 | `{"title":"...","content":"..."}` |

### 4.4 Sherlock 程式碼位置

| 檔案 | 說明 |
|------|------|
| `hermes-agent-zeabur/hermes_agent/__main__.py` | Sherlock 主程式（Zeabur 部署） |
| GitHub: `Chuansu0/hermes-agent` | 原始碼倉庫（commit 3362c3b） |

### 4.5 Carrie 程式碼位置

| 檔案 | 說明 |
|------|------|
| `unified-commerce-hub/hermes-agent/carrie_bot.py` | Carrie 主程式（WSL 執行） |
| 執行環境 | WSL Ubuntu-24.04, miniconda "n8n" env, 非 Docker |

---

## 五、Webhook 二段式 Dispatch 架構

> 4/14 重構：從 Telegram 群組轉發改為 HTTP Webhook 二段式架構

### 5.1 為何重構？（舊方案的問題）

舊方案嘗試透過 Telegram 群組讓 Sherlock 發 JSONL 給 Carrie：

| 問題 | 說明 |
|------|------|
| Bot 無法收自己的訊息 | Sherlock 用 Carrie token 發訊息，Carrie 收不到自己發的 |
| Bot 預設不收其他 Bot 訊息 | Telegram 群組中 bot 預設忽略其他 bot 的訊息 |
| Zeabur n8n dispatcher 衝突 | 舊的 sherlock-dispatcher workflow 使用 Telegram API 轉發，與新架構衝突 |

### 5.2 新架構：HTTP Webhook 二段式

```
Sherlock (Zeabur)
  │
  │ HTTPS POST (JSONL body)
  │ Headers: X-Webhook-Secret, X-Session-Id, Content-Type: text/plain
  │
  ▼
home-n8n.neovega.cc/webhook/carrie-dispatch    ← Cloudflare Tunnel
  │
  │ n8n "Carrie Dispatch Relay" workflow
  │ HTTP Request node → POST http://172.18.0.1:18800/webhook/dispatch
  │ （Docker bridge → WSL host）
  │
  ▼
Carrie Bot (WSL, port 18800)
  │
  │ webhookDispatchHandler() 解析 JSONL
  │ webhookDispatchAction() 分發動作
  │ webhookIngestToVault() 執行 ingest
  │
  ▼
D:\vaults\{vault-id}-vault\raw\inbox\
```

### 5.3 n8n Relay Workflow 設定

檔案：`n8n/carrie-dispatch-relay.json`

```
[Webhook Trigger: POST /webhook/carrie-dispatch]
  │  rawBody: true
  ▼
[HTTP Request: POST http://172.18.0.1:18800/webhook/dispatch]
  │  Headers: X-Webhook-Secret=hermes-carrie-2026
  │  Body: raw text passthrough (={{ $json.body }})
  │  Timeout: 120s
  ▼
[Respond to Webhook: JSON response]
```

關鍵設計：
- `172.18.0.1` 是 Docker bridge gateway IP，讓 Docker 容器內的 n8n 能連到 WSL host
- `rawBody: true` 確保 JSONL 文字不被 n8n 解析為 JSON
- Timeout 120s 因為 ingest 包含下載 + LLM 摘要，可能耗時較長

### 5.4 Carrie Webhook 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/webhook/dispatch` | POST | 接收 JSONL 指令（需 X-Webhook-Secret） |
| `/health` | GET | 健康檢查（回傳 vault 列表） |

驗證機制：`X-Webhook-Secret: hermes-carrie-2026`

### 5.5 為何不直接暴露 Carrie？

| 方案 | 問題 |
|------|------|
| 直接開 18800 port 到公網 | 安全風險，無 TLS |
| Tailscale Funnel 18800 | 已被 OpenClaw 佔用 8080 |
| Cloudflare Tunnel 18800 | 需額外 tunnel 設定 |
| **n8n relay（採用）** | 複用現有 Cloudflare Tunnel + n8n，安全且簡單 |

---

## 六、離線佇列與容錯機制

> 4/15 新增：Home Workstation 離線時的容錯處理

### 6.1 問題場景

Home Workstation 可能因為關機、網路斷線、WSL 未啟動等原因離線。
此時 Sherlock 的 webhook POST 會失敗，需要有 fallback 機制。

### 6.2 Sherlock 端：離線佇列

```python
# hermes-agent-zeabur/hermes_agent/__main__.py
pending_queue = []  # list of {"ts": str, "session_id": str, "jsonl": str}
MAX_QUEUE_SIZE = 100

async def dispatch_to_bots(jsonl_lines, session_id):
    # 1. 嘗試 webhook POST
    webhook_ok = await post_to_carrie_webhook(carrie_payload)
    
    # 2. 失敗 → 存入離線佇列
    if not webhook_ok:
        pending_queue.append({
            "ts": datetime.now().isoformat(),
            "session_id": session_id,
            "jsonl": carrie_payload,
        })
        # channel = "queued"
```

### 6.3 Sherlock 佇列 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `GET /api/queue` | 查看佇列（不刪除） | 需 X-Webhook-Secret |
| `POST /api/queue/drain` | 取出所有項目（清空） | 需 X-Webhook-Secret |

### 6.4 Carrie 端：啟動時自動 drain

```python
# carrie_bot.py — 啟動時拉取離線佇列
async def drainSherlockQueue():
    r = await client.post(
        "https://neovegahermes.zeabur.app/api/queue/drain",
        headers={"X-Webhook-Secret": "hermes-carrie-2026"},
    )
    items = r.json().get("items", [])
    for item in items:
        # 解析 JSONL 並執行
        await webhookDispatchAction(action_type, payload, bot, OWNER_CHAT_ID)
```

### 6.5 完整容錯流程

```
Sherlock 收到使用者訊息
  ↓
dispatch_to_bots():
  ├─ webhook POST 成功 → channel="webhook" ✅
  └─ webhook POST 失敗 → 存入 pending_queue → channel="queued" 📦
      │
      │ （Home 離線期間，佇列累積）
      │
      ▼ Home 上線，執行 ./openclaw
      │
Carrie 啟動 → drainSherlockQueue()
  ↓
POST /api/queue/drain → 取回所有待處理項目
  ↓
逐一執行 webhookDispatchAction()
  ↓
通知使用者：「📦 已從 Sherlock 佇列回放 N 個離線動作」
```

### 6.6 Telegram 通知使用者

Sherlock 在 dispatch 後會透過 Telegram 通知使用者目前的通道狀態：

| 通道 | Emoji | 說明 |
|------|-------|------|
| `webhook` | 🌐 | 即時送達 Carrie |
| `queued` | 📦 | Home 離線，已存入佇列 |
| `queue_full` | 🚫 | 佇列已滿（100 筆上限） |

---

## 七、OpenClaw 雲地協作架構

### 7.1 雙 OpenClaw 實例

| 實例 | Endpoint | 任務類型 | 成本策略 |
|------|----------|---------|---------|
| 雲端 OpenClaw | `openclaw.neovega.cc` | 高品質推理、視覺理解、即時查詢 | 按 token 計費 |
| 本地 OpenClaw | WSL `~/.openclaw/` | 批量處理、零成本任務、結構化操作 | 本地硬體 |

### 7.2 Token 預算策略

- 本地優先批量：超過 10 份的批量 ingest 一律先走本地
- 雲端限額：每日 50k tokens，超過自動降級至本地
- 快取機制：SHA256 未變更的檔案不重複呼叫 LLM

### 7.3 本地 LLM 配置

| 用途 | 模型 | Endpoint |
|------|------|----------|
| 摘要產生 | `gemma:2b` | `http://127.0.0.1:11434/v1/chat/completions` |
| 向量 embedding | `nomic-embed-text` | `http://127.0.0.1:11434/api/embeddings` |

---

## 八、n8n 訊息路由機制

### 8.1 n8n 實例配置

| 實例 | 位置 | Domain | 用途 |
|------|------|--------|------|
| Zeabur n8n | Zeabur VPS | `neovegan8n.zeabur.app` | 舊 dispatcher（已停用） |
| Home n8n | Docker (WSL) | `home-n8n.neovega.cc` | Carrie dispatch relay |

### 8.2 Home n8n Workflow：Carrie Dispatch Relay

檔案：`n8n/carrie-dispatch-relay.json`

這是目前唯一啟用的 n8n workflow，負責將 Sherlock 的 JSONL 轉發給 Carrie：

```
[Webhook Trigger: POST /webhook/carrie-dispatch]
  │  rawBody: true（保持 JSONL 原始文字）
  ▼
[HTTP Request: POST http://172.18.0.1:18800/webhook/dispatch]
  │  Headers: X-Webhook-Secret, X-Session-Id
  │  Body: raw text passthrough
  │  Timeout: 120s
  ▼
[Respond to Webhook: JSON response]
```

### 8.3 已停用的 Workflow

| Workflow | 位置 | 狀態 | 原因 |
|----------|------|------|------|
| `sherlock-dispatcher` | Zeabur n8n | ❌ 已停用 | 使用舊的 Telegram API 轉發，與新 webhook 架構衝突 |

### 8.4 JSONL 指令格式規範

每條 Sherlock 分析結果由一或多行 JSON 組成：

```jsonl
{"schema":"sherlock/v1","ts":"2026-04-16T12:00:00Z","session":"abc123","type":"analysis","summary":"AI 論文入庫","confidence":0.95}
{"schema":"sherlock/v1","ts":"2026-04-16T12:00:00Z","session":"abc123","type":"action","target":"carrie","action_type":"ingest_url","payload":{"url":"https://arxiv.org/xxx","vault":"rnd"}}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `schema` | string | 固定值 `sherlock/v1` |
| `ts` | ISO8601 | 產生時間戳 |
| `session` | string | 對話 session ID |
| `type` | enum | `analysis` / `action` / `report` |
| `target` | string | `conan` / `carrie` (舊稱 `aria`) / `all` |
| `action_type` | string | 動作類型 |
| `payload` | object | 動作參數（ingest_url 必含 `vault` 欄位） |

---

## 九、完整資料流程

### 9.1 使用者查詢 → Vault 入庫（端對端）

```
使用者發送訊息給 @neovegasherlock_bot
  │  「存這篇量子力學文章 https://en.wikipedia.org/wiki/Quantum_mechanics」
  ▼
Sherlock (Zeabur, kimi-k2.5) 分析
  │  判斷：科學領域 → vault=science
  │  產出 JSONL
  ▼
dispatch_to_bots()
  │  HTTPS POST → home-n8n.neovega.cc/webhook/carrie-dispatch
  ▼
Home n8n (Docker) Carrie Dispatch Relay
  │  POST http://172.18.0.1:18800/webhook/dispatch
  ▼
Carrie Bot (WSL, port 18800)
  │  webhookDispatchHandler() 解析 JSONL
  │  webhookIngestToVault("https://...", "science", bot, chat_id)
  ▼
trafilatura 下載 + 清理
  │  SHA256 去重
  ▼
/mnt/d/vaults/science-vault/raw/inbox/{sha}.md     ← 原始內容
  ▼
Ollama gemma:2b 產生摘要
  ▼
/mnt/d/vaults/science-vault/wiki/sources/{ts}_{sha}.md  ← 摘要頁
  ▼
nomic-embed-text → /mnt/d/vaults/science-vault/embeddings/index.faiss
  ▼
wiki/log.md 追加記錄
  ▼
Telegram 通知使用者：「✅ 入庫完成！📂 Vault: science」
```

### 9.2 Home 離線 → 佇列回放

```
使用者發送入庫指令（Home 離線中）
  ▼
Sherlock dispatch 失敗 → 存入 pending_queue
  │  Telegram 通知：「📦 Home 離線，已存入佇列」
  ▼
（數小時後）Home 上線，執行 ./openclaw
  ▼
Carrie 啟動 → drainSherlockQueue()
  │  POST /api/queue/drain → 取回待處理項目
  ▼
逐一執行 ingest → 寫入 vault
  ▼
Telegram 通知：「📦 已從 Sherlock 佇列回放 N 個離線動作」
```

### 9.3 私聊直接入庫

```
使用者直接發 URL 給 @neovegacarrie_bot（私聊）
  ▼
Carrie handle_message() 偵測到 URL
  ▼
doFullIngest(url) → 入庫到預設 vault (rnd)
```

---

## 十、部署與啟動

### 10.1 統一啟動腳本：`./openclaw`

檔案：`n8n/openclaw`（WSL bash 腳本）

啟動順序：

```
[0] 清理舊程序
  │  kill 舊 Carrie (PID file + lsof :18800)
  ▼
[1/5] 啟動 Carrie Bot
  │  nohup python3 carrie_bot.py → /tmp/carrie-bot.log
  │  PID → /tmp/carrie-bot.pid
  ▼
[2/5] 啟動 OpenClaw
  │  ~/.openclaw/start-openclaw.sh
  ▼
[3/5] 啟動 Tailscale Funnel (port 8080)
  ▼
[4/5] 顯示 Tailscale 狀態
  ▼
[5/5] 啟動 Cloudflare Tunnel
  │  home-n8n.neovega.cc → localhost:5678
```

### 10.2 Carrie Bot 啟動流程

```python
# carrie_bot.py main_async()
loadVaultMap()                    # 載入 VAULT_REGISTRY.json
await startWebhookServer()        # 啟動 HTTP server (port 18800)
await drainSherlockQueue()        # 拉取離線佇列
# 啟動 Telegram polling
```

### 10.3 Sherlock (Zeabur) 部署

```yaml
# Zeabur 環境變數
TELEGRAM_BOT_TOKEN: 8505666076:AAFs...
OPENAI_API_KEY: sk-NQXHpm...
OPENAI_API_BASE: https://opencode.ai/zen/go/v1
OPENAI_MODEL: kimi-k2.5
CARRIE_WEBHOOK_URL: https://home-n8n.neovega.cc/webhook/carrie-dispatch
CARRIE_WEBHOOK_SECRET: hermes-carrie-2026
DISPATCH_CHAT_ID: 8240891231
PORT: 8080
```

GitHub repo: `Chuansu0/hermes-agent` → Zeabur 自動部署

### 10.4 Home n8n (Docker)

```bash
# n8n/docker-compose.yml
# Docker Compose 啟動 n8n on port 5678
# Cloudflare Tunnel 將 home-n8n.neovega.cc 導向 localhost:5678
```

需手動匯入 `n8n/carrie-dispatch-relay.json` workflow 並啟用。

### 10.5 Port 分配

| Port | 服務 | 位置 |
|------|------|------|
| 5678 | Home n8n (Docker) | WSL Docker |
| 8080 | OpenClaw Gateway / Tailscale Funnel | WSL |
| 11434 | Ollama | WSL |
| 18800 | Carrie Bot webhook | WSL (非 Docker) |

---

## 十一、WSL/Windows 路徑轉換

### 11.1 問題

`VAULT_REGISTRY.json` 使用 Windows 路徑（`D:/vaults/xxx`），但 Carrie 在 WSL 中執行，
需要轉換為 `/mnt/d/vaults/xxx`。

### 11.2 轉換函式

```python
def winPathToLocal(p: str) -> Path:
    """D:/vaults/xxx → /mnt/d/vaults/xxx（WSL 環境自動轉換）"""
    if platform.system() != "Windows" and len(p) >= 2 and p[1] in (":", "/"):
        drive = p[0].lower()
        rest = p[2:].replace("\\", "/")
        return Path(f"/mnt/{drive}{rest}")
    return Path(p)
```

### 11.3 轉換時機

| 時機 | 函式 | 說明 |
|------|------|------|
| 啟動時 | `loadVaultMap()` | 載入 registry 時轉換所有 vault 路徑 |
| 啟動時 | `VAULTS_BASE` 初始化 | 環境變數 `D:\vaults` → `/mnt/d/vaults` |

### 11.4 已知問題與修復

| 問題 | 狀態 | 說明 |
|------|------|------|
| 舊版未轉換路徑 | ✅ 已修復 | 曾產生 `hermes-agent/D:/vaults/...` 殘留目錄 |
| `winPathToLocal` 邏輯正確性 | ✅ 已驗證 | 4/16 測試確認 `D:/vaults/xxx` → `/mnt/d/vaults/xxx` |

---

## 十二、操作手冊

### 12.1 日常操作

| 操作 | 指令 | 說明 |
|------|------|------|
| 啟動所有服務 | WSL: `cd /mnt/d/wsl/n8n && ./openclaw` | Carrie + OpenClaw + Tunnel |
| 檢查 Carrie 狀態 | Telegram `/status` 給 @neovegacarrie_bot | 查看 vault 路徑、檔案數 |
| 檢查 Carrie 日誌 | `tail -f /tmp/carrie-bot.log` | 即時日誌 |
| 停止 Carrie | `kill $(cat /tmp/carrie-bot.pid)` | 手動停止 |
| 診斷所有通道 | Telegram `/diag` 給 @neovegasherlock_bot | LLM、webhook、token 檢查 |
| 入庫連結 | 發訊息給 @neovegasherlock_bot | 自動分析 vault + ingest |
| 直接入庫 | 發 URL 給 @neovegacarrie_bot（私聊） | 入庫到預設 vault (rnd) |

### 12.2 常用 API 測試

```bash
# Carrie 健康檢查（WSL 內部）
curl http://localhost:18800/health

# Sherlock 佇列查看
curl -H "X-Webhook-Secret: hermes-carrie-2026" \
  https://neovegahermes.zeabur.app/api/queue

# 手動觸發 Carrie ingest（測試用）
curl -X POST http://localhost:18800/webhook/dispatch \
  -H "Content-Type: text/plain" \
  -H "X-Webhook-Secret: hermes-carrie-2026" \
  -d '{"schema":"sherlock/v1","type":"action","target":"carrie","action_type":"ingest_url","payload":{"url":"https://en.wikipedia.org/wiki/Quantum_mechanics","vault":"science"}}'
```

### 12.3 故障排除

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| Port 18800 already in use | 舊 Carrie 未關閉 | `./openclaw` 已自動清理（Step 0） |
| Carrie 收不到 webhook | Cloudflare Tunnel 未啟動 | 確認 `./openclaw` Step 5 |
| n8n relay 失敗 | Docker bridge IP 變更 | 確認 `172.18.0.1` 是否正確 |
| 下載失敗 403 | 目標網站反爬蟲 | 非系統 bug（如 zhihu.com） |
| 路徑寫錯位置 | `winPathToLocal` 未生效 | 確認 `loadVaultMap()` 有被呼叫 |
| Sherlock 佇列未回放 | Carrie 啟動時網路不通 | 手動 `curl POST /api/queue/drain` |

---

## 附錄：關鍵連接資訊

| 服務 | URL / IP | 用途 |
|------|----------|------|
| Sherlock Web UI | `https://neovegahermes.zeabur.app` | Hermes Agent 狀態頁 |
| Sherlock 佇列 API | `https://neovegahermes.zeabur.app/api/queue` | 離線佇列管理 |
| Zeabur n8n | `https://neovegan8n.zeabur.app` | 舊 dispatcher（已停用） |
| Home n8n | `https://home-n8n.neovega.cc` | Carrie dispatch relay |
| Carrie Webhook | `http://localhost:18800` (WSL) | 本地 ingest 端點 |
| Ollama | `http://127.0.0.1:11434` | 本地 LLM |
| GitHub | `Chuansu0/hermes-agent` | Sherlock 原始碼 |

---

## 文件歷史

| 日期 | 版本 | 說明 |
|------|------|------|
| 2026-04-11 | v0.1 | 建立 karpathy_graphify_explain20260411.md |
| 2026-04-11 | v0.2 | 建立 remote-vault_explain20260411.md |
| 2026-04-12 | v0.3 | 整合為 hermes_openclaw_karpathy_n8n_telegram_explanation2026.0412.md |
| 2026-04-13 | v1.0 | 新增 Obsidian 七域 Multi-Vault 系統 + meta-vault 統合層 |
| 2026-04-14 | v1.1 | 重構 dispatch：Telegram 群組 → HTTP Webhook 二段式架構 |
| 2026-04-14 | v1.2 | 新增 FAISS embedding pipeline、多 vault ingest |
| 2026-04-15 | v1.3 | 新增離線佇列（Sherlock pending_queue + Carrie drain） |
| 2026-04-16 | v1.4 | Carrie 整合進 openclaw 啟動腳本、修復 port 衝突清理 |
| 2026-04-16 | v2.0 | 整合為本文件 hermes_openclaw_obsidian_karpathy_n8n_explanation20260416.md |

---

*文件版本: 2026-04-16 v2.0*
*整合架構: Hermes Agent + OpenClaw + Obsidian Multi-Vault + Karpathy LLM Wiki + n8n + Telegram*
