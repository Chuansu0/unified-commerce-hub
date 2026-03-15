# DNS è§???é??…é??’é™¤

**å»ºç??¥æ?**: 2026-03-12  
**?¯èª¤è¨Šæ¯**: `pocketbase-convo could not be resolved (3: Host not found)`

---

## ä¸€?å?é¡Œå???

### 1.1 ?¯èª¤è©³æ?

```
2026/03/12 01:23:58 [error] 30#30: *2 pocketbase-convo could not be resolved (3: Host not found)
client: 10.42.0.1
server: localhost
request: "GET /pb/api/realtime HTTP/1.1"
host: "www.neovega.cc"
```

**?é?**ï¼?
- nginx ?¡æ?è§?? `pocketbase-convo` ä¸»æ??ç¨±
- ?™æ˜¯ DNS è§??å¤±æ?

**?¯èƒ½?Ÿå?**ï¼?
1. ?å??ç¨±ä¸æ­£ç¢?
2. ?å?ä¸åœ¨?Œä??‹ç¶²è·¯ä¸­
3. Zeabur ?„æ??™ç™¼?¾æ??¶ä???
4. nginx ?¨æ??™å??•å??—è©¦è§??

---

## äºŒã€è§£æ±ºæ–¹æ¡?

### ?¹æ? A: ç¢ºè??å??ç¨±ï¼ˆæ¨?¦ï?

**æ­¥é? 1: æª¢æŸ¥ Zeabur ?å??ç¨±**

1. ?»å…¥ Zeabur Dashboard
2. ?¥ç? PocketBase ?å??„å?ç¨?
3. ?¯èƒ½?„å?ç¨±æ ¼å¼ï?
   - `pocketbase-convo`
   - `pocketbase`
   - `pocketbase-convo-xxxxx`ï¼ˆå¸¶?¨æ?å¾Œç¶´ï¼?

**æ­¥é? 2: æ¸¬è©¦?å????**

??nginx å®¹å™¨ä¸­åŸ·è¡Œï?
```bash
# ?²å…¥ nginx å®¹å™¨
docker exec -it <nginx_container_id> sh

# ?–åœ¨ Zeabur ä¸­ä½¿??Terminal

# æ¸¬è©¦ DNS è§??
nslookup pocketbase-convo
ping pocketbase-convo

# æ¸¬è©¦ HTTP ???
curl http://pocketbase-convo:8090/api/health
```

**æ­¥é? 3: ?´æ–° nginx.conf**

å¦‚æ??å??ç¨±ä¸å?ï¼Œæ›´?°é?ç½®ï?
```nginx
location /pb/ {
    proxy_pass http://<æ­?¢º?„æ??™å?ç¨?:8090/;
    # ...
}
```

---

### ?¹æ? B: ä½¿ç”¨ Zeabur ?§éƒ¨ URL

Zeabur ?¯èƒ½?ä??§éƒ¨?å? URL??

**æ­¥é? 1: ?¥æ‰¾?§éƒ¨ URL**

1. ??Zeabur Dashboard ä¸­æŸ¥??PocketBase ?å?
2. ?¥æ‰¾ "Internal URL" ??"Private URL"
3. ?¼å??¯èƒ½?¯ï?
   - `http://pocketbase.zeabur.internal:8090`
   - `http://pocketbase-convo.svc.cluster.local:8090`

**æ­¥é? 2: ?´æ–° nginx.conf**

