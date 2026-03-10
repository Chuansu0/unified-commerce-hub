# Web Chat CORS 問題診斷與修正計畫

**日期**：2026-03-10  
**狀態**：已修正，待測試驗證  
**負責人**：Claude Sonnet 4（透過 Chrome 操作驗證）

## 4. 測試驗證流程（Claude Sonnet 4 執行）

### 4.1 準備工作

1. **確認部署完成**：
   - 檢查 www.neovega.cc 是否已更新
   - 確認新版本已上線

2. **開啟 Chrome DevTools**：
   - 按 F12 開啟開發者工具
   - 切換到 Console 標籤
   - 切換到 Network 標籤

### 4.2 測試步驟

**步驟 1：訪問網站**
```
URL: https://www.neovega.cc/shop
```

**步驟 2：開啟聊天視窗**
- 點擊右下角的聊天圖示
- 確認聊天視窗開啟

**步驟 3：發送測試訊息**
```
測試訊息：你好，請問有什麼書籍推薦？
```

**步驟 4：觀察 Network 請求**
- 在 Network 標籤中找到 `hooks/agent` 請求
- 確認請求 URL 為：`https://www.neovega.cc/api/openclaw/hooks/agent`
- 確認狀態碼為 200
- 確認沒有 CORS 錯誤

**步驟 5：檢查 Console**
- 確認沒有 CORS 錯誤訊息
- 確認沒有 "Backend API 失敗" 的警告（未登入用戶正常）
- 確認收到 AI 回覆

### 4.3 預期結果

✅ **成功指標**：
- Network 請求使用 `/api/openclaw/hooks/agent` 路徑
- 狀態碼 200
- 無 CORS 錯誤
- AI 正常回覆

❌ **失敗指標**：
- 仍然出現 CORS 錯誤
- 請求 URL 仍是 `https://openclaw.neovega.cc/`
- 無法收到 AI 回覆

### 4.4 問題排查

如果測試失敗，檢查：

1. **快取問題**：
   - 清除瀏覽器快取（Ctrl+Shift+Delete）
   - 硬性重新整理（Ctrl+F5）

2. **部署問題**：
   - 確認新版本已部署
   - 檢查 Docker 容器是否重啟
   - 檢查 Zeabur 部署日誌

3. **配置問題**：
   - 確認 nginx.conf 正確載入
   - 檢查 OpenClaw URL 配置

---

## 5. 後續優化建議

### 5.1 監控與日誌

建議添加：
- API 請求日誌
- 錯誤追蹤（Sentry）
- 效能監控

### 5.2 替代方案（未來考慮）

如果需要更靈活的配置，可考慮：

**方案 B：OpenClaw CORS 配置**
- 在 Zeabur 的 OpenClaw 服務中添加環境變數
- 設定 `CORS_ALLOWED_ORIGINS=https://www.neovega.cc`
- 優點：前端可直接調用，無需代理
- 缺點：需要重新部署 OpenClaw

**方案 C：API Gateway**
- 使用專用的 API Gateway（如 Kong、Traefik）
- 統一管理所有 API 路由和 CORS
- 優點：更專業、更靈活
- 缺點：增加架構複雜度

---

## 6. 總結

### 6.1 修正內容

- ✅ 恢復 `src/services/api.ts` 中的代理轉換邏輯
- ✅ 利用現有 nginx 代理避免 CORS
- ✅ 無需修改 OpenClaw 配置

### 6.2 影響範圍

- 前端聊天功能
- OpenClaw API 調用
- 未登入用戶體驗

### 6.3 風險評估

- 🟢 低風險：只修改前端邏輯
- 🟢 可回滾：如有問題可快速回滾
- 🟢 無破壞性：不影響其他功能

---

## 7. OpenClaw API 認證

### 7.1 Gateway Token

根據 Zeabur OpenClaw 環境變數配置，webhook 請求需要使用 **`OPENCLAW_GATEWAY_TOKEN`** 進行認證。

**環境變數**：`OPENCLAW_GATEWAY_TOKEN`
**值**：`FCo0g2jyi864v9VxEqOw753GSbkdWn1X`

### 7.2 測試 Webhook 請求

```bash
curl -X POST https://www.neovega.cc/api/openclaw/hooks/agent \
  -H "Authorization: Bearer FCo0g2jyi864v9VxEqOw753GSbkdWn1X" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "請回覆這條訊息",
    "sessionKey": "webhook-session",
    "deliver": true
  }'
```

### 7.3 前端配置

需要在 AI Settings 中配置 API Key：

**位置**：Settings頁面 → OpenClaw 設定 → API Key  
**值**：`FCo0g2jyi864v9VxEqOw753GSbkdWn1X`

---

**文件版本**：v1.1  
**最後更新**：2026-03-10 21:39
## 1. 問題診斷

### 1.1 錯誤訊息

```
Access to fetch at 'https://openclaw.neovega.cc/' from origin 'https://www.neovega.cc' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 1.2 根本原因

1. **前端直接調用外部 API**：
   - 前端在 `www.neovega.cc` 域名
   - OpenClaw 在 `openclaw.neovega.cc` 域名
   - 瀏覽器阻止跨域請求（CORS 限制）

2. **代理配置未被使用**：
   - nginx.conf 已配置代理：`/api/openclaw/` → `https://openclaw.neovega.cc/`
   - 但 `src/services/api.ts` 中的代理轉換邏輯被移除
   - 導致前端不使用 nginx 代理

### 1.3 時間線

- **之前**：`api.ts` 有自動轉換邏輯，將外部 URL 轉為 `/api/openclaw/hooks/agent`
- **修改後**：移除轉換邏輯，直接使用外部 URL
- **結果**：觸發 CORS 錯誤

---

## 2. 解決方案

### 2.1 修正策略

**恢復使用 nginx 代理**（最簡單、最快速）

**優點**：
- ✅ 不需要修改 OpenClaw 配置
- ✅ 利用現有 nginx 代理
- ✅ 無需重新部署 OpenClaw
- ✅ 立即生效

### 2.2 程式碼修正

**檔案**：`src/services/api.ts`

**修正內容**：
```typescript
export async function callOpenClaw(req: OpenClawRequest, settings?: AISettings): Promise<OpenClawResponse> {
  let url = settings?.openclaw?.agentUrl || config.openclaw.agentUrl;
  if (!url) throw new Error("OpenClaw Agent URL 未設定，請至 Settings 頁面設定");

  // 如果是外部 OpenClaw URL，使用 nginx 代理避免 CORS
  if (url.includes("openclaw.neovega.cc") || url.includes("openclaw.zeabur.internal")) {
    url = "/api/openclaw/hooks/agent";
  }

  // ... 其餘程式碼
}
```

**關鍵邏輯**：
- 檢測 URL 是否包含 `openclaw.neovega.cc` 或 `openclaw.zeabur.internal`
- 如果是，轉換為相對路徑 `/api/openclaw/hooks/agent`
- nginx 會將此路徑代理到 `https://openclaw.neovega.cc/hooks/agent`

---

## 3. 部署流程

### 3.1 Build 專案

```bash
npm run build
```

### 3.2 驗證 Build 產物

檢查 `dist/` 目錄是否正確生成。

### 3.3 部署到生產環境

根據您的部署方式（Zeabur / Docker）：

**Docker 方式**：
```bash
docker build -t neovega-web .
docker push <registry>/neovega-web:latest
# 重新啟動容器
```

**Zeabur 方式**：
```bash
git add .
git commit -m "fix: 修正 CORS 問題，恢復 nginx 代理"
git push origin main
# Zeabur 會自動部署
```

---