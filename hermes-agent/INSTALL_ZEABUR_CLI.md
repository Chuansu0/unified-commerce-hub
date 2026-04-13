# 安裝 Zeabur CLI

## 安裝方法

### macOS
```bash
brew install zeabur/tap/zeabur
```

### Linux
```bash
curl -sSL https://dub.sh/zb | bash
```

### Windows (PowerShell)
```powershell
iwr -useb https://dub.sh/zbw | iex
```

## 登入

```bash
zeabur auth login
```

會開啟瀏覽器讓你登入 Zeabur 帳號。

## 選擇專案

```bash
# 列出所有專案
zeabur project list

# 選擇專案
zeabur project switch <project-id>
```

## 基本指令

```bash
# 查看所有服務
zeabur service list

# 查看服務日誌
zeabur service logs <service-id>

# 查看服務詳情
zeabur service get <service-id>
```

## 如果 CLI 無法使用

直接使用 **Zeabur 網頁控制台**：
https://zeabur.com

在網頁上：
1. 點擊服務
2. 點擊「Networking」
3. 手動添加端口 8080
