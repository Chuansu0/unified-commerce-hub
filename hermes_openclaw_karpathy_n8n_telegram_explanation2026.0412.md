# Hermes + OpenClaw + Karpathy Knowledge Vault + n8n + Telegram 整合架構說明

> 文件日期：2026-04-12
> 
> 本文整合 Hermes Agent 指揮架構、OpenClaw 雲地協作、Karpathy LLM Wiki 知識管理、n8n 訊息路由、以及 Telegram Bot 雙向通訊的完整系統說明。

---

## 目錄

1. [系統架構總覽](#一系統架構總覽)
2. [核心理論：Karpathy LLM Wiki](#二核心理論karpathy-llm-wiki)
3. [Hermes Agent 三角色系統](#三hermes-agent-三角色系統)
4. [OpenClaw 雲地協作架構](#四openclaw-雲地協作架構)
5. [n8n 訊息路由機制](#五n8n-訊息路由機制)
6. [Telegram Bot 雙向通訊](#六telegram-bot-雙向通訊)
7. [JSONL 指令格式規範](#七jsonl-指令格式規範)
8. [完整資料流程](#八完整資料流程)
9. [部署與設定](#九部署與設定)
10. [操作手冊](#十操作手冊)

---

## 一、系統架構總覽

### 1.1 雙層控制架構

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         雲端控制層 (Zeabur VPS)                               │
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │ neovegasherlock_bot  │    │ n8n Workflow                             │  │
│  │ (Hermes Agent)       │───▶│ • hermes-sherlock-dispatcher             │  │
│  │ • 分析輸入           │    │ • JSONL 解析與分流                       │  │
│  │ • 產出結構化指令     │    │ • 路由至 Conan/Carrie                    │  │
│  │ • 使用 kimi-k2.5     │    └──────────────────────────────────────────┘  │
│  └──────────────────────┘                                                   │
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │ neovegaconan_bot     │    │ OpenClaw Gateway                         │  │
│  │ (OpenClaw/Zeabur)    │    │ • Webhook 接收                           │  │
│  │ • 雲端執行者         │    │ • 任務派送                               │  │
│  │ • 網路搜尋/查詢      │    │ • 輕量 API                               │  │
│  └──────────────────────┘    └──────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────┐                                                   │
│  │ neovegalele_bot      │    (原有 Knowledge Vault 雲端 Bot)              │
│  │ • 接收 Telegram 訊息 │    • 連結入 n8n 佇列                            │
│  │ • 檔案直傳 GitHub    │    • 檔案存入 raw/inbox/                        │
│  └──────────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS / JSONL / Telegram API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       本地執行層 (Home Workstation)                           │
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │ neovegacarrie_bot    │    │ Knowledge Vault                          │  │
│  │ (Hermes 本地執行者)   │    │ D:\knowledge-vault\                     │  │
│  │ • 接收 Sherlock 指令 │    │ ├─ raw/inbox/     ← 連結下載位置        │  │
│  │ • 本地檔案掃描       │    │ ├─ wiki/          ← LLM 維護知識頁      │  │
│  │ • URL 入庫           │    │ ├─ schema/        ← Agent 規範          │  │
│  │ • 腳本執行           │    │ └─ ops/           ← 腳本與狀態          │  │
│  │ Token: 8615424711... │    └──────────────────────────────────────────┘  │
│  └──────────────────────┘                                                   │
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │ neovegasherlock_bot  │    │ Knowledge Vault Query Service            │  │
│  │ (佇列處理器)          │    │ • TF-IDF 相似度搜尋                      │  │
│  │ • 輪詢 n8n 佇列      │    │ • API: /query, /health, /stats           │  │
│  │ • 下載連結內容       │    │ • Port: 18790                            │  │
│  │ • 儲存 raw/inbox/    │    │ • WSL: 192.168.31.117:18790              │  │
│  └──────────────────────┘    └──────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ OpenClaw WSL / Docker                                                 │   │
│  │ • 本地 LLM 推理                                                       │   │
│  │ • Graphify 知識圖譜建構                                                │   │
│  │ • llm-wiki-skill 知識處理                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 角色分工矩陣

| 節點 | 主要角色 | 不建議承擔的角色 |
|------|---------|----------------|
| **Zeabur VPS** | Hermes 指揮中心、OpenClaw 雲端、Webhook 入口、n8n 路由 | 大規模 wiki 重寫、本地 LLM 推理、敏感資料儲存 |
| **Home Workstation** | Carrie 本地執行、Knowledge Vault 主庫、Obsidian 瀏覽 | 對外公開入口 |
| **WSL/Docker** | OpenClaw 本地實例、LLM 推理、Graphify 處理 | 大量檔案 I/O、持久化儲存 |

---

## 二、核心理論：Karpathy LLM Wiki

### 2.1 設計哲學

Andrej Karpathy 提出的 LLM Wiki 方法是一種讓 AI Agent 持續維護個人知識庫的創新架構：

```
新來源 → raw/inbox/ → LLM 讀取 → 產生摘要頁 → 更新索引 → 修改相關頁面 → 記錄到 log.md
```

### 2.2 目錄結構

```
knowledge-vault/
├─ raw/                    ← 不可變的原始資料區
│  ├─ inbox/              ← Telegram 連結下載位置
│  ├─ pdf/                ← PDF OCR 輸出
│  └─ web-clips/          ← 網頁截圖
├─ wiki/                   ← 由 LLM 持續維護的 Markdown 知識頁面
│  ├─ index.md            ← 知識索引（目錄）
│  ├─ log.md              ← 操作歷史與變更記錄
│  ├─ concepts/           ← 概念頁面（主題知識）
│  ├─ entities/           ← 實體頁面（人、組織、專案）
│  └─ sources/            ← 來源摘要頁
├─ schema/                 ← Agent 規範與規則
│  ├─ AGENTS.md           ← Agent 定義與職責
│  ├─ INGEST_RULES.md     ← 資料攝取規則
│  ├─ LINKING_RULES.md    ← 連結建立規則
│  └─ TAXONOMY.md         ← 知識分類體系
└─ ops/                    ← 腳本與狀態
   ├─ scripts/            ← 自動化腳本
   ├─ n8n/                ← n8n Workflow 匯出
   └─ reports/            ← 執行報告
```

### 2.3 與傳統 RAG 的區別

| 傳統 RAG | Karpathy LLM Wiki |
|---------|-------------------|
| 向量資料庫 + 嵌入搜尋 | 結構化 Markdown + LLM 主動維護 |
| 靜態索引 | 持續演化的知識圖譜 |
| 片段檢索 | 完整頁面閱讀與理解 |
| 一次性處理 | 增量更新與交叉連結 |

---

## 三、Hermes Agent 三角色系統

### 3.1 角色定義

| 角色 | Bot 名稱 | 位置 | 職責 | Token |
|------|---------|------|------|-------|
| **Sherlock** | neovegasherlock_bot | Zeabur (Hermes Agent) | 偵探/分析者，產出 JSONL 指令 | 8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg |
| **Conan** | neovegaconan_bot | Zeabur (OpenClaw) | 雲端執行者，網路搜尋/查詢 | 8622712926:AAFjLECd5xFxeveZAlRDmqLyFN3sXRIfpvg |
| **Carrie** | neovegacarrie_bot | Home Workstation | 本地執行者，檔案操作/腳本執行 | 8615424711:AAGLoHijlMpqWX7yD_JhJjKeTS0Dd5H5GTg |

### 3.2 Sherlock 分析流程

```
用戶訊息 → Sherlock (kimi-k2.5) 分析 → 產出 JSONL → n8n 路由 → Conan/Carrie 執行
```

Sherlock 使用 `kimi-k2.5` 模型（透過 opencode.ai API），分析完成後輸出結構化的 JSONL 指令。

### 3.3 Carrie 本地執行能力

```python
# neovegacarrie_bot 支援的動作類型
ACTION_HANDLERS = {
    "local_scan": handle_local_scan,    # 本地檔案掃描
    "ingest_url": handle_ingest_url,    # URL 內容下載入庫
    "run_script": handle_run_script,    # 執行 PowerShell 腳本（白名單）
    "alert": handle_alert,              # 顯示警報通知
    "report": handle_report,            # 接收報告
}
```

---

## 四、OpenClaw 雲地協作架構

### 4.1 雙 OpenClaw 實例

| 實例 | Endpoint | 任務類型 | 成本策略 |
|------|----------|---------|---------|
| 雲端 OpenClaw | `openclaw.neovega.cc` | 高品質推理、視覺理解、即時查詢 | 按 token 計費 |
| 本地 OpenClaw | `127.0.0.1:18789` (WSL) | 批量處理、零成本任務、結構化操作 | 本地硬體 |

### 4.2 Token 預算策略

- **本地優先批量**：超過 10 份的批量 ingest 一律先走本地
- **雲端限額**：每日 50k tokens，超過自動降級至本地
- **快取機制**：SHA256 未變更的檔案不重複呼叫 LLM

### 4.3 Knowledge Vault Query Service

本地知識庫查詢服務提供 TF-IDF 相似度搜尋：

```python
# WSL/OpenClaw 中使用
from knowledge_vault_client import KnowledgeVaultClient

client = KnowledgeVaultClient()
result = await client.query("n8n workflow 是什麼？", top_k=3)

if result["local_match_found"]:
    # 使用本地知識回答
    answer = result["local_results"][0]["content"]
else:
    # 搜尋網路回答
    answer = await search_web(query)
```

---

## 五、n8n 訊息路由機制

### 5.1 Workflow：hermes-sherlock-dispatcher

```
[Webhook Trigger: /webhook/sherlock-output]
              ↓
[Parse JSONL] ← 逐行解析，過濾 type=action
              ↓
[Switch: target]
    ├─ target=conan  → [HTTP Request] → Telegram API (Conan Bot)
    ├─ target=aria   → [HTTP Request] → Telegram API (Carrie Bot)
    └─ target=all    → [發送給兩者]
```

### 5.2 JSONL 解析邏輯

```javascript
// n8n Code Node
const raw = $input.item.json.body || $input.item.json;
const text = typeof raw === 'string' ? raw : JSON.stringify(raw);

const lines = text.split('\n').filter(l => l.trim());
const actions = [];

for (const line of lines) {
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'action' && obj.target && obj.action_type) {
            actions.push(obj);
        }
    } catch (e) {
        // 跳過無效行
    }
}

return actions.map(a => ({ json: a }));
```

### 5.3 分流規則

| target | 接收 Bot | 適用場景 |
|--------|---------|---------|
| `conan` | neovegaconan_bot | 網路搜尋、雲端查詢、外部 API 呼叫 |
| `aria` | neovegacarrie_bot | 本地掃描、檔案入庫、腳本執行 |
| `all` | 兩者皆發送 | 廣播警報、系統通知 |

---

## 六、Telegram Bot 雙向通訊

### 6.1 原有 Knowledge Vault Bot 分工

| Bot | 位置 | Token | 職責 |
|-----|------|-------|------|
| neovegalele_bot | Zeabur | `8719719797:AAERwcAQFWWpNxLTpG8cKNSfy24uMdZqsyQ` | 接收所有 Telegram 訊息，檔案直傳 GitHub，連結入 n8n 佇列 |
| neovegasherlock_bot (舊) | Home Workstation | `8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg` | 輪詢 n8n 佇列，下載連結內容 |

### 6.2 Hermes 新增 Bot 分工

| Bot | 位置 | 職責 |
|-----|------|------|
| neovegasherlock_bot (新) | Zeabur (Hermes) | AI 分析核心，產出 JSONL 指令 |
| neovegaconan_bot | Zeabur (OpenClaw) | 雲端執行器 |
| neovegacarrie_bot | Home Workstation | 本地執行器 |

### 6.3 佇列緩衝機制

```
使用者傳送連結給 neovegalele_bot
              ↓
    寫入 n8n SQLite 佇列 (status: pending)
              ↓
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
(離線累積)      neovegasherlock_bot (佇列處理器)
                      ↓
              下載連結內容 → raw/inbox/
```

---

## 七、JSONL 指令格式規範

### 7.1 標準輸出格式

每條 Sherlock 分析結果由一或多行 JSON 組成：

```jsonl
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"analysis","summary":"偵測到異常登入行為","confidence":0.92}
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"action","target":"conan","action_type":"alert","payload":{"level":"high","message":"異常 IP 登入：203.0.113.42","recommend":"封鎖 IP 並通知管理員"}}
{"schema":"sherlock/v1","ts":"2026-04-12T12:00:00Z","session":"abc123","type":"action","target":"aria","action_type":"local_scan","payload":{"path":"D:\\knowledge-vault","pattern":"*.log","since":"2026-04-12T00:00:00Z"}}
```

### 7.2 欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `schema` | string | 固定值 `sherlock/v1` |
| `ts` | ISO8601 | 產生時間戳 |
| `session` | string | 對話 session ID |
| `type` | enum | `analysis` / `action` / `report` |
| `target` | string | 目標 bot：`conan` / `aria` / `all` |
| `action_type` | string | 動作類型 |
| `payload` | object | 動作參數 |
| `confidence` | float | 分析信心度 0.0–1.0 |

### 7.3 action_type 完整列表

| action_type | 目標 | 說明 | payload 範例 |
|-------------|------|------|-------------|
| `alert` | conan/aria/all | 發送警報通知 | `{"level":"high","message":"..."}` |
| `local_scan` | aria | 本地檔案掃描 | `{"path":"D:\\vault","pattern":"*.md"}` |
| `ingest_url` | aria | 下載 URL 並入庫 | `{"url":"https://..."}` |
| `run_script` | aria | 執行本地腳本 | `{"script":"sync_vault"}` |
| `web_search` | conan | 雲端網路搜尋 | `{"query":"..."}` |
| `query_kb` | conan | 查詢知識庫 | `{"query":"..."}` |
| `report` | all | 產出報告並廣播 | `{"title":"...","content":"..."}` |

---

## 八、完整資料流程

### 8.1 使用者查詢流程

```
用戶發送訊息給 neovegasherlock_bot
              ↓
    Sherlock (kimi-k2.5) 分析
              ↓
    產出 JSONL 指令
              ↓
    POST 到 n8n webhook
              ↓
    n8n 解析並依 target 分流
      ├─→ Conan (雲端查詢) → 回傳結果
      └─→ Carrie (本地掃描) → 回傳結果
```

### 8.2 知識入庫流程

```
用戶傳送連結給 neovegalele_bot
              ↓
    加入 n8n 佇列 (pending)
              ↓
    neovegasherlock_bot (佇列處理器) 輪詢
              ↓
    trafilatura 下載並清理內容
              ↓
    儲存至 raw/inbox/*.md
              ↓
    (可選) llm-wiki-skill 處理 → wiki/sources/
              ↓
    (可選) Graphify 建構知識圖譜
```

### 8.3 OpenClaw 查詢流程

```
OpenClaw WSL 收到查詢
              ↓
    Knowledge Vault Client 優先查詢本地
              ↓
    TF-IDF 相似度搜尋 raw/ + wiki/
              ├─→ 找到匹配 → 使用本地知識回答
              └─→ 未找到 → 搜尋網路 / 詢問雲端 OpenClaw
```

---

## 九、部署與設定

### 9.1 Hermes Agent (Zeabur) 環境變數

```yaml
OPENAI_API_BASE: https://opencode.ai/zen/go/v1
OPENAI_API_KEY: sk-NQXHpmDhh4SHISdAtMtFEGCcbkJjYEWKQ6xolQbPygsfcrtX6F7wBFYC9bSryTDw
OPENAI_MODEL: kimi-k2.5
TELEGRAM_BOT_TOKEN: 8505666076:AAFsPUQCBA7UVdIiw8ItBU3QHDbggI6Payg
TELEGRAM_BOT_NAME: neovegasherlock_bot
N8N_WEBHOOK_URL: https://n8n.neovega.cc/webhook/sherlock-output
OUTPUT_FORMAT: jsonl
PORT: 8080
```

### 9.2 Carrie Bot (Home Workstation) 環境變數

```powershell
# PowerShell
$env:CARRIE_BOT_TOKEN = "8615424711:AAGLoHijlMpqWX7yD_JhJjKeTS0Dd5H5GTg"
$env:VAULT_PATH = "D:\knowledge-vault"
$env:SHERLOCK_BOT_ID = "8505666076"  # 只接受 Sherlock 的指令
```

### 9.3 n8n 環境變數

```
SHERLOCK_CONAN_CHAT_ID: <neovegaconan_bot 的 chat_id>
SHERLOCK_CARRIE_CHAT_ID: <neovegacarrie_bot 的 chat_id>
```

### 9.4 啟動 Carrie Bot

```bash
# 在 Home Workstation
cd hermes-agent
python carrie_bot.py
```

---

## 十、操作手冊

### 10.1 日常操作

| 操作 | 指令/方式 | 說明 |
|------|----------|------|
| 啟動 Carrie Bot | `python carrie_bot.py` | 在 Home Workstation 執行 |
| 檢查 Carrie 狀態 | Telegram 發送 `/status` | 查看 Vault 路徑、白名單 |
| 測試 Sherlock 分析 | 發訊息給 neovegasherlock_bot | 觸發分析並產出 JSONL |
| 查詢知識庫 | `curl http://192.168.31.117:18790/query` | 本地 TF-IDF 搜尋 |
| 傳送連結入庫 | 發給 neovegalele_bot | 自動下載到 raw/inbox/ |

### 10.2 常用 API 測試

```bash
# 測試 Knowledge Vault 健康狀態
curl http://192.168.31.117:18790/health

# 查詢知識庫
curl -X POST http://192.168.31.117:18790/query \
  -H "Content-Type: application/json" \
  -d '{"query":"n8n workflow","top_k":3}'

# 測試 n8n Webhook
curl -X POST https://n8n.neovega.cc/webhook/sherlock-output \
  -H "Content-Type: text/plain" \
  -d '{"schema":"sherlock/v1","type":"action","target":"conan","action_type":"alert","payload":{"level":"low","message":"測試"}}'
```

### 10.3 故障排除

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| Carrie Bot 無法啟動 | Token 錯誤或衝突 | 確認 `CARRIE_BOT_TOKEN` 設定 |
| 收不到 Sherlock 指令 | sender_id 驗證失敗 | 確認 `SHERLOCK_BOT_ID` 設定正確 |
| n8n 分流失敗 | JSONL 格式錯誤 | 檢查 Sherlock 的 system prompt |
| Knowledge Vault 查詢失敗 | 服務未啟動 | 確認 Windows 服務在 18790 port 運行 |

---

## 附錄：關鍵連接資訊

| 服務 | URL / IP | 用途 |
|------|----------|------|
| n8n Webhook | https://n8n.neovega.cc/webhook/sherlock-output | Sherlock JSONL 接收 |
| n8n Queue API | https://n8n.neovega.cc/webhook/queue | 連結佇列管理 |
| Knowledge Vault API | http://192.168.31.117:18790 | WSL/OpenClaw 查詢 |
| GitHub Repo | https://github.com/Chuansu0/knowledge-vault | 雲端同步 |
| Hermes Agent | Zeabur 內網 | AI 分析核心 |

---

## 文件歷史

- **2026-04-11**: 建立 karpathy_graphify_explain20260411.md
- **2026-04-11**: 建立 remote-vault_explain20260411.md
- **2026-04-12**: 建立 openclaw_karpathy_graphify_telegram_explain20260412.md
- **2026-04-12**: 建立 Hermes_Zeabur20260412.md
- **2026-04-12**: 整合為本文件 hermes_openclaw_karpathy_n8n_telegram_explanation2026.0412.md

---

*文件版本: 2026-04-12*
*整合架構: Hermes Agent + OpenClaw + Karpathy Knowledge Vault + n8n + Telegram*
