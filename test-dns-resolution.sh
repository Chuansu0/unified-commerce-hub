#!/bin/bash

# DNS 解析測試腳本
# 在 nginx 容器的 Terminal 中執行此腳本

echo "=========================================="
echo "DNS 解析測試"
echo "=========================================="
echo ""

# 測試 1: 檢查 DNS 配置
echo "1. DNS 配置 (/etc/resolv.conf):"
cat /etc/resolv.conf
echo ""

# 測試 2: 測試 telegram-webhook 解析
echo "2. 測試 telegram-webhook.zeabur.internal:"
nslookup telegram-webhook.zeabur.internal 2>&1 || echo "❌ 解析失敗"
echo ""

# 測試 3: 測試簡短名稱
echo "3. 測試 telegram-webhook:"
nslookup telegram-webhook 2>&1 || echo "❌ 解析失敗"
echo ""

# 測試 4: 測試 PocketBase 解析
echo "4. 測試 pocketbase-convo.zeabur.internal:"
nslookup pocketbase-convo.zeabur.internal 2>&1 || echo "❌ 解析失敗"
echo ""

# 測試 5: 測試簡短名稱
echo "5. 測試 pocketbase-convo:"
nslookup pocketbase-convo 2>&1 || echo "❌ 解析失敗"
echo ""

echo "=========================================="
echo "請將以上結果提供給開發人員"
echo "=========================================="
