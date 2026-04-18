#!/bin/bash
echo "=== 測試 Carrie Bot 啟動 ==="
echo "Python: $(which python3)"
echo "Conda env: $CONDA_DEFAULT_ENV"
echo "PWD: $(pwd)"
echo ""

cd /mnt/d/WSL/unified-commerce-hub/hermes-agent
echo "切換到: $(pwd)"
echo "carrie_bot.py exists: $(test -f carrie_bot.py && echo YES || echo NO)"
echo ""

echo "嘗試啟動 carrie_bot.py..."
python3 carrie_bot.py
