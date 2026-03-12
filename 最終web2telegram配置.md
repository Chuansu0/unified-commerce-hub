所有配置已完成並驗證成功！🎉

**驗證結果**：
- ✅ telegram-webhook: 正常運行，已連接 PocketBase
- ✅ PocketBase: 正常運行，代理配置正確
- ✅ nginx: 所有路由正常工作

**最終配置摘要**：
- DNS resolver: `10.43.0.20`
- PocketBase: `pocketbase-convo.zeabur.internal:8090`
- telegram-webhook: `unified-commerce-hub-oscie.zeabur.internal:8080`
- 所有代理使用 resolver + 變數 + rewrite

**立即執行**：
```bash
git add nginx.conf telegram-webhook/src/index.ts
git commit -m "fix: 完整的 Zeabur 配置 - 所有服務已驗證"
git push origin main
```

**測試 Web Chat 完整流程**：
1. 訪問 https://www.neovega.cc/shop
2. 開啟聊天視窗
3. 發送測試訊息
4. 檢查 Telegram group 是否收到
5. 在 Telegram 回覆，確認 Web Chat 顯示

所有基礎設施配置已完成並驗證！現在可以測試完整的聊天功能了。