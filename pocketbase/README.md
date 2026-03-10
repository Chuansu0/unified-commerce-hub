# PocketBase 設定指南

本專案使用 PocketBase 作為後端資料庫服務。

## 快速開始

### 1. 下載並啟動 PocketBase

```bash
# 從 https://pocketbase.io/docs/ 下載對應平台的版本
# Windows
pocketbase.exe serve

# macOS/Linux
./pocketbase serve
```

預設會在 `http://127.0.0.1:8090` 啟動服務。

### 2. 建立管理員帳號

首次啟動後，前往 `http://127.0.0.1:8090/_/` 建立管理員帳號。

### 3. 建立集合（Collections）

根據 `schema.json` 的定義，在 PocketBase 管理後台建立以下集合：

#### users（auth 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| name | text | 否 |
| avatar | file | 否 |
| role | select (admin/manager/customer) | 否 |
| phone | text | 否 |

#### products（base 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| name | text | 是 |
| name_en | text | 否 |
| description | text | 否 |
| price | number | 是 |
| original_price | number | 否 |
| image | file | 否 |
| images | file (max 5) | 否 |
| category | select | 否 |
| status | select | 是 |
| stock | number | 否 |
| sku | text | 否 |
| featured | bool | 否 |
| tags | json | 否 |
| attributes | json | 否 |

#### orders（base 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| order_no | text | 是 |
| user | relation (users) | 否 |
| username | text | 否 |
| email | email | 否 |
| phone | text | 否 |
| items | json | 是 |
| total | number | 是 |
| status | select | 是 |
| payment_method | text | 否 |
| payment_status | select | 否 |
| shipping_address | json | 否 |
| notes | text | 否 |

#### conversations（base 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| user | relation (users) | 否 |
| telegram_chat_id | text | 否 |
| platform | select | 是 |
| status | select | 否 |
| last_message | text | 否 |
| last_message_at | datetime | 否 |
| unread_count | number | 否 |
| metadata | json | 否 |

#### messages（base 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| conversation | relation (conversations) | 是 |
| sender | select | 是 |
| content | text | 是 |
| intent | text | 否 |
| metadata | json | 否 |

#### members（base 類型）
| 欄位 | 類型 | 必填 |
|------|------|------|
| user | relation (users) | 否 |
| points | number | 否 |
| tier | select | 否 |
| total_spent | number | 否 |
| total_orders | number | 否 |
| birth_date | date | 否 |
| preferences | json | 否 |

### 4. 設定 API 規則（API Rules）

為每個集合設定適當的存取規則：

#### 建議的 API 規則

**users（auth）**
- List/View: `id = @request.auth.id`（只能看自己）
- Create: 空字串（公開註冊）
- Update/Delete: `id = @request.auth.id`

**products**
- List/View: 空字串（公開）
- Create/Update/Delete:（需管理員權限，後台設定）

**orders**
- List: `user = @request.auth.id`
- View: `user = @request.auth.id`
- Create: 空字串（允許訪客下單）或 `@request.auth.id != ""`
- Update: 管理員或訂單擁有者

**conversations/messages**
- List/View: `user = @request.auth.id`
- Create: `user = @request.auth.id`
- Update/Delete: `user = @request.auth.id`

### 5. 前端環境變數

在 `.env` 或 `.env.local` 設定：

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

### 6. 部署 PocketBase

#### Zeabur 部署

1. 在 Zeabur 建立 PocketBase 服務（使用預設 template）
2. 設定環境變數
3. 更新前端的 `VITE_POCKETBASE_URL`

#### Docker 部署

```dockerfile
FROM ghcr.io/muchobien/pocketbase:latest

EXPOSE 8090
```

## 架構優勢

1. **前後端分離**：前端直接連接 PocketBase，無需中間層
2. **即時功能**：PocketBase 內建 Realtime subscriptions
3. **簡化部署**：只需維護一個 PocketBase 服務
4. **檔案儲存**：PocketBase 內建檔案上傳功能
5. **認證系統**：內建完整的 auth 系統

## 資料遷移

如果您有現有 PostgreSQL 資料需要遷移：

1. 從 PostgreSQL 匯出資料為 JSON
2. 使用 PocketBase Admin UI 或 API 匯入
3. 確保關聯欄位的 ID 正確對應