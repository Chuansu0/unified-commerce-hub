/**
 * Telegram 帳號綁定服務
 */
const { pool } = require("../db");

/**
 * 生成隨機綁定碼
 */
function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BIND-";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * 為用戶生成綁定碼
 */
async function generateBindCode(userId) {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分鐘後過期

    await pool.query(
        `INSERT INTO telegram_bind_codes (user_id, bind_code, expires_at) 
         VALUES ($1, $2, $3)`,
        [userId, code, expiresAt]
    );

    return { code, expiresAt };
}

/**
 * 驗證綁定碼並綁定帳號
 */
async function verifyAndBind(bindCode, telegramUserId, telegramUsername) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 檢查綁定碼
        const codeResult = await client.query(
            `SELECT user_id, expires_at, used 
             FROM telegram_bind_codes 
             WHERE bind_code = $1`,
            [bindCode]
        );

        if (codeResult.rows.length === 0) {
            return { success: false, error: "綁定碼不存在" };
        }

        const { user_id, expires_at, used } = codeResult.rows[0];

        if (used) {
            return { success: false, error: "綁定碼已使用" };
        }

        if (new Date() > new Date(expires_at)) {
            return { success: false, error: "綁定碼已過期" };
        }

        // 更新用戶 Telegram 資訊
        await client.query(
            `UPDATE users 
             SET telegram_user_id = $1, telegram_username = $2, telegram_bound_at = NOW() 
             WHERE id = $3`,
            [telegramUserId, telegramUsername, user_id]
        );

        // 標記綁定碼為已使用
        await client.query(
            `UPDATE telegram_bind_codes SET used = TRUE WHERE bind_code = $1`,
            [bindCode]
        );

        await client.query("COMMIT");
        return { success: true, userId: user_id };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("[TelegramBind] 綁定失敗:", error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * 檢查用戶綁定狀態
 */
async function checkBindStatus(userId) {
    const result = await pool.query(
        `SELECT telegram_user_id, telegram_username, telegram_bound_at 
         FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return { bound: false };
    }

    const user = result.rows[0];
    return {
        bound: !!user.telegram_user_id,
        telegramUsername: user.telegram_username,
        boundAt: user.telegram_bound_at,
    };
}

/**
 * 根據 Telegram User ID 查找用戶
 */
async function findUserByTelegramId(telegramUserId) {
    const result = await pool.query(
        `SELECT id, email, telegram_username FROM users WHERE telegram_user_id = $1`,
        [telegramUserId]
    );
    return result.rows[0] || null;
}

module.exports = {
    generateBindCode,
    verifyAndBind,
    checkBindStatus,
    findUserByTelegramId,
};
