# Zeabur 內網存取設定指南

**建立日期**: 2026-03-12  
**目的**: 配置服務的內網存取以實現服務間通訊

---

## 當前配置狀態

### PocketBase ✅
- **主機名稱**: `pocketbase-convo.zeabur.internal`
- **連線埠**: HTTP :8090
- **狀態**: 已配置

### telegram-webhook ❓
- **狀態**: 待確認

---

## 如何檢查內網存取配置

1. 登入 [Zeabur Dashboard](https://zeabur.com)
2. 選擇您的專案
3. 點擊 **telegram-webhook** 服務
4. 查看"內網存取"（Internal Network）部分
5. 記錄"主機名稱"和"連線埠"

---

## 如果 telegram-webhook 沒有內網存取

### 添加內網存取

1. 在 telegram-webhook 服務頁面
2. 找到"內網存取"部分
3. 點擊"開放新連線埠"
4. 設定：
   - **連線埠**: 3000
   - **協定**: HTTP

### 預期結果

配置後應該看到：
- **主機名稱**: `telegram-webhook.zeabur.internal` 或類似名稱
- **連線埠**: HTTP :3000

---

## 更新 nginx.conf

根據實際的主機名稱更新配置：

```nginx
# 如果主機名稱是 telegram-webhook.zeabur.internal
set $telegram_webhook telegram-webhook.zeabur.internal:3000;

# 如果主機名稱不同，使用實際名稱
set $telegram_webhook <實際主機名稱>:3000;
```

---

**下一步**: 檢查 telegram-webhook 的內網存取配置並提供截圖。
