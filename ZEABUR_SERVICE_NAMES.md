# Zeabur 服務名稱配置指南

**建立日期**: 2026-03-12  
**目的**: 找到正確的 Zeabur 內部服務名稱

---

## 問題說明

nginx 無法解析 `telegram-webhook.zeabur.internal`：
```
telegram-webhook.zeabur.internal could not be resolved (3: Host not found)
```

**可能原因**：
1. 服務名稱不正確
2. 需要使用簡短名稱（不帶 `.zeabur.internal`）
3. 服務尚未部署或未就緒

---

## 步驟 1: 執行 DNS 測試

在 Zeabur nginx 容器的 Terminal 中執行：

```bash
bash test-dns-resolution.sh
```

或手動測試：

```bash
# 測試完整域名
nslookup telegram-webhook.zeabur.internal
nslookup pocketbase-convo.zeabur.internal

# 測試簡短名稱
nslookup telegram-webhook
nslookup pocketbase-convo
```

---

## 步驟 2: 檢查 Zeabur 服務名稱

1. 登入 [Zeabur Dashboard](https://zeabur.com)
2. 選擇您的專案
3. 查看所有服務的名稱

**重要**: 記錄每個服務在 Zeabur 中的確切名稱。

---

## 步驟 3: 確定正確的服務名稱格式

根據測試結果，可能的格式：

### 格式 A: 簡短名稱（推薦先試）
```nginx
set $telegram_webhook telegram-webhook:3000;
set $pocketbase pocketbase-convo:8090;
```

### 格式 B: 完整域名
```nginx
set $telegram_webhook telegram-webhook.zeabur.internal:3000;
set $pocketbase pocketbase-convo.zeabur.internal:8090;
```

### 格式 C: 使用 Zeabur 提供的內部 URL
檢查 Zeabur Dashboard → 服務 → "Internal URL" 或 "Private URL"

---

## 步驟 4: 更新 nginx.conf

根據測試結果更新 nginx.conf。

**範例**：如果簡短名稱可以解析，則使用：

```nginx
location /api/send-to-openclaw {
    set $telegram_webhook telegram-webhook:3000;
    proxy_pass http://$telegram_webhook/api/send-to-openclaw;
}
```

---

## 常見問題

### Q: PocketBase 可以解析，但 telegram-webhook 不行？

**可能原因**：
- telegram-webhook 服務尚未部署
- 服務名稱在 Zeabur 中不是 `telegram-webhook`

**解決方法**：
1. 檢查 Zeabur Dashboard 確認服務已部署
2. 確認服務的確切名稱
3. 嘗試使用簡短名稱

### Q: 如何測試服務是否可訪問？

在 nginx 容器中：
```bash
# 測試 telegram-webhook
curl http://telegram-webhook:3000/health
curl http://telegram-webhook.zeabur.internal:3000/health

# 測試 PocketBase
curl http://pocketbase-convo:8090/api/health
curl http://pocketbase-convo.zeabur.internal:8090/api/health
```

---

**下一步**: 執行 `test-dns-resolution.sh` 並將結果提供給開發人員。
