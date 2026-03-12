#!/bin/bash

# Zeabur 服務測試腳本
# 用於驗證所有服務配置是否正確

echo "=========================================="
echo "Zeabur 服務健康檢查"
echo "=========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試 1: PocketBase (通過 nginx 代理)
echo "1. 測試 PocketBase (通過 nginx 代理)..."
if curl -s -f "https://www.neovega.cc/pb/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PocketBase 可訪問${NC}"
else
    echo -e "${RED}❌ PocketBase 無法訪問${NC}"
fi
echo ""

# 測試 2: telegram-webhook 健康檢查
echo "2. 測試 telegram-webhook 服務..."
RESPONSE=$(curl -s "https://www.neovega.cc/health")
if echo "$RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ telegram-webhook 服務正常${NC}"
    echo "   回應: $RESPONSE"
else
    echo -e "${RED}❌ telegram-webhook 服務異常${NC}"
    echo "   回應: $RESPONSE"
fi
echo ""

# 測試 3: Telegram Bot
echo "3. 測試 Telegram Bot..."
BOT_RESPONSE=$(curl -s "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getMe")
if echo "$BOT_RESPONSE" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Telegram Bot 正常${NC}"
    echo "   Bot 名稱: @$BOT_NAME"
else
    echo -e "${RED}❌ Telegram Bot 異常${NC}"
fi
echo ""

# 測試 4: Telegram Webhook
echo "4. 測試 Telegram Webhook 設定..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/getWebhookInfo")
if echo "$WEBHOOK_INFO" | grep -q "www.neovega.cc"; then
    echo -e "${GREEN}✅ Webhook 已設定${NC}"
    WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "   URL: $WEBHOOK_URL"
else
    echo -e "${YELLOW}⚠️  Webhook 未設定或設定不正確${NC}"
    echo "   請執行: curl -X POST \"https://api.telegram.org/bot8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw/setWebhook\" -H \"Content-Type: application/json\" -d '{\"url\": \"https://www.neovega.cc/webhook/telegram\"}'"
fi
echo ""

# 測試 5: 前端網站
echo "5. 測試前端網站..."
if curl -s -f "https://www.neovega.cc/shop" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端網站可訪問${NC}"
else
    echo -e "${RED}❌ 前端網站無法訪問${NC}"
fi
echo ""

echo "=========================================="
echo "測試完成"
echo "=========================================="
