/**
 * Telegram 帳號綁定路由
 */
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const telegramBindService = require("../services/telegramBindService");
const { success, error } = require("../utils/response");

/**
 * 生成綁定碼
 */
router.post("/generate-bind-code", authenticateToken, async (req, res) => {
    try {
        const { code, expiresAt } = await telegramBindService.generateBindCode(req.user.id);
        return success(res, { code, expiresAt });
    } catch (err) {
        console.error("[TelegramBind] 生成綁定碼失敗:", err);
        return error(res, "生成綁定碼失敗", 500);
    }
});

/**
 * 檢查綁定狀態
 */
router.get("/bind-status", authenticateToken, async (req, res) => {
    try {
        const status = await telegramBindService.checkBindStatus(req.user.id);
        return success(res, status);
    } catch (err) {
        console.error("[TelegramBind] 檢查綁定狀態失敗:", err);
        return error(res, "檢查綁定狀態失敗", 500);
    }
});

module.exports = router;
