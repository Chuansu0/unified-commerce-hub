# PocketBase Schema 修正

## 問題診斷

**錯誤：**
```
400 - Invalid filter parameters
```

**根本原因：**
messages collection 缺少 `sent_to_telegram` 欄位！

## 解決方案

需要在 messages collection 添加兩個欄位：

### 1. sent_to_telegram (布爾值)
- 類型：bool
- 預設值：false
- 用途：標記訊息是否已發送到 Telegram

### 2. sent_at (日期時間)
- 類型：datetime
- 可選：true
- 用途：記錄發送到 Telegram 的時間

## 手動添加欄位步驟

### 方法 1：透過 PocketBase Admin UI

1. 開啟 PocketBase Admin：https://www.neovega.cc/pb/_/
2. 登入
3. 點擊 **Collections** → **messages**
4. 點擊 **+ New field**

**添加 sent_to_telegram：**
- Field type: **Bool**
- Name: `sent_to_telegram`
- 勾選 **Optional**
- Default value: `false`
- 點擊 **Save**

**添加 sent_at：**
- Field type: **Date**
- Name: `sent_at`
- 勾選 **Optional**
- 點擊 **Save**

5. 點擊 **Save changes**

### 方法 2：透過 API（需要 Admin 權限）

```powershell
# 取得 Admin token（需要先登入）
$adminEmail = "your-admin@email.com"
$adminPassword = "your-password"

# 登入取得 token
$loginResponse = curl -X POST "https://www.neovega.cc/pb/api/admins/auth-with-password" `
  -H "Content-Type: application/json" `
  -d "{\"identity\":\"$adminEmail\",\"password\":\"$adminPassword\"}"

# 從回應中取得 token
# $token = ...

# 更新 messages collection schema
curl -X PATCH "https://www.neovega.cc/pb/api/collections/messages" `
  -H "Authorization: $token" `
  -H "Content-Type: application/json" `
  -d @pocketbase/messages_schema_update.json
```

## 驗證

添加欄位後，測試 API：

```powershell
curl "https://www.neovega.cc/pb/api/collections/messages/records?filter=sent_to_telegram=false&perPage=5"
```

應該回傳：
```json
{
  "page": 1,
  "perPage": 5,
  "totalItems": X,
  "totalPages": Y,
  "items": [...]
}
```

## 完成後

1. 重新測試 n8n workflow
2. 應該可以正常查詢未發送的訊息
3. 可以正常標記為已發送

## 注意事項

- 現有的訊息記錄，`sent_to_telegram` 會是 `false`（預設值）
- 這表示第一次執行 workflow 時，可能會發送所有歷史訊息
- 建議先手動將舊訊息標記為 `sent_to_telegram=true`
