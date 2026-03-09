/**
 * 對話管理服務
 */
const { pool } = require("../db");

/**
 * 獲取或建立用戶的對話
 */
async function getOrCreateConversation(userId) {
    let result = await pool.query(
        `SELECT id FROM conversations WHERE user_id = $1`,
        [userId]
    );

    if (result.rows.length > 0) {
        return result.rows[0].id;
    }

    result = await pool.query(
        `INSERT INTO conversations (user_id) VALUES ($1) RETURNING id`,
        [userId]
    );
    return result.rows[0].id;
}

/**
 * 儲存訊息
 */
async function saveMessage(conversationId, channel, role, content) {
    const result = await pool.query(
        `INSERT INTO messages (conversation_id, channel, role, content) 
         VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
        [conversationId, channel, role, content]
    );

    await pool.query(
        `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [conversationId]
    );

    return result.rows[0];
}

/**
 * 獲取對話歷史
 */
async function getConversationHistory(conversationId, limit = 50) {
    const result = await pool.query(
        `SELECT channel, role, content, created_at 
         FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [conversationId, limit]
    );
    return result.rows.reverse();
}

module.exports = {
    getOrCreateConversation,
    saveMessage,
    getConversationHistory,
};
