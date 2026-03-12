# DNS 解析問題故障排除

**建立日期**: 2026-03-12  
**錯誤訊息**: `pocketbase-convo could not be resolved (3: Host not found)`

---

## 一、問題分析

### 1.1 錯誤詳情

```
2026/03/12 01:23:58 [error] 30#30: *2 pocketbase-convo could not be resolved (3: Host not found)
client: 10.42.0.1
server: localhost
request: "GET /pb/api/realtime HTTP/1.1"
host: "www.neovega.cc"
```

**問題**：
- nginx 無法解析 `pocketbase-convo` 主機名稱
- 這是 DNS 解析失敗

**可能原因**：
1. 服務名稱不正確
2. 服務不在同一個網路中
3. Zeabur 的服務發現機制不同
4. nginx 在服務啟動前嘗試解析

---

## 二、解決方案

### 方案 A: 確認服務名稱（推薦）

**步驟 1: 檢查 Zeabur 服務名稱**

1. 登入 Zeabur Dashboard
2. 查看 PocketBase 服務的名稱
3. 可能的名稱格式：
   - `pocketbase-convo`
   - `pocketbase`
   - `pocketbase-convo-xxxxx`（帶隨機後綴）

**步驟 2: 測試服務連線**

在 nginx 容器中執行：
```bash
# 進入 nginx 容器
docker exec -it <nginx_container_id> sh

# 或在 Zeabur 中使用 Terminal

# 測試 DNS 解析
nslookup pocketbase-convo
ping pocketbase-convo

# 測試 HTTP 連線
curl http://pocketbase-convo:8090/api/health
```

**步驟 3: 更新 nginx.conf**

如果服務名稱不同，更新配置：
```nginx
location /pb/ {
    proxy_pass http://<正確的服務名稱>:8090/;
    # ...
}
```

---

### 方案 B: 使用 Zeabur 內部 URL

Zeabur 可能提供內部服務 URL。

**步驟 1: 查找內部 URL**

1. 在 Zeabur Dashboard 中查看 PocketBase 服務
2. 查找 "Internal URL" 或 "Private URL"
3. 格式可能是：
   - `http://pocketbase-convo.zeabur.internal:8090`
   - `http://pocketbase-convo.svc.cluster.local:8090`

**步驟 2: 更新 nginx.conf**

