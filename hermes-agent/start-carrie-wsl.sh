#!/bin/bash
# Carrie Bot - WSL 啟動腳本
# 在 WSL Ubuntu-24.04 裡跑，讓 Docker 容器內的 n8n 能透過 172.18.0.1 連到
echo "========================================"
echo "  neovegacarrie_bot - WSL Mode"
echo "========================================"
echo ""
echo "Vault: /mnt/d/vaults (mapped from D:\vaults)"
echo "Webhook: http://0.0.0.0:18800"
echo "Ollama: http://127.0.0.1:11434"
echo ""

# 設定環境變數（WSL 路徑）
export VAULTS_BASE="/mnt/d/vaults"
export CARRIE_WEBHOOK_PORT="18800"
export CARRIE_WEBHOOK_SECRET="hermes-carrie-2026"

# 確保 pip 套件可用（使用 base conda 或系統 python）
cd /mnt/d/WSL/unified-commerce-hub/hermes-agent

# 安裝依賴（如果需要）
pip install httpx trafilatura aiohttp python-telegram-bot 2>/dev/null

python3 carrie_bot.py
