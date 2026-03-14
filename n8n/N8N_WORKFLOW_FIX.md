# n8n Workflow 錯誤修復指南

## 問題 1：404 錯誤

n8n workflow `webchat-umio-integration` 出現 404 錯誤：

```
404 - "{"code":404,"message":"The requested resource wasn't found.","data":{}}"
```

### 錯誤原因

原始的 workflow 有以下問題：

1. **欄位名稱錯誤**：使用了 `session_id` 而不是 `guest_session_id`
2. **缺少必需的 `conversation` 欄位**：`messages` collection 需要 `conversation` relation
3. **沒有先建立 conversation**：必須先建立 conversations 記錄，才能儲存 messages

---

## 問題 2：403 權限錯誤

```
403 - "{"code":403,"message":"Only admins can perform this action.","data":{}}"
```

### 錯誤原因

PocketBase collections 的 API 規則設定為僅 Admin 可存取，但 HTTP Request 節點沒有提供 Admin Token。

---

## 問題 3：環境變數訪問被拒

```
access to env vars denied
If you need access please contact the administrator to remove the environment variable 'N8N_BLOCK_ENV_ACCESS_IN_NODE'
```

### 錯誤原因

n8n 的安全設定 `N8N_BLOCK_ENV_ACCESS_IN_NODE` 阻擋了使用 `$env` 變數。

---

## 修正方案：使用 n8n Variables

由於 n8n 無法直接使用環境變數，我們改用 **n8n Variables** 來儲存 Admin Token。

### 步驟 1：在 n8n 中設定 Variable

1. 點擊左側導航欄的 **Settings** → **Variables**
2. 點擊 **Add Variable**
3. 填寫：
   - **Key**: `PB_ADMIN_TOKEN`
   - **Value**: `YOUR_POCKETBASE_ADMIN_TOKEN`（不需要 Bearer 前綴）

### 步驟 2：Workflow 使用 Variables

HTTP Request 節點使用運算式：

```
={{ 'Bearer ' + $vars.PB_ADMIN_TOKEN }}
```

---

## 修正後的 Workflow JSON

已更新 `webchat-umio-integration-workflow-fixed.json`，所有 HTTP Request 節點改為使用 `$vars.PB_ADMIN_TOKEN`：

```json
{
  "parameters": {
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "={{ 'Bearer ' + $vars.PB_ADMIN_TOKEN }}"
        }
      ]
    }
  }
}
```

---

## 如何取得 PocketBase Admin Token

1. 登入 PocketBase Admin UI (`https://pocketbase-convo.zeabur.app/_/`)
2. 點擊左下角 **Settings** → **Admin**
3. 複製 **Token** 欄位的值
4. 在 n8n Variables 中使用這個值（不需要加 `Bearer `）

---

## 部署步驟

1. **在 n8n 中設定 Variable**：
   - 前往 **Settings** → **Variables**
   - Add Variable: Key=`PB_ADMIN_TOKEN`, Value=`YOUR_TOKEN`

2. **刪除舊的 workflow**：刪除 "WebChat Umio Integration"

3. **匯入修正後的 workflow**：`webchat-umio-integration-workflow-fixed.json`

4. **設定 Telegram API credentials**（如果還沒設定）

5. **啟用 workflow**

6. **測試發送訊息**

---

## 測試

使用 curl 測試：

```bash
curl -X POST https://www.neovega.cc/api/webhook/umio-chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-fix-001",
    "message": "測試訊息",
    "platform": "webchat"
  }'
```

預期結果：
- ✅ 查詢/建立 conversation 記錄
- ✅ 儲存 user message 到 PocketBase
- ✅ 發送到 Telegram 群組
- ✅ 返回成功回應

---

## 常見錯誤排查

| 錯誤 | 原因 | 解決方案 |
|------|------|----------|
| 403 Forbidden | 缺少 Admin Token | 在 n8n Variables 中設定 `PB_ADMIN_TOKEN` |
| access to env vars denied | 使用 `$env` 而非 `$vars` | 改用 `$vars.PB_ADMIN_TOKEN` |
| 404 Not Found | 欄位名稱錯誤或缺少 relation | 使用正確的 `guest_session_id` 和 `conversation` 欄位 |
| 400 Bad Request | 缺少必填欄位 | 確保所有必填欄位都有值 |

---

## Variables 與 Credentials 的選擇

| 方法 | 優點 | 缺點 |
|------|------|------|
| **Variables** (`$vars`) | 設定簡單，直接在 n8n UI 中管理 | 需要手動在 UI 中設定 |
| **Credentials** | 更安全，支援加密儲存 | 設定較複雜，需要正確綁定到節點 |

**建議**：使用 Variables 方法，因為：
1. 設定更簡單
2. 不需要處理 credential ID 綁定問題
3. 適合 Admin Token 這種相對靜態的配置
