/**
 * Chat 路由
 */
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const conversationService = require("../services/conversationService");
const openclawService = require("../services/openclawService");
const { success, error } = require("../utils/response");

/**
 * 發送訊息
 */
router.post("/send", authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return error(res, "訊息不能為空", 400);
        }

        const conversationId = await conversationService.getOrCreateConversation(userId);

        await conversationService.saveMessage(conversationId, "web", "user", message);

        const history = await conversationService.getConversationHistory(conversationId, 10);

        const response = await openclawService.callOpenClaw(userId, message, history);

        await conversationService.saveMessage(conversationId, "web", "assistant", response);

        return success(res, { response });
    } catch (err) {
        console.error("[Chat] 發送訊息失敗:", err);
        return error(res, "發送訊息失敗", 500);
    }
});

/**
 * 獲取對話歷史
 */
router.get("/history", authenticateToken, async (req, res) => {
    try {
        const conversationId = await conversationService.getOrCreateConversation(req.user.id);
        const history = await conversationService.getConversationHistory(conversationId);
        return success(res, { history });
    } catch (err) {
        console.error("[Chat] 獲取歷史失敗:", err);
        return error(res, "獲取歷史失敗", 500);
    }
});

module.exports = router;