```nginx
location /pb/ {
    proxy_pass http://pocketbase.zeabur.internal:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /_/ {
    proxy_pass http://pocketbase.zeabur.internal:8090/_/;
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

### ?¹æ? C: ä½¿ç”¨?°å?è®Šæ•¸

å°?PocketBase URL è¨­å??ºç’°å¢ƒè??¸ï??¿å?ç¡¬ç·¨ç¢¼ã€?

**æ­¥é? 1: ??Zeabur è¨­å??°å?è®Šæ•¸**

??nginx ?å?æ·»å??°å?è®Šæ•¸ï¼?
```
POCKETBASE_URL=http://pocketbase-convo:8090
```

**æ­¥é? 2: ä¿®æ”¹ nginx ?ç½®ä½¿ç”¨?°å?è®Šæ•¸**

?™é?è¦ä½¿??`envsubst` ?–é?ä¼¼å·¥?·åœ¨?Ÿå??‚æ›¿?›è??¸ã€?

?µå»º `nginx.conf.template`:
```nginx
location /pb/ {
    proxy_pass ${POCKETBASE_URL}/;
    # ...
}
```

??Dockerfile ä¸­æ·»? å??•è…³?¬ï?
```dockerfile
CMD envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'
```

---

### ?¹æ? D: ä½¿ç”¨ Zeabur ?„æ??™é€???Ÿèƒ½

Zeabur ?¯èƒ½?ä??å?????Ÿèƒ½ï¼Œè‡ª?•æ³¨?¥ç’°å¢ƒè??¸ã€?

**æ­¥é? 1: ??Zeabur ä¸­é€???å?**

1. ?²å…¥ nginx ?å?è¨­å?
2. ?¥æ‰¾ "Service Links" ???å????"
3. ?????PocketBase ?å?
4. Zeabur ?ƒè‡ª?•æ³¨?¥ç’°å¢ƒè??¸ï?å¦‚ï?
   - `POCKETBASE_CONVO_HOST`
   - `POCKETBASE_CONVO_PORT`
   - `POCKETBASE_CONVO_URL`

**æ­¥é? 2: ä½¿ç”¨æ³¨å…¥?„ç’°å¢ƒè???*

?¥ç? Zeabur ?‡ä»¶äº†è§£?·é??„ç’°å¢ƒè??¸å?ç¨±ã€?

---

### ?¹æ? E: ?´æ¥ä»???°å???URLï¼ˆè‡¨?‚æ–¹æ¡ˆï?

å¦‚æ? PocketBase ?‰å…¬?‹ç? URLï¼Œå¯ä»¥ç›´?¥ä»£?†ã€?

**æ³¨æ?**: ?™ä??¯æ?ä½³æ–¹æ¡ˆï?? ç‚º?ƒå?? å»¶?²å?å®‰å…¨é¢¨éšª??

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

## ä¸‰ã€è¨º?·æ­¥é©?

### 3.1 æª¢æŸ¥?å??€??

```bash
# 1. ?—å‡º?€?‰æ???
# ??Zeabur Dashboard ä¸­æŸ¥??

# 2. æª¢æŸ¥ PocketBase ?å??¯å¦?‹è?
# ?¥ç? PocketBase ?å??„æ—¥èª?

# 3. æª¢æŸ¥ nginx ?å??¥è?
# ?¥ç?å®Œæ•´?„éŒ¯èª¤è???
```

### 3.2 æ¸¬è©¦ç¶²è·¯???

```bash
# ??nginx å®¹å™¨ä¸­åŸ·è¡?

# æ¸¬è©¦ DNS è§??
nslookup pocketbase-convo
nslookup pocketbase

# æ¸¬è©¦ç¶²è·¯???
ping pocketbase-convo
telnet pocketbase-convo 8090

# æ¸¬è©¦ HTTP ???
curl -v http://pocketbase-convo:8090/api/health
curl -v http://pocketbase:8090/api/health
```

### 3.3 æª¢æŸ¥ Docker ç¶²è·¯ï¼ˆå??œä½¿??Dockerï¼?

```bash
# ?—å‡ºç¶²è·¯
docker network ls

# æª¢æŸ¥ç¶²è·¯è©³æ?
docker network inspect <network_name>

# æª¢æŸ¥å®¹å™¨ç¶²è·¯
docker inspect <container_id> | grep NetworkMode
docker inspect <container_id> | grep IPAddress
```

---

## ?›ã€å¿«?Ÿä¿®å¾©è…³??

### 4.1 ?å??ç¨±æª¢æ¸¬?³æœ¬

?µå»º `scripts/detect-pocketbase.sh`:

```bash
#!/bin/bash

echo "Detecting PocketBase service..."

# ?—è©¦ä¸å??„æ??™å?ç¨?
NAMES=(
    "pocketbase-convo"
    "pocketbase"
    "pocketbase.zeabur.internal"
    "pocketbase.zeabur.internal"
)

