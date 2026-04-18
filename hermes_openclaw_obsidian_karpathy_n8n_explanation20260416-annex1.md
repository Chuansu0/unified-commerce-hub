# Annex 1：OpenClaw Skills 與 Vault 管理腳本調用關係

> 文件日期：2026-04-17（更新版）
>
> 本附錄說明 6 個 OpenClaw Skills 如何調用 `vault_manager.py`、`meta_linker.py`、`link_manager.py` 以及 bash 腳本，協力完成七域 vault 的資料整理與維護。
>
> **Skills 實際位置**：`d:\WSL\n8n\skills\`（WSL Ubuntu 虛擬硬碟映射）

---

## 目錄

1. [系統架構總覽](#一系統架構總覽)
2. [Python 管理腳本簡介](#二python-管理腳本簡介)
3. [Skill 與腳本調用矩陣](#三skill-與腳本調用矩陣)
4. [各 Skill 詳細說明](#四各-skill-詳細說明)
5. [Bash Scripts 詳細內容](#五bash-scripts-詳細內容)
6. [資料整理工作流程](#六資料整理工作流程)
7. [路徑對照表](#七路徑對照表)

---

## 一、系統架構總覽

### 1.1 元件位置

```
d:\WSL\n8n\skills\                    ← OpenClaw Skills 根目錄（WSL 映射）
    ├── obsidian-vault-query/       ← 搜尋七域 vault
    ├── vault-manager/              ← vault 管理與初始化
    ├── meta-index/                 ← 統合索引管理
    ├── obsidian-linker/            ← 內容關聯與連結
    ├── obsidian-markdown/          ← Obsidian 格式規範
    └── obsidian-tagger/            ← 標籤管理

/mnt/d/vaults/                      ← 七域 vault 根目錄（WSL 路徑）
    ├── meta-vault/ops/scripts/
    │   ├── vault_manager.py        ← vault 生命週期管理
    │   └── meta_linker.py          ← 跨 vault 索引同步
    ├── rnd-vault/ops/scripts/
    │   └── link_manager.py         ← 單一 vault 連結圖譜
    └── {其他六域}/                 ← 各 domain vault
