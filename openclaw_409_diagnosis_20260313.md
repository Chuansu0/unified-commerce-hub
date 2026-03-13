# OpenClaw 409 getUpdates 衝突診斷報告

**日期**: 2026-03-13  
**問題**: 持續出現 `getUpdates conflict (409)` 錯誤

---

## 測試結果

### ✅ 已排除的原因

1. **多個 agent 衝突** - 測試只保留 andrea 單一 agent，409仍出現
2. **umio bot 衝突** - 已從配置中移除 default帳號
3. **Webhook 衝突** - 已刪除所有 webhook，改回 polling 模式

### ❌ 確認的根本原因

**Zeabur 同時運行多個 OpenClaw 容器實例**

錯誤訊息明確指出：
```
terminated by other getUpdates request; make sure that only one bot instance is running
```

這表示有**兩個獨立的 OpenClaw 進程**同時對同一個 bot token 呼叫 getUpdates。

---

## Zeabur 部署機制分析

### 滾動更新 (Rolling Update)

Zeabur 預設使用滾動更新策略：
1. 啟動新容器
2. 等待新容器健康檢查通過
3. 停止舊容器

在步驟 1-3 之間，**新舊兩個容器同時運行** →兩個都在 getUpdates → 409 衝突

### 為什麼找不到 Replicas 設定

Zeabur 可能：
- 自動根據流量調整實例數
- 通過 `project.yaml` 或 `zbpack.json` 控制
- 或者沒有暴露手動控制選項

---

## 解決方案

### 方案 A：修改 project.yaml 強制單一實例

在 `project.yaml` 中添加部署策略配置。

### 方案 B：使用環境變數控制

某些平台支持通過環境變數控制：
- `ZEABUR_REPLICAS=1`
- `MAX_INSTANCES=1`

### 方案 C：禁用滾動更新

強制 Zeabur 先停止舊實例再啟動新實例（會有短暫停機）。

### 方案 D：改用 Webhook 模式（需要 nginx 配置）

如果 OpenClaw 支持 webhook，配置 nginx 將Telegram webhook 路由到 OpenClaw。

---

## 建議的立即行動

1. **檢查 project.yaml** - 查看是否有 replicas 或 scaling 配置
2. **聯繫 Zeabur 支援** - 詢問如何強制單一實例運行
3. **暫時接受 409** - 如果 OpenClaw 能自動重試，可能不影響功能

---

## 驗證方法

如果成功限制為單一實例，日誌應該：
- ✅ 啟動時只看到一次 `[telegram] [andrea] starting provider`
- ✅ 沒有 409 錯誤
- ✅ andrea 能正常回應群組 mention