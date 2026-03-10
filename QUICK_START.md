# 🚀 NeoVega 快速開始

使用 PocketBase 作為統一後端的電商 + 對話系統。

---

## 系統需求

- Node.js 18+
- PocketBase 0.23+ （或使用 Docker）
- pnpm / npm / bun

---

## 步驟 1：安裝依賴

```bash
npm install
```

---

## 步驟 2：啟動 PocketBase

### 方式 A：使用 Docker（推薦）

```bash
# 建立 PocketBase 資料目錄
mkdir -p pocketbase/data

# 啟動 PocketBase
docker run -d \
  --name pocketbase \
  -p 8090:8090 \
  -v $(pwd)/pocketbase/data:/pb_data \
  -v $(pwd)/pocketbase/schema.json:/pb_schema.json \
  ghcr.io/muchobien/pocketbase:latest
```

### 方式 B：下載執行檔

1. 從 https://pocketbase.io/docs/ 下載對應版本
2. 解壓縮到 `pocketbase/` 目錄
3. 執行 `./pocketbase serve --http=0.0.0.0:8090`

---

## 步驟 3：匯入 Schema

1. 開啟 PocketBase Admin UI：http://localhost:8090/_/
2. 建立管理員帳號
3. 匯入 `pocketbase/schema.json`（或手動建立 collections）

### 主要 Collections

| Collection | 說明 |
|------------|------|
| `users` | 用戶（含 Telegram 綁定） |
| `products` | 商品資料 |
| `orders` | 訂單 |
| `conversations` | 對話 |
| `messages` | 訊息 |
| `telegram_bind_codes` | Telegram 綁定碼 |

---

## 步驟 4：設定環境變數

建立 `.env.local`：

```env
VITE_POCKETBASE_URL=/pb
# 或使用完整 URL（開發時）
# VITE_POCKETBASE_URL=http://localhost:8090
```

### Nginx 反向代理範例

```nginx
location /pb/ {
    proxy_pass http://localhost:8090/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

---

## 步驟 5：啟動前端開發伺服器

```bash
npm run dev
```

開啟 http://localhost:5173

---

## 步驟 6：設定 Superadmin

在 PocketBase Admin UI 中：
1. 建立 `users` collection 後
2. 新增一筆記錄
3. 設定 `role = "superadmin"`
4. 使用該帳號登入前端

---

## Telegram 整合（選用）

### Bot 資訊

- **Bot 用戶名**: @neovegainsforge_bot
- 需設置 Webhook 指向 PocketBase 的 Telegram hook

詳細設定請參考 `TELEGRAM_SETUP.md`。

---

## 專案結構

```
├── pocketbase/
│   ├── schema.json      # PocketBase schema 定義
│   └── README.md        # PocketBase 設定說明
├── src/
│   ├── services/
│   │   ├── pocketbase.ts  # SDK 初始化 + 型別
│   │   ├── auth.ts        # 認證服務
│   │   ├── products.ts    # 商品 API
│   │   └── orders.ts      # 訂單 API
│   └── pages/             # 頁面元件
└── QUICK_START.md        # 本文件
```

---

## 常見問題

### Q: PocketBase 連線失敗

確認：
1. PocketBase 正在執行（http://localhost:8090/_/）
2. `VITE_POCKETBASE_URL` 設定正確
3. 如果透過反向代理，確認 Nginx/Caddy 設定正確

### Q: 無法登入

確認：
1. `users` collection 已建立
2. 用戶的 `is_active = true`
3. 密碼正確

### Q: 權限錯誤

在 PocketBase Admin UI 中檢查 Collection 的 API Rules 設定。

---

## 下一步

- 設定 AI 服務（OpenClaw / LLM API）在「設定」頁面
- 新增商品
- 測試對話功能

祝你使用愉快！🎉