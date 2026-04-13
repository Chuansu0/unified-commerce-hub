# Zeabur CLI 常用指令

## 查看服務列表

```bash
# 列出所有服務
zeabur service list

# 或查看當前專案的服務
zeabur service ls
```

## 搜尋特定服務

```bash
# 搜尋包含 "hermes" 的服務
zeabur service list | grep -i hermes

# 搜尋包含 "sherlock" 的服務
zeabur service list | grep -i sherlock
```

## 查看服務詳情

```bash
# 查看服務詳細資訊（替換 <service-id> 為實際 ID）
zeabur service get <service-id>

# 查看服務日誌
zeabur service logs <service-id>

# 持續追蹤日誌
zeabur service logs <service-id> -f
```

## 管理服務

```bash
# 重啟服務
zeabur service restart <service-id>

# 停止服務
zeabur service stop <service-id>

# 刪除服務
zeabur service delete <service-id>
```

## 網路/端口設定

```bash
# 查看服務的網路設定
zeabur service network <service-id>

# 添加端口（HTTP 8080）
zeabur service network <service-id> add --port 8080 --type HTTP

# 添加端口（TCP）
zeabur service network <service-id> add --port 8080
```

## 環境變數

```bash
# 查看環境變數
zeabur service env <service-id>

# 新增環境變數
zeabur service env <service-id> add PORT=8080
```

## 實用組合指令

```bash
# 快速找到 hermes 相關服務並顯示詳情
zeabur service list | grep -i hermes | awk '{print $1}' | xargs -I {} zeabur service get {}

# 刪除所有 sherlock 相關服務（小心使用！）
zeabur service list | grep -i sherlock | awk '{print $1}' | xargs -I {} zeabur service delete {}
```

## 快速診斷

```bash
# 1. 列出所有服務找到 hermes-agent ID
zeabur service list

# 2. 查看該服務日誌
zeabur service logs <hermes-agent-service-id> -f

# 3. 查看該服務端口設定
zeabur service network <hermes-agent-service-id>
```
