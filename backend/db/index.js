const { Pool } = require("pg");

/**
 * PostgreSQL 連線池
 * 使用 DATABASE_URL 環境變數，若未設定則使用各別參數
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
    console.error("[DB] Unexpected pool error:", err.message);
});

/**
 * 執行 SQL 查詢的通用函式
 * @param {string} text - SQL 查詢字串
 * @param {Array} params - 查詢參數
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 100));
        }
        return result;
    } catch (err) {
        console.error("[DB] Query error:", err.message, "| SQL:", text.slice(0, 100));
        throw err;
    }
}

/**
 * 取得連線（用於交易）
 */
async function getClient() {
    return pool.connect();
}

module.exports = { query, getClient, pool };