```

### 1.2 呼叫架構圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OpenClaw Agent (WSL ~/.openclaw/)                    │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ obsidian-vault- │  │   vault-manager │  │      meta-index         │ │
│  │     query       │  │                 │  │                         │ │
│  │ search-vaults.sh│  │  init-vault.sh  │  │  rebuild-meta-index.sh  │ │
│  │   list-vault.sh │  │  health-check.sh│  │  build-cross-links.sh   │ │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘ │
│           │                     │                       │               │
│           ▼                     ▼                       ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                   Python 管理腳本層                                 ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ ││
│  │  │vault_manager │  │meta_linker  │  │      link_manager          │ ││
│  │  │  .py         │  │  .py         │  │      .py                   │ ││
│  │  │(meta-vault) │  │(meta-vault)  │  │  (各 vault 獨立副本)       │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                   /mnt/d/vaults\ 七域 Multi-Vault                    ││
│  │  life/  work/  rnd/  humanities/  science/  medicine/  wellbeing/ ││
│  │                         meta-vault/                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、Python 管理腳本簡介

### 2.1 vault_manager.py（meta-vault/ops/scripts/）

**路徑**：`/mnt/d/vaults/meta-vault/ops/scripts/vault_manager.py`

**職責**：多 vault 生命週期管理

**主要命令**：

| 命令 | 功能 | 輸出 |
|------|------|------|
| `python vault_manager.py list` | 列出所有已註冊 vault | JSON（含 ID、名稱、emoji、路徑、是否存在） |
| `python vault_manager.py status --id <vault_id>` | 單一 vault 統計 | wiki 頁數、raw/inbox 數、FAISS 狀態 |
| `python vault_manager.py status --all` | 全部 vault 統計 | 各 vault 狀態摘要 |
| `python vault_manager.py create --id <id> --name <name>` | 建立新 vault | 建立目錄結構、更新 VAULT_REGISTRY.json |

**核心資料**：`/mnt/d/vaults/meta-vault/schema/VAULT_REGISTRY.json`

### 2.2 meta_linker.py（meta-vault/ops/scripts/）

**路徑**：`/mnt/d/vaults/meta-vault/ops/scripts/meta_linker.py`

**職責**：跨 vault 索引同步與連結建議

**主要命令**：

| 命令 | 功能 | 輸出 |
|------|------|------|
| `python meta_linker.py sync` | 同步所有 vault 摘要到 meta-vault/domains/ | 各 vault 頁面數、產生 domains/*.md、更新 index.md |
| `python meta_linker.py search "<關鍵字>"` | 跨所有 vault 搜尋 | 搜尋結果（vault、檔案、行號、上下文） |
| `python meta_linker.py cross-suggest` | LLM 建議跨域連結 | 呼叫 Ollama 產生 cross-links.md |

**依賴**：`httpx`（用於 Ollama API 呼叫）

### 2.3 link_manager.py（各 vault/ops/scripts/）

**路徑**：`/mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py`（各 vault 有獨立副本）

**職責**：單一 vault 內的連結圖譜維護

**主要命令**：

| 命令 | 功能 | 輸出 |
|------|------|------|
| `python link_manager.py scan [--vault <路徑>]` | 掃描連結統計 | 總檔案數、連結數、斷連數、孤立頁面數、健康分數 |
| `python link_manager.py broken [--vault <路徑>]` | 列出所有斷連 | 斷連檔案 → 目標列表 |
| `python link_manager.py orphans [--vault <路徑>]` | 列出孤立頁面 | 無 inbound 連結的頁面 |
| `python link_manager.py fix [--vault <路徑>]` | 自動修復斷連 | 修復數量、修補明細 |
| `python link_manager.py index [--vault <路徑>]` | 重建 wiki/index.md | 依分類重建索引、頁面總數 |
| `python link_manager.py suggest [--vault <路徑>]` | LLM 建議新連結 | 呼叫 Ollama 建議 [[wikilink]] |
| `python link_manager.py report [--vault <路徑>]` | 產生完整報告 | 寫入 ops/reports/LINK_REPORT.md |

**可選參數**：`--vault` 可指定任意 vault 路徑（預設：`/mnt/d/vaults/rnd-vault`）

---

## 三、Skill 與腳本調用矩陣

| Skill | Bash Scripts | Python 腳本 | 主要功能 |
|-------|-------------|-------------|---------|
| **obsidian-vault-query** | `search-vaults.sh`, `list-vault.sh` | — | 搜尋、列表、讀取 |
| **vault-manager** | `init-vault.sh`, `health-check.sh` | `vault_manager.py` | 初始化、健康檢查 |
| **meta-index** | `rebuild-meta-index.sh`, `build-cross-links.sh` | `meta_linker.py` | 索引重建、跨域連結 |
| **obsidian-linker** | `find-related.sh`, `find-orphans.sh`, `find-backlinks.sh` | `link_manager.py` | 連結分析、orphan 偵測 |
| **obsidian-markdown** | — | — | 格式規範（無外部呼叫） |
| **obsidian-tagger** | `find-untagged.sh`, `tag-report.sh` | — | 標籤統計、未標籤頁面 |

---

## 四、各 Skill 詳細說明

### 4.1 obsidian-vault-query（搜尋七域 vault）

**位置**：`d:\WSL\n8n\skills\obsidian-vault-query\`

**SKILL.md 摘要**：
- 觸發關鍵詞：「搜尋知識庫」、「查一下 vault」、「之前存過的」、「找找看」
- 支援全文搜尋、跨 vault 查詢、列出 vault 內容、閱讀特定頁面

**工作流**：

| 工作流 | 觸發關鍵詞 | 呼叫指令 |
|--------|-----------|---------|
| query（全文搜尋） | 「搜尋知識庫」、「query vault」 | `bash ${SKILL_DIR}/scripts/search-vaults.sh "關鍵詞" [vault_id]` |
| list（列出 vault） | 「列出知識庫」、「vault 裡有什麼」 | `bash ${SKILL_DIR}/scripts/list-vault.sh [vault_id]` |
| read（閱讀頁面） | 「打開」、「讀取」、「看看這篇」 | 直接 `cat` 讀取 markdown 檔案 |

**Vault 路徑（WSL）**：`/mnt/d/vaults/`

| Vault ID | 名稱 | 路徑 |
|----------|------|------|
| life | 生活 | /mnt/d/vaults/life-vault |
| work | 工作 | /mnt/d/vaults/work-vault |
| rnd | 研發 | /mnt/d/vaults/rnd-vault |
| humanities | 人文 | /mnt/d/vaults/humanities-vault |
| science | 科學 | /mnt/d/vaults/science-vault |
| medicine | 醫學 | /mnt/d/vaults/medicine-vault |
| wellbeing | 身心靈 | /mnt/d/vaults/wellbeing-vault |

**Registry 設定檔**：`/mnt/d/vaults/meta-vault/schema/VAULT_REGISTRY.json`

**備用 API**：Carrie Bot（`curl http://localhost:18800/health`）