for name in "${NAMES[@]}"; do
    echo "Trying: $name"
    if curl -s --connect-timeout 2 "http://$name:8090/api/health" > /dev/null 2>&1; then
        echo "??Found: $name"
        echo "Use this in nginx.conf: http://$name:8090"
        exit 0
    fi
done

echo "??PocketBase service not found"
echo "Please check service name in Zeabur Dashboard"
```

### 4.2 nginx ?ç½®æ¸¬è©¦?³æœ¬

?µå»º `scripts/test-nginx-config.sh`:

```bash
#!/bin/bash

echo "Testing nginx configuration..."

# æ¸¬è©¦?ç½®èªæ?
nginx -t

if [ $? -eq 0 ]; then
    echo "??nginx configuration is valid"
else
    echo "??nginx configuration has errors"
    exit 1
fi

# ?æ–°è¼‰å…¥?ç½®
nginx -s reload

echo "??nginx configuration reloaded"
```

---

## äº”ã€æ¨?¦ç??ç½®ï¼ˆåŸº??Zeabur ?€ä½³å¯¦è¸ï?

### 5.1 ?¸é? 1: ä½¿ç”¨ç°¡çŸ­?å??ç¨±

```nginx
location /pb/ {
    proxy_pass http://pocketbase-convo:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5.2 ?¸é? 2: ä½¿ç”¨å®Œæ•´?„å…§?¨å???

```nginx
location /pb/ {
    proxy_pass http://pocketbase.zeabur.internal:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5.3 ?¸é? 3: ä½¿ç”¨ resolverï¼ˆå??œé?è¦å??‹è§£?ï?

```nginx
location /pb/ {
    resolver 127.0.0.11 valid=30s;  # Docker ?§éƒ¨ DNS
    set $pocketbase http://pocketbase-convo:8090;
    proxy_pass $pocketbase/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## ?­ã€Zeabur ?¹å??ç½®

### 6.1 æª¢æŸ¥ Zeabur ?‡ä»¶

?ƒè€?Zeabur å®˜æ–¹?‡ä»¶ï¼?
- [?å??“é€šè?](https://zeabur.com/docs/deploy/service-communication)
- [?°å?è®Šæ•¸](https://zeabur.com/docs/deploy/environment-variables)
- [ç¶²è·¯?ç½®](https://zeabur.com/docs/deploy/networking)

### 6.2 å¸¸è???Zeabur ?å??ç¨±?¼å?

```
# ?¼å? 1: ?å??ç¨±
pocketbase-convo

# ?¼å? 2: ?å??ç¨±.?§éƒ¨?Ÿå?
pocketbase.zeabur.internal

# ?¼å? 3: ?å??ç¨±.?½å?ç©ºé?.svc.cluster.local
pocketbase-convo.default.svc.cluster.local
```

### 6.3 ä½¿ç”¨ Zeabur CLI æª¢æŸ¥

```bash
# å®‰è? Zeabur CLI
npm install -g @zeabur/cli

# ?»å…¥
zeabur login

# ?—å‡º?å?
zeabur service list

# ?¥ç??å?è©³æ?
zeabur service info <service_name>
```

---

## ä¸ƒã€ä?ä¸€æ­¥è???

### 7.1 ç«‹å³?·è?

1. ????Zeabur Dashboard ä¸­ç¢ºèª?PocketBase ?å??ç¨±
2. ????nginx å®¹å™¨ä¸­æ¸¬è©¦é€??
3. ???¹æ?æ¸¬è©¦çµæ??´æ–° nginx.conf
4. ???å? nginx ?å?
5. ??é©—è??ç½®

### 7.2 å¦‚æ??é??ç?

1. ?¯ç¹« Zeabur ?¯æ´
2. ?¥ç? Zeabur ?‡ä»¶ä¸­ç??å??“é€šè?ç« ç?
3. ?ƒæ…®ä½¿ç”¨å¤–éƒ¨ URLï¼ˆè‡¨?‚æ–¹æ¡ˆï?
4. æª¢æŸ¥?²ç«?†å?ç¶²è·¯ç­–ç•¥

---

**?€å¾Œæ›´??*: 2026-03-12 09:27 (UTC+8)
