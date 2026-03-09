/**
 * OpenClaw Agent 統一調用服務
 */
const axios = require("axios");

const OPENCLAW_URL = process.env.OPENCLAW_AGENT_URL || "http://localhost:3000/api/agent";

/**
 * 調用 OpenClaw Agent
 */
async function callOpenClaw(userId, message, conversationHistory = []) {
    try {
        const response = await axios.post(OPENCLAW_URL, {
            userId,
            message,
            history: conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        }, {
            timeout: 30000
        });

        return response.data.response || response.data.message || "抱歉，我現在無法回應。";
    } catch (error) {
        console.error("[OpenClaw] 調用失敗:", error.message);
        return "抱歉，系統暫時無法回應，請稍後再試。";
    }
}

module.exports = { callOpenClaw };
