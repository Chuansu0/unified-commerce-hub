# PocketBase 端點測試指南

**建立日期**: 2026-03-12  
**目的**: 找到 PocketBase 的正確健康檢查端點

---

## 問題

`curl https://www.neovega.cc/pb/api/health` 返回 404：
```json
{"code":404,"message":"Not Found.","data":}
```

---

## 測試步驟

### 1. 測試常見的 PocketBase 端點

```bash
# 測試 1: API 根路徑
curl https://www.neovega.cc/pb/api/

# 測試 2: Collections 列表
curl https://www.neovega.cc/pb/api/collections

# 測試 3: 直接訪問 PocketBase（繞過 nginx）
# 在 nginx 容器的 Terminal 中執行：
curl http://pocketbase-convo.zeabur.internal:8090/api/health
curl http://pocketbase-convo.zeabur.internal:8090/api/
curl http://pocketbase-convo.zeabur.internal:8090/api/collections
```

### 2. 檢查 PocketBase 版本

PocketBase 的健康檢查端點可能因版本而異：
- 較新版本：`/api/health`
- 較舊版本：可能沒有專門的健康檢查端點

### 3. 替代方案

如果沒有 `/api/health` 端點，可以使用：
- `/api/collections` - 列出所有 collections
- `/api/` - API 根路徑

---

## 當前配置驗證

### nginx 代理配置
```nginx
location /pb/ {
    set $pocketbase pocketbase-convo.zeabur.internal:8090;
    proxy_pass http://$pocketbase/;
}
```

### 請求轉換
- 請求：`https://www.neovega.cc/pb/api/health`
- 轉發到：`http://pocketbase-convo.zeabur.internal:8090/api/health`

---

## 下一步

1. 執行上述測試命令
2. 找到可用的端點
3. 更新前端代碼使用正確的端點（如果需要）

---

**注意**: PocketBase 的主要功能（collections, records, auth）應該都正常工作，即使健康檢查端點返回 404。
