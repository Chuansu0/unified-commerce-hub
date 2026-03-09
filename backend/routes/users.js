const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { success, error, paginate } = require("../utils/response");

/**
 * GET /api/users
 * 會員列表（superadmin 專用）
 * query: q（搜尋 username/email）、page、limit
 */
router.get("/", authenticate, requireRole("superadmin"), async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const q = req.query.q ? String(req.query.q).trim() : "";

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const params = [];
        let whereClause = "WHERE u.role = 'user'";

        if (q) {
            params.push(`%${q}%`);
            whereClause += ` AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }

        const countResult = await db.query(
            `SELECT COUNT(*) FROM users u ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const listParams = [...params, limit, offset];
        const dataResult = await db.query(
            `SELECT
				u.id, u.username, u.email, u.role, u.is_active, u.created_at,
				COUNT(o.id)::int                                          AS order_count,
				COALESCE(SUM(o.total), 0)::numeric                        AS total_spent,
				COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::int     AS pending_orders
			 FROM users u
			 LEFT JOIN orders o ON o.user_id = u.id
			 ${whereClause}
			 GROUP BY u.id
			 ORDER BY u.created_at DESC
			 LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );

        return paginate(res, dataResult.rows, total, page, limit);
    } catch (err) {
        console.error("[Users] List error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * GET /api/users/search/orders
 * 跨欄位搜尋訂單（superadmin 專用）
 * 可依 order_no、username、email、商品名稱 搜尋
 */
router.get("/search/orders", authenticate, requireRole("superadmin"), async (req, res) => {
    const q = req.query.q ? String(req.query.q).trim() : "";
    if (!q) return success(res, []);

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const pattern = `%${q}%`;
        const result = await db.query(
            `SELECT
				o.id, o.order_no, o.user_id, o.items, o.total, o.status,
				o.payment_method, o.shipping_address, o.note, o.created_at,
				u.username, u.email
			 FROM orders o
			 LEFT JOIN users u ON o.user_id = u.id
			 WHERE o.order_no ILIKE $1
			    OR u.username ILIKE $1
			    OR u.email    ILIKE $1
			    OR o.items::text ILIKE $1
			 ORDER BY o.created_at DESC
			 LIMIT 50`,
            [pattern]
        );
        return success(res, result.rows);
    } catch (err) {
        console.error("[Users] Search orders error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * GET /api/users/:id
 * 會員詳情 + 訂單歷史（superadmin 專用）
 */
router.get("/:id", authenticate, requireRole("superadmin"), async (req, res) => {
    const { id } = req.params;

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const userResult = await db.query(
            `SELECT id, username, email, role, is_active, created_at, updated_at
			 FROM users WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return error(res, "會員不存在", 404);
        }

        const ordersResult = await db.query(
            `SELECT id, order_no, items, total, status, payment_method,
			        shipping_address, note, created_at
			 FROM orders
			 WHERE user_id = $1
			 ORDER BY created_at DESC`,
            [id]
        );

        return success(res, {
            user: userResult.rows[0],
            orders: ordersResult.rows,
        });
    } catch (err) {
        console.error("[Users] Detail error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

module.exports = router;
