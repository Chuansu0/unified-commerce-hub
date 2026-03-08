# NeoVega 後端 API — Zeabur 部署指南

## 架構概覽

```
┌─────────────┐       POST /api/auth/login        ┌──────────────────┐
│  NeoVega    │  ──────────────────────────────►  │  Zeabur Backend  │
│  Frontend   │  ◄──────────────────────────────  │  (Node.js)       │
│  (Lovable)  │    { success, role, message }     │                  │
└─────────────┘                                    └──────────────────┘
                                                     ▲
                                                     │ 讀取環境變數
                                                     │ ROOT_ID
                                                     │ ROOT_PASSWORD
```

## 環境變數設定

在 Zeabur 專案的「Variables」頁面中新增：

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `ROOT_ID` | 超級管理員帳號 | `admin` |
| `ROOT_PASSWORD` | 超級管理員密碼 | `YourStr0ngP@ss!` |
| `PORT` | 服務埠號（Zeabur 自動設定） | `3000` |
| `JWT_SECRET` | JWT 簽名密鑰（未來擴充用） | `your-jwt-secret-key` |
| `CORS_ORIGIN` | 前端網域（限制跨域存取） | `https://your-app.lovable.app` |

## 前端環境變數

在 Lovable 專案中設定：

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `VITE_AUTH_API_URL` | Zeabur 後端 API 網址 | `https://your-backend.zeabur.app` |

---

## 專案結構

```
backend/
├── server.js          # 主程式入口
├── package.json       # 依賴與啟動腳本
├── .env.example       # 環境變數範例
├── middleware/
│   └── cors.js        # CORS 中介層
├── routes/
│   └── auth.js        # 認證路由
├── utils/
│   └── response.js    # 統一回應格式
└── README.md          # 本文件
```

---

## API 規格

### `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "role": "superadmin",
  "message": "登入成功"
}
```

**Failure Response (401):**
```json
{
  "success": false,
  "role": "guest",
  "message": "帳號或密碼錯誤"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "role": "guest",
  "message": "請提供帳號與密碼"
}
```

### `GET /api/health`

健康檢查端點，Zeabur 用於偵測服務是否正常。

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

---

## CLINE 協作指引

當你把此專案 clone 到本地後，請告訴 CLINE：

> 這是 NeoVega 電商平台的後端認證 API，部署在 Zeabur 上。
> 請基於現有的 `server.js` 擴充以下功能：
>
> 1. **JWT Token 機制** — 登入成功後簽發 JWT，前端後續請求帶 Bearer Token
> 2. **用戶註冊** — `POST /api/auth/register`，將用戶資料存入資料庫
> 3. **密碼重設** — `POST /api/auth/forgot-password` 發送重設信件
> 4. **資料庫整合** — 接入 PostgreSQL 或 MongoDB 管理用戶資料
> 5. **商品 CRUD API** — `GET/POST/PUT/DELETE /api/products`
> 6. **訂單管理 API** — `GET/POST /api/orders`
> 7. **Rate Limiting** — 防止暴力破解登入
> 8. **Input Validation** — 使用 zod 或 joi 驗證所有輸入

---

## 部署到 Zeabur

1. 將 `backend/` 資料夾推送到 GitHub 倉庫
2. 在 Zeabur Dashboard 建立新專案
3. 連結 GitHub 倉庫，選擇 `backend/` 為 Root Directory
4. 設定環境變數（見上方表格）
5. Zeabur 會自動偵測 Node.js 並部署
6. 取得部署網址，填入前端 `VITE_AUTH_API_URL`

---

## 安全注意事項

- ⚠️ `ROOT_ID` / `ROOT_PASSWORD` 僅存在 Zeabur 環境變數中，**絕不**寫入程式碼
- ⚠️ 正式環境務必設定 `CORS_ORIGIN` 限制來源網域
- ⚠️ 密碼比對使用 `crypto.timingSafeEqual` 防止 timing attack
- ⚠️ 未來應加入 JWT + refresh token 機制取代 session 驗證