```nginx
location /pb/ {
    proxy_pass http://pocketbase-convo.zeabur.internal:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /_/ {
    proxy_pass http://pocketbase-convo.zeabur.internal:8090/_/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

### 方案 C: 使用環境變數

將 PocketBase URL 設定為環境變數，避免硬編碼。

**步驟 1: 在 Zeabur 設定環境變數**

為 nginx 服務添加環境變數：
```
POCKETBASE_URL=http://pocketbase-convo:8090
```

**步驟 2: 修改 nginx 配置使用環境變數**

這需要使用 `envsubst` 或類似工具在啟動時替換變數。

創建 `nginx.conf.template`:
```nginx
location /pb/ {
    proxy_pass ${POCKETBASE_URL}/;
    # ...
}
```

在 Dockerfile 中添加啟動腳本：
```dockerfile
CMD envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'
```

---

### 方案 D: 使用 Zeabur 的服務連結功能

Zeabur 可能提供服務連結功能，自動注入環境變數。

**步驟 1: 在 Zeabur 中連結服務**

1. 進入 nginx 服務設定
2. 查找 "Service Links" 或"服務連結"
3. 連結到 PocketBase 服務
4. Zeabur 會自動注入環境變數，如：
   - `POCKETBASE_CONVO_HOST`
   - `POCKETBASE_CONVO_PORT`
   - `POCKETBASE_CONVO_URL`

**步驟 2: 使用注入的環境變數**

查看 Zeabur 文件了解具體的環境變數名稱。

---

### 方案 E: 直接代理到外部 URL（臨時方案）

如果 PocketBase 有公開的 URL，可以直接代理。

**注意**: 這不是最佳方案，因為會增加延遲和安全風險。

```nginx
location /pb/ {
    proxy_pass https://pocketbase-convo.zeabur.app/;
    proxy_ssl_server_name on;
    proxy_set_header Host pocketbase-convo.zeabur.app;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 三、診斷步驟

### 3.1 檢查服務狀態

```bash
# 1. 列出所有服務
# 在 Zeabur Dashboard 中查看

# 2. 檢查 PocketBase 服務是否運行
# 查看 PocketBase 服務的日誌

# 3. 檢查 nginx 服務日誌
# 查看完整的錯誤訊息
```

### 3.2 測試網路連線

```bash
# 在 nginx 容器中執行

# 測試 DNS 解析
nslookup pocketbase-convo
nslookup pocketbase

# 測試網路連線
ping pocketbase-convo
telnet pocketbase-convo 8090

# 測試 HTTP 連線
curl -v http://pocketbase-convo:8090/api/health
curl -v http://pocketbase:8090/api/health
```

### 3.3 檢查 Docker 網路（如果使用 Docker）

```bash
# 列出網路
docker network ls

# 檢查網路詳情
docker network inspect <network_name>

# 檢查容器網路
docker inspect <container_id> | grep NetworkMode
docker inspect <container_id> | grep IPAddress
```

---

## 四、快速修復腳本

### 4.1 服務名稱檢測腳本

創建 `scripts/detect-pocketbase.sh`:

```bash
#!/bin/bash

echo "Detecting PocketBase service..."

# 嘗試不同的服務名稱
NAMES=(
    "pocketbase-convo"
    "pocketbase"
    "pocketbase-convo.zeabur.internal"
    "pocketbase.zeabur.internal"
)

for name in "${NAMES[@]}"; do
    echo "Trying: $name"
    if curl -s --connect-timeout 2 "http://$name:8090/api/health" > /dev/null 2>&1; then
        echo "✅ Found: $name"
        echo "Use this in nginx.conf: http://$name:8090"
        exit 0
    fi
done

echo "❌ PocketBase service not found"
echo "Please check service name in Zeabur Dashboard"
```

### 4.2 nginx 配置測試腳本

創建 `scripts/test-nginx-config.sh`:

```bash
#!/bin/bash

echo "Testing nginx configuration..."

# 測試配置語法
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ nginx configuration is valid"
else
    echo "❌ nginx configuration has errors"
    exit 1
fi

# 重新載入配置
nginx -s reload

echo "✅ nginx configuration reloaded"
```

---

## 五、推薦的配置（基於 Zeabur 最佳實踐）

### 5.1 選項 1: 使用簡短服務名稱

```nginx
location /pb/ {
    proxy_pass http://pocketbase-convo:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5.2 選項 2: 使用完整的內部域名

```nginx
location /pb/ {
    proxy_pass http://pocketbase-convo.zeabur.internal:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5.3 選項 3: 使用 resolver（如果需要動態解析）

```nginx
location /pb/ {
    resolver 127.0.0.11 valid=30s;  # Docker 內部 DNS
    set $pocketbase http://pocketbase-convo:8090;
    proxy_pass $pocketbase/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 六、Zeabur 特定配置

### 6.1 檢查 Zeabur 文件

參考 Zeabur 官方文件：
- [服務間通訊](https://zeabur.com/docs/deploy/service-communication)
- [環境變數](https://zeabur.com/docs/deploy/environment-variables)
- [網路配置](https://zeabur.com/docs/deploy/networking)

### 6.2 常見的 Zeabur 服務名稱格式

```
# 格式 1: 服務名稱
pocketbase-convo

# 格式 2: 服務名稱.內部域名
pocketbase-convo.zeabur.internal

# 格式 3: 服務名稱.命名空間.svc.cluster.local
pocketbase-convo.default.svc.cluster.local
```

### 6.3 使用 Zeabur CLI 檢查

```bash
# 安裝 Zeabur CLI
npm install -g @zeabur/cli

# 登入
zeabur login

# 列出服務
zeabur service list

# 查看服務詳情
zeabur service info <service_name>
```

---

## 七、下一步行動

### 7.1 立即執行

1. ✅ 在 Zeabur Dashboard 中確認 PocketBase 服務名稱
2. ⏳ 在 nginx 容器中測試連線
3. ⏳ 根據測試結果更新 nginx.conf
4. ⏳ 重啟 nginx 服務
5. ⏳ 驗證配置

### 7.2 如果問題持續

1. 聯繫 Zeabur 支援
2. 查看 Zeabur 文件中的服務間通訊章節
3. 考慮使用外部 URL（臨時方案）
4. 檢查防火牆和網路策略

---

**最後更新**: 2026-03-12 09:27 (UTC+8)