---

### 4.2 vault-manager（vault 管理）

**位置**：`d:\WSL\n8n\skills\vault-manager\`

**SKILL.md 摘要**：
- 觸發關鍵詞：「初始化 vault」、「建立 vault」、「vault 健康檢查」、「清理 vault」
- 支援初始化 vault 目錄結構、清理重複檔案、重建索引、檢查 vault 健康狀態

**工作流**：

| 工作流 | 觸發關鍵詞 | 呼叫指令 |
|--------|-----------|---------|
| init（初始化） | 「初始化 vault」、「建立 vault」 | `bash ${SKILL_DIR}/scripts/init-vault.sh [vault_id|all]` |
| health（健康檢查） | 「vault 健康檢查」、「檢查知識庫」 | `bash ${SKILL_DIR}/scripts/health-check.sh` |
| cleanup（清理重複） | 「清理 vault」、「去重」 | SHA256 hash 比對重複檔案 |

**init-vault.sh 的行為**：
1. 建立標準目錄結構：`raw/inbox`, `wiki/sources`, `wiki/concepts`, `wiki/entities`, `embeddings`, `schema`, `ops`
2. 建立 `wiki/log.md`（如果不存在）
3. 建立 `wiki/index.md`（如果不存在）

**health-check.sh 的檢查項目**：
- VAULT_REGISTRY.json 是否存在
- 每個 vault 目錄是否存在
- `raw/inbox`, `wiki/sources` 是否有內容
- `wiki/log.md` 是否可寫入
- Carrie Bot (port 18800) 是否運行
- Ollama (port 11434) 是否運行

---

### 4.3 meta-index（統合索引）

**位置**：`d:\WSL\n8n\skills\meta-index\`

**SKILL.md 摘要**：
- 觸發關鍵詞：「重建索引」、「更新 meta index」、「跨 vault 連結」、「知識庫統計」
- 管理跨七域 vault 的統合索引、交叉連結、全域知識地圖

**工作流**：

| 工作流 | 觸發關鍵詞 | 呼叫指令 |
|--------|-----------|---------|
| rebuild-index（重建全域索引） | 「重建索引」、「更新 meta index」 | `bash ${SKILL_DIR}/scripts/rebuild-meta-index.sh` |
| cross-links（跨 vault 連結） | 「跨 vault 連結」、「知識關聯」 | `bash ${SKILL_DIR}/scripts/build-cross-links.sh` |
| stats（全域統計） | 「知識庫統計」、「全域統計」 | 統計所有 vault 的文件數、最近更新時間 |

**Meta-Vault 位置**：`/mnt/d/vaults/meta-vault/`

**關鍵檔案**：
- `schema/VAULT_REGISTRY.json` — vault 路徑對照表
- `index.md` — 全域知識索引
- `cross-links.md` — 跨 vault 交叉連結

**rebuild-meta-index.sh 的行為**：
1. 掃描所有 7 個 vault 的 `wiki/sources/`
2. 提取每篇文章的 title、vault、date
3. 按 vault 分組，產生 `meta-vault/index.md`

**build-cross-links.sh 的行為**：
1. 掃描所有 vault 中的 `[[連結]]` 語法（使用 `grep -rohP '\[\[([^\]]+)\]\]'`）
2. 統計每個連結的使用次數
3. 更新 `meta-vault/cross-links.md`

---

### 4.4 obsidian-linker（內容關聯）

**位置**：`d:\WSL\n8n\skills\obsidian-linker\`

**SKILL.md 摘要**：
- 核心理念：Karpathy LLM Wiki 的價值在於知識之間的連結
- 觸發關鍵詞：「幫這篇建立連結」、「找 orphan」、「建議連結」、「反向連結」
- 自動建立 [[wikilinks]]、偵測並修復 orphan 頁面

**工作流**：

| 工作流 | 觸發關鍵詞 | 呼叫指令 |
|--------|-----------|---------|
| link-new（新內容關聯） | 「幫這篇建立連結」、「link this」 | `bash ${SKILL_DIR}/scripts/find-related.sh "<vault_id>" "<keywords>"` |
| find-orphans（偵測孤立頁面） | 「找 orphan」、「沒有連結的頁面」 | `bash ${SKILL_DIR}/scripts/find-orphans.sh [vault_id|all]` |
| suggest-links（智慧連結建議） | 「建議連結」、「哪些頁面應該連結」 | 分析頁面內容 + 比對 vault |
| backlinks（反向連結報告） | 「反向連結」、「誰連結到這篇」 | `bash ${SKILL_DIR}/scripts/find-backlinks.sh "<page_name>" [vault_id]` |

**Obsidian Wikilink 格式**：
```markdown
[[頁面名稱]]                    基本連結
[[頁面名稱|顯示文字]]           自訂顯示文字
[[頁面名稱#標題]]               連結到特定標題
![[頁面名稱]]                   嵌入整個頁面
```

**連結建立規則**：
1. 使用 `[[wikilinks]]` 連結 vault 內的頁面
2. 使用 `[文字](URL)` 連結外部網址
3. 在頁面底部建立「## 相關連結」區塊統一管理
4. 跨 vault 連結使用完整路徑或在 meta-vault/cross-links.md 記錄
5. 每個概念只在首次出現時建立連結，避免過度連結

---

### 4.5 obsidian-markdown（Obsidian 格式規範）

**位置**：`d:\WSL\n8n\skills\obsidian-markdown\`

**SKILL.md 摘要**：
- 觸發關鍵詞：「建立 Obsidian 筆記」、「使用 wikilinks」、「frontmatter」、「callouts」
- 包含 wikilinks、embeds、callouts、frontmatter properties、tags 等 Obsidian 特有語法

**本系統標準 Frontmatter Properties**：

```yaml
---
title: "頁面標題"
source: "https://原始來源URL"
date: "2026-04-17T09:00:00+08:00"
sha: "abc123def456"
vault: "science"
tags:
  - 量子力學
  - 物理
aliases:
  - Quantum Mechanics
---
```

| Property | 型別 | 說明 |
|----------|------|------|
| `title` | text | 頁面標題 |
| `source` | text | 原始來源 URL |
| `date` | datetime | 入庫時間（ISO8601） |
| `sha` | text | 內容 SHA256 前 12 碼（去重用） |
| `vault` | text | 所屬 vault ID |
| `tags` | list | 標籤列表 |
| `aliases` | list | 別名（用於連結建議） |

**Callouts 常用類型**：`note`、`tip`、`warning`、`info`、`example`、`quote`、`bug`、`danger`、`success`、`question`、`abstract`、`todo`

**與 Python 腳本的協作**：
- `meta_linker.py sync` 會解析 frontmatter 的 title、date、tags
- `link_manager.py fix` 會修正 wikilink 語法

---

### 4.6 obsidian-tagger（標籤管理）

**位置**：`d:\WSL\n8n\skills\obsidian-tagger\`

**SKILL.md 摘要**：
- 觸發關鍵詞：「自動標籤」、「未標籤」、「標籤統計」、「tag report」
- 自動為 Obsidian vault 中的頁面加入標籤、分類、frontmatter properties

**七域 Vault 的標籤體系**：

| Vault | 標籤前綴範例 |
|-------|-------------|
| life | `#生活/旅遊`、`#生活/飲食`、`#生活/家庭` |
| work | `#工作/專案`、`#工作/策略`、`#工作/客戶` |
| rnd | `#研發/AI`、`#研發/DevOps`、`#研發/架構` |
| humanities | `#人文/歷史`、`#人文/哲學`、`#人文/文學` |
| science | `#科學/物理`、`#科學/生物`、`#科學/數學` |
| medicine | `#醫學/臨床`、`#醫學/藥理`、`#醫學/營養` |
| wellbeing | `#身心靈/冥想`、`#身心靈/心理`、`#身心靈/靈性` |

**工作流**：

| 工作流 | 觸發關鍵詞 | 呼叫指令 |
|--------|-----------|---------|
| auto-tag（自動標籤） | 「自動標籤」、「auto tag」 | 分析關鍵詞 → 比對標籤體系 → 更新 frontmatter |
| find-untagged（找未標籤頁面） | 「未標籤」、「沒有 tag 的」 | `bash ${SKILL_DIR}/scripts/find-untagged.sh [vault_id|all]` |
| tag-report（標籤統計） | 「標籤統計」、「tag report」 | `bash ${SKILL_DIR}/scripts/tag-report.sh [vault_id|all]` |

---

## 五、Bash Scripts 詳細內容

### 5.1 obsidian-vault-query Scripts

#### search-vaults.sh

```bash
# 用法: bash search-vaults.sh "關鍵詞" [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-vault-query\scripts\search-vaults.sh

# 行為：
# 1. 在指定的 vault（或所有 vault）的 wiki/sources/ 和 raw/inbox/ 中用 grep 搜尋
# 2. 提取 title frontmatter 或使用檔名作為標題
# 3. 顯示匹配行（最多 2 行上下文）
# 4. 統計找到的匹配數
```

#### list-vault.sh

```bash
# 用法: bash list-vault.sh [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-vault-query\scripts\list-vault.sh

# 行為：
# 1. 統計每個 vault 的 raw/inbox/*.md 數量
# 2. 統計每個 vault 的 wiki/sources/*.md 數量
# 3. 檢查 embeddings/index.faiss 是否存在
# 4. 顯示最近 3 筆記錄（從 wiki/log.md）
# 5. 計算總計
```

### 5.2 vault-manager Scripts

#### init-vault.sh

```bash
# 用法: bash init-vault.sh [vault_id|all]
# 位置: d:\WSL\n8n\skills\vault-manager\scripts\init-vault.sh

# 建立的目錄：
# - raw/inbox
# - wiki/sources
# - wiki/concepts
# - wiki/entities
# - embeddings
# - schema
# - ops/scripts

# 建立的檔案（如不存在）：
# - wiki/log.md          → 標準標題
# - wiki/index.md        → 標準索引模板
```

#### health-check.sh

```bash
# 用法: bash health-check.sh
# 位置: d:\WSL\n8n\skills\vault-manager\scripts\health-check.sh

# 檢查項目：
# 1. VAULT_REGISTRY.json 是否存在 + vault 數量
# 2. 每個 vault 的目錄結構（raw/inbox, wiki/sources, wiki/log.md）
# 3. Carrie Bot (port 18800) 是否運行
# 4. Ollama (port 11434) 是否運行

# 輸出：每個 vault 的健康狀態（✅/❌）+ 問題數量
```

### 5.3 meta-index Scripts

#### rebuild-meta-index.sh

```bash
# 用法: bash rebuild-meta-index.sh
# 位置: d:\WSL\n8n\skills\meta-index\scripts\rebuild-meta-index.sh

# 行為：
# 1. 掃描所有 7 個 vault 的 wiki/sources/*.md
# 2. 提取 frontmatter 中的 title 和 date
# 3. 按 vault 分組，產生 meta-vault/index.md
# 4. 統計總文章數
```

#### build-cross-links.sh

```bash
# 用法: bash build-cross-links.sh
# 位置: d:\WSL\n8n\skills\meta-index\scripts\build-cross-links.sh

# 行為：
# 1. 使用 grep -rohP '\[\[([^\]]+)\]\]' 提取所有 [[wikilinks]]
# 2. 按 vault 分組統計連結數量
# 3. 排序（使用次數由多到少）
# 4. 更新 meta-vault/cross-links.md
```

### 5.4 obsidian-linker Scripts

#### find-related.sh

```bash
# 用法: bash find-related.sh <vault_id|all> <keyword1> [keyword2] ...
# 位置: d:\WSL\n8n\skills\obsidian-linker\scripts\find-related.sh

# 行為：
# 1. 在指定 vault（或所有 vault）的 wiki/sources/ 中搜尋關鍵詞
# 2. 提取 title frontmatter
# 3. 建議 wikilink 格式：[[檔名|標題]]
```

#### find-orphans.sh

```bash
# 用法: bash find-orphans.sh [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-linker\scripts\find-orphans.sh

# 行為：
# 1. 收集所有頁面名稱
# 2. 收集所有被連結的頁面（grep [[）
# 3. 找出 orphan 頁面（無 inbound 連結）
# 4. 找出 dead links（指向不存在頁面的連結）

# 輸出：
# - 已連結頁面數
# - Orphan 頁面數 🏚️
# - Dead links 數 💀
```

#### find-backlinks.sh

```bash
# 用法: bash find-backlinks.sh <page_name> [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-linker\scripts\find-backlinks.sh

# 行為：
# 1. 在所有 vault 的 wiki/sources/ 中搜尋 [[page_name]]
# 2. 顯示找到的頁面（vault、標題、路徑）
# 3. 顯示匹配的內容行
```

### 5.5 obsidian-tagger Scripts

#### find-untagged.sh

```bash
# 用法: bash find-untagged.sh [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-tagger\scripts\find-untagged.sh

# 行為：
# 1. 掃描 wiki/sources/ 中的所有 .md 檔案
# 2. 檢查 frontmatter 中是否有 tags:
# 3. 列出未標籤的頁面

# 輸出：未標籤頁面數 + 總頁面數
```

#### tag-report.sh

```bash
# 用法: bash tag-report.sh [vault_id|all]
# 位置: d:\WSL\n8n\skills\obsidian-tagger\scripts\tag-report.sh

# 行為：
# 1. 從 frontmatter 提取 tags 行（- tag 格式）
# 2. 也提取行內 #tags
# 3. 統計每個標籤的使用次數
# 4. 排序並顯示前 30 名
```

---

## 六、資料整理工作流程

### 6.1 每日維護流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      每日 Vault 維護腳本                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 健康檢查（每日一次）                                     │
│ $ bash d:\WSL\n8n\skills\vault-manager\scripts/health-check.sh │
│ → 檢查所有 vault 結構 + Carrie Bot + Ollama                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Vault 狀態列表（每日一次）                               │
│ $ bash d:\WSL\n8n\skills\obsidian-vault-query\scripts/list-vault.sh │
│ → raw/inbox 數、wiki/sources 數、FAISS 狀態                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 重建全域索引（每日一次）                                 │
│ $ bash d:\WSL\n8n\skills\meta-index\scripts/rebuild-meta-index.sh│
│ → 更新 meta-vault/index.md                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: 跨域連結分析（每週一次）                                 │
│ $ bash d:\WSL\n8n\skills\meta-index\scripts/build-cross-links.sh │
│ → 更新 meta-vault/cross-links.md                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Orphan + Dead Link 偵測（每週一次）                      │
│ $ bash d:\WSL\n8n\skills\obsidian-linker\scripts/find-orphans.sh│
│ → 列出孤立頁面和斷連                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: 標籤統計（每週一次）                                    │
│ $ bash d:\WSL\n8n\skills\obsidian-tagger\scripts/tag-report.sh  │
│ → 標籤使用次數排行榜                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 OpenClaw Agent 觸發流程（實際案例）

**案例 1：使用者查詢知識庫**
```
使用者：「搜尋 vault 中關於量子力學的文章」
          │
          ▼
OpenClaw Agent 分析意圖 → 呼叫 obsidian-vault-query skill
          │
          ▼
$ bash d:\WSL\n8n\skills\obsidian-vault-query\scripts/search-vaults.sh "量子力學"
          │
          ▼
回傳搜尋結果（vault、標題、路徑、匹配行）
```

**案例 2：使用者要求清理孤立頁面**
```
使用者：「找出 science vault 的孤立頁面」
          │
          ▼
OpenClaw Agent → 呼叫 obsidian-linker skill
          │
          ▼
$ bash d:\WSL\n8n\skills\obsidian-linker\scripts/find-orphans.sh science
          │
          ▼
回傳 Orphan 頁面列表 + 建議修復方式
          │
          ▼
使用者確認後 → 呼叫 link_manager.py fix 或手動建立連結
```

**案例 3：新內容入庫後建立關聯**
```
新內容入庫 → wiki/log.md 更新
          │
          ▼
使用者：「幫這篇建立連結」
          │
          ▼
OpenClaw Agent → 呼叫 obsidian-linker skill
          │
          ▼
1. 讀取新頁面內容
2. 提取關鍵概念
3. $ bash find-related.sh science "量子糾纏" "薛丁格"
4. 建議 wikilinks
5. 使用者確認 → 更新頁面
```

---

## 七、路徑對照表

### 7.1 Windows 路徑 vs WSL 路徑

| 元件 | Windows 路徑 | WSL 路徑 |
|------|-------------|----------|
| Skills 根目錄 | `d:\WSL\n8n\skills\` | `/mnt/d/WSL/n8n/skills/` |
| obsidian-vault-query | `d:\WSL\n8n\skills\obsidian-vault-query\` | `/mnt/d/WSL/n8n/skills/obsidian-vault-query/` |
| vault-manager | `d:\WSL\n8n\skills\vault-manager\` | `/mnt/d/WSL/n8n/skills/vault-manager/` |
| meta-index | `d:\WSL\n8n\skills\meta-index\` | `/mnt/d/WSL/n8n/skills/meta-index/` |
| obsidian-linker | `d:\WSL\n8n\skills\obsidian-linker\` | `/mnt/d/WSL/n8n/skills/obsidian-linker/` |
| obsidian-tagger | `d:\WSL\n8n\skills\obsidian-tagger\` | `/mnt/d/WSL/n8n/skills/obsidian-tagger/` |
| Vault 根目錄 | `D:\vaults\` | `/mnt/d/vaults/` |
| meta-vault | `D:\vaults\meta-vault\` | `/mnt/d/vaults/meta-vault/` |
| vault_manager.py | `D:\vaults\meta-vault\ops\scripts\vault_manager.py` | `/mnt/d/vaults/meta-vault/ops/scripts/vault_manager.py` |
| meta_linker.py | `D:\vaults\meta-vault\ops\scripts\meta_linker.py` | `/mnt/d/vaults/meta-vault/ops/scripts/meta_linker.py` |
| link_manager.py | `D:\vaults\rnd-vault\ops\scripts\link_manager.py` | `/mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py` |
| VAULT_REGISTRY.json | `D:\vaults\meta-vault\schema\VAULT_REGISTRY.json` | `/mnt/d/vaults/meta-vault/schema/VAULT_REGISTRY.json` |

### 7.2 Vault ID 對照

| ID | 名稱 | Emoji | 路徑（WSL） |
|----|------|-------|-------------|
| `life` | 生活 | 🏠 | /mnt/d/vaults/life-vault |
| `work` | 工作 | 💼 | /mnt/d/vaults/work-vault |
| `rnd` | 研發 | 🔬 | /mnt/d/vaults/rnd-vault |
| `humanities` | 人文 | 📚 | /mnt/d/vaults/humanities-vault |
| `science` | 科學 | 🔭 | /mnt/d/vaults/science-vault |
| `medicine` | 醫學 | 🏥 | /mnt/d/vaults/medicine-vault |
| `wellbeing` | 身心靈 | 🧘 | /mnt/d/vaults/wellbeing-vault |
| `meta` | 統合 | 🗂️ | /mnt/d/vaults/meta-vault |

### 7.3 執行命令速查

```bash
# ===== obsidian-vault-query =====
bash /mnt/d/WSL/n8n/skills/obsidian-vault-query/scripts/search-vaults.sh "關鍵詞" [vault_id]
bash /mnt/d/WSL/n8n/skills/obsidian-vault-query/scripts/list-vault.sh [vault_id]

# ===== vault-manager =====
bash /mnt/d/WSL/n8n/skills/vault-manager/scripts/init-vault.sh [vault_id|all]
bash /mnt/d/WSL/n8n/skills/vault-manager/scripts/health-check.sh

# ===== meta-index =====
bash /mnt/d/WSL/n8n/skills/meta-index/scripts/rebuild-meta-index.sh
bash /mnt/d/WSL/n8n/skills/meta-index/scripts/build-cross-links.sh

# ===== obsidian-linker =====
bash /mnt/d/WSL/n8n/skills/obsidian-linker/scripts/find-related.sh <vault_id|all> <keywords>
bash /mnt/d/WSL/n8n/skills/obsidian-linker/scripts/find-orphans.sh [vault_id|all]
bash /mnt/d/WSL/n8n/skills/obsidian-linker/scripts/find-backlinks.sh <page_name> [vault_id]

# ===== obsidian-tagger =====
bash /mnt/d/WSL/n8n/skills/obsidian-tagger/scripts/find-untagged.sh [vault_id|all]
bash /mnt/d/WSL/n8n/skills/obsidian-tagger/scripts/tag-report.sh [vault_id|all]

# ===== Python 管理腳本（需在 vault 目錄下執行或指定路徑）=====
python3 /mnt/d/vaults/meta-vault/ops/scripts/vault_manager.py list
python3 /mnt/d/vaults/meta-vault/ops/scripts/vault_manager.py status --all
python3 /mnt/d/vaults/meta-vault/ops/scripts/meta_linker.py sync
python3 /mnt/d/vaults/meta-vault/ops/scripts/meta_linker.py search "關鍵字"
python3 /mnt/d/vaults/meta-vault/ops/scripts/meta_linker.py cross-suggest
python3 /mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py scan --vault /mnt/d/vaults/rnd-vault
python3 /mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py broken --vault /mnt/d/vaults/rnd-vault
python3 /mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py fix --vault /mnt/d/vaults/rnd-vault
python3 /mnt/d/vaults/rnd-vault/ops/scripts/link_manager.py report --vault /mnt/d/vaults/rnd-vault
```

---

## 附錄：Skills 目錄結構

```
d:\WSL\n8n\skills\
├── obsidian-vault-query/
│   ├── SKILL.md
│   └── scripts/
│       ├── search-vaults.sh       # 全文搜尋
│       └── list-vault.sh          # 列出 vault 狀態
├── vault-manager/
│   ├── SKILL.md
│   └── scripts/
│       ├── init-vault.sh          # 初始化 vault 結構
│       └── health-check.sh        # 健康檢查
├── meta-index/
│   ├── SKILL.md
│   └── scripts/
│       ├── rebuild-meta-index.sh  # 重建全域索引
│       └── build-cross-links.sh   # 建立跨域連結
├── obsidian-linker/
│   ├── SKILL.md
│   └── scripts/
│       ├── find-related.sh        # 找相關頁面
│       ├── find-orphans.sh        # 找孤立頁面
│       └── find-backlinks.sh      # 找反向連結
├── obsidian-markdown/
│   └── SKILL.md                   # Obsidian 格式規範（無 scripts）
└── obsidian-tagger/
    ├── SKILL.md
    └── scripts/
        ├── find-untagged.sh       # 找未標籤頁面
        └── tag-report.sh          # 標籤統計
```

---

*文件版本: 2026-04-17 v2.0*
*Skills 位置: d:\WSL\n8n\skills\（WSL Ubuntu 映射）*
*附屬於: hermes_openclaw_obsidian_karpathy_n8n_explanation20260416.md*
