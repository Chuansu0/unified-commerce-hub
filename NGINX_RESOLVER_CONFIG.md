# nginx Resolver 配置說明

**建立日期**: 2026-03-12  
**目的**: 解決 nginx 啟動時 DNS 解析失敗的問題

---

## 問題說明

**錯誤訊息**：
```
[emerg] host not found in upstream "telegram-webhook.zeabur.internal"
```

**原因**：
- nginx 在啟動時會嘗試解析所有 `proxy_pass` 中的主機名稱
- 如果解析失敗，nginx 會拒絕啟動
- 在 Zeabur/Kubernetes 環境中，服務可能還未就緒

---

## 解決方案

使用 **resolver + 變數** 的方式，讓 nginx 在運行時動態解析 DNS：

```nginx
server {
    # 添加 DNS resolver
    resolver 10.96.0.10 valid=30s ipv6=off;
    resolver_timeout 5s;

    location /api/send-to-openclaw {
        # 使用變數存儲 upstream
        set $telegram_webhook telegram-webhook.zeabur.internal:3000;
        # 在 proxy_pass 中使用變數
        proxy_pass http://$telegram_webhook/api/send-to-openclaw;
    }
}
```

---

## Resolver IP 地址

### 當前配置
```nginx
resolver 10.96.0.10 valid=30s ipv6=off;
```

### 如何找到正確的 Resolver IP

**方法 1: 在容器中查看 /etc/resolv.conf**

```bash
# 在 Zeabur Terminal 中執行
cat /etc/resolv.conf
```

輸出範例：
```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
```

使用 `nameserver` 後面的 IP 地址。

**方法 2: 常見的 Resolver IP**

- Kubernetes: `10.96.0.10` (默認)
- Docker: `127.0.0.11`
- 公共 DNS: `8.8.8.8` (Google DNS)

### 如果 Resolver IP 不正確

如果 nginx 仍然無法啟動，嘗試以下步驟：

1. **查看容器的 DNS 配置**：
   ```bash
   cat /etc/resolv.conf
   ```

2. **更新 nginx.conf 中的 resolver**：
   ```nginx
   resolver <正確的IP> valid=30s ipv6=off;
   ```

3. **使用多個 resolver（備援）**：
   ```nginx
   resolver 10.96.0.10 8.8.8.8 valid=30s ipv6=off;
   ```

---

## 驗證配置

### 測試 nginx 配置語法

```bash
nginx -t
```

預期輸出：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 測試 DNS 解析

```bash
# 在 nginx 容器中執行
nslookup telegram-webhook.zeabur.internal
nslookup pocketbase-convo.zeabur.internal
```

---

## 當前配置摘要

所有需要動態解析的 upstream 都已使用變數：

1. **telegram-webhook** (5 個 locations)
   - `/webhook/telegram`
   - `/api/send-to-openclaw`
   - `/api/bind-telegram`
   - `/api/unbind-telegram`
   - `/api/telegram-status`

2. **PocketBase** (2 個 locations)
   - `/pb/`
   - `/_/`

---

**最後更新**: 2026-03-12 09:54 (UTC+8)
