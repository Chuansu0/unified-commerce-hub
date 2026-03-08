const express = require("express");
const Joi = require("joi");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { success, error, paginate } = require("../utils/response");

// ── 輸入驗證 Schema ───────────────────────────────────────────────
const orderItemSchema = Joi.object({
    product_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    name: Joi.string().max(255).required(),
    price: Joi.number().min(0).required(),
    quantity: Joi.number().integer().min(1).required(),
    image_url: Joi.string().allow("", null).optional(),
});

const createOrderSchema = Joi.object({
    items: Joi.array().items(orderItemSchema).min(1).required().messages({
        "array.min": "購物車不能為空",
        "any.required": "請提供訂單商品",
    }),
    payment_method: Joi.string().max(50).default("credit_card"),
    shipping_address: Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().required(),
        address: Joi.string().required(),
        city: Joi.string().optional(),
        zip: Joi.string().optional(),
    }).optional(),
    note: Joi.string().max(500).allow("", null).optional(),
});

const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid("pending", "paid", "shipped", "delivered", "cancelled")
        .required()
        .messages({
            "any.only": "無效的訂單狀態",
            "any.required": "請提供訂單狀態",
        }),
});

/**
 * 產生訂單編號：ORD-YYYYMMDD-XXXXXXXX
 */
function generateOrderNo() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `ORD-${date}-${rand}`;
}

/**
 * GET /api/orders
 * 取得訂單列表
 * - superadmin：可查所有訂單，支援 user_id / status 篩選
 * - 一般用戶：只能查自己的訂單
 */
router.get("/", authenticate, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const conditions = [];
        const params = [];

        // 一般用戶只能看自己的訂單
        if (req.user.role !== "superadmin") {
            params.push(req.user.id);
            conditions.push(`o.user_id = $${params.length}`);
        } else if (req.query.user_id) {
            params.push(req.query.user_id);
            conditions.push(`o.user_id = $${params.length}`);
        }

        if (req.query.status) {
            params.push(req.query.status);
            conditions.push(`o.status = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await db.query(
            `SELECT COUNT(*) FROM orders o ${where}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const dataResult = await db.query(
            `SELECT o.id, o.order_no, o.user_id, o.items, o.total, o.status,
			        o.payment_method, o.shipping_address, o.note, o.created_at,
			        u.username
			 FROM orders o
			 LEFT JOIN users u ON o.user_id = u.id
			 ${where}
			 ORDER BY o.created_at DESC
			 LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return paginate(res, dataResult.rows, total, page, limit);
    } catch (err) {
        console.error("[Orders] List error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * GET /api/orders/:id
 * 取得單一訂單詳情
 * - superadmin 可查任何訂單
 * - 一般用戶只能查自己的訂單
 */
router.get("/:id", authenticate, async (req, res) => {
    const { id } = req.params;

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const result = await db.query(
            `SELECT o.*, u.username
			 FROM orders o
			 LEFT JOIN users u ON o.user_id = u.id
			 WHERE o.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return error(res, "訂單不存在", 404);
        }

        const order = result.rows[0];

        // 非管理員只能查自己的訂單
        if (req.user.role !== "superadmin" && String(order.user_id) !== String(req.user.id)) {
            return error(res, "無權限查看此訂單", 403);
        }

        return success(res, order);
    } catch (err) {
        console.error("[Orders] Get error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * POST /api/orders
 * 建立新訂單（需登入）
 */
router.post("/", authenticate, async (req, res) => {
    const { error: validationError, value } = createOrderSchema.validate(req.body, { abortEarly: true });
    if (validationError) {
        return error(res, validationError.details[0].message, 400);
    }

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    // 計算訂單總金額
    const total = value.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNo = generateOrderNo();
    const userId = req.user.id === "root" ? null : req.user.id;

    try {
        const result = await db.query(
            `INSERT INTO orders (order_no, user_id, items, total, payment_method, shipping_address, note)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING *`,
            [
                orderNo,
                userId,
                JSON.stringify(value.items),
                total,
                value.payment_method,
                value.shipping_address ? JSON.stringify(value.shipping_address) : null,
                value.note || null,
            ]
        );

        return success(res, result.rows[0], "訂單建立成功", 201);
    } catch (err) {
        console.error("[Orders] Create error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * PUT /api/orders/:id/status
 * 更新訂單狀態（需 superadmin 權限）
 */
router.put("/:id/status", authenticate, requireRole("superadmin"), async (req, res) => {
    const { id } = req.params;
    const { error: validationError, value } = updateOrderStatusSchema.validate(req.body);
    if (validationError) {
        return error(res, validationError.details[0].message, 400);
    }

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const result = await db.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [value.status, id]
        );

        if (result.rows.length === 0) {
            return error(res, "訂單不存在", 404);
        }

        return success(res, result.rows[0], "訂單狀態已更新");
    } catch (err) {
        console.error("[Orders] Update status error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

module.exports = router;
