const express = require("express");
const Joi = require("joi");
const router = express.Router();
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { success, error, paginate } = require("../utils/response");

// ── 輸入驗證 Schema ───────────────────────────────────────────────
const productSchema = Joi.object({
    name: Joi.string().max(255).required().messages({
        "any.required": "請提供商品名稱",
    }),
    name_en: Joi.string().max(255).allow("", null).optional(),
    description: Joi.string().allow("", null).optional(),
    description_en: Joi.string().allow("", null).optional(),
    price: Joi.number().min(0).required().messages({
        "any.required": "請提供商品售價",
        "number.min": "售價不能為負數",
    }),
    original_price: Joi.number().min(0).allow(null).optional(),
    category: Joi.string().max(100).required().messages({
        "any.required": "請提供商品分類",
    }),
    image_url: Joi.string().uri().allow("", null).optional(),
    stock: Joi.number().integer().min(0).default(0),
    badges: Joi.array().items(Joi.string()).default([]),
    features: Joi.array().items(Joi.string()).default([]),
    is_active: Joi.boolean().default(true),
});

const updateProductSchema = productSchema.fork(
    ["name", "price", "category"],
    (schema) => schema.optional()
);

/**
 * GET /api/products
 * 取得商品列表（公開，支援分頁與篩選）
 */
router.get("/", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;
    const active_only = req.query.active_only !== "false"; // 預設只顯示上架商品

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const conditions = [];
        const params = [];

        if (active_only) {
            conditions.push(`is_active = TRUE`);
        }

        if (category) {
            params.push(category);
            conditions.push(`category = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(name ILIKE $${params.length} OR name_en ILIKE $${params.length})`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // 取得總筆數
        const countResult = await db.query(`SELECT COUNT(*) FROM products ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        // 取得分頁資料
        params.push(limit, offset);
        const dataResult = await db.query(
            `SELECT id, name, name_en, description, description_en, price, original_price,
			        category, image_url, stock, badges, features, is_active, created_at
			 FROM products ${where}
			 ORDER BY created_at DESC
			 LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return paginate(res, dataResult.rows, total, page, limit);
    } catch (err) {
        console.error("[Products] List error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * GET /api/products/:id
 * 取得單一商品詳情（公開）
 */
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const result = await db.query(
            `SELECT id, name, name_en, description, description_en, price, original_price,
			        category, image_url, stock, badges, features, is_active, created_at
			 FROM products WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return error(res, "商品不存在", 404);
        }

        return success(res, result.rows[0]);
    } catch (err) {
        console.error("[Products] Get error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * POST /api/products
 * 新增商品（需 superadmin 權限）
 */
router.post("/", authenticate, requireRole("superadmin"), async (req, res) => {
    const { error: validationError, value } = productSchema.validate(req.body, { abortEarly: true });
    if (validationError) {
        return error(res, validationError.details[0].message, 400);
    }

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const result = await db.query(
            `INSERT INTO products
			   (name, name_en, description, description_en, price, original_price,
			    category, image_url, stock, badges, features, is_active)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
			 RETURNING *`,
            [
                value.name, value.name_en || null, value.description || null, value.description_en || null,
                value.price, value.original_price || null, value.category, value.image_url || null,
                value.stock, JSON.stringify(value.badges), JSON.stringify(value.features), value.is_active,
            ]
        );

        return success(res, result.rows[0], "商品新增成功", 201);
    } catch (err) {
        console.error("[Products] Create error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * PUT /api/products/:id
 * 更新商品（需 superadmin 權限）
 */
router.put("/:id", authenticate, requireRole("superadmin"), async (req, res) => {
    const { id } = req.params;
    const { error: validationError, value } = updateProductSchema.validate(req.body, { abortEarly: true });
    if (validationError) {
        return error(res, validationError.details[0].message, 400);
    }

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    // 動態建立 SET 子句
    const fields = [];
    const params = [];

    const fieldMap = {
        name: "name", name_en: "name_en",
        description: "description", description_en: "description_en",
        price: "price", original_price: "original_price",
        category: "category", image_url: "image_url",
        stock: "stock", badges: "badges", features: "features", is_active: "is_active",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
        if (value[key] !== undefined) {
            params.push(key === "badges" || key === "features" ? JSON.stringify(value[key]) : value[key]);
            fields.push(`${col} = $${params.length}`);
        }
    }

    if (fields.length === 0) {
        return error(res, "未提供任何更新欄位", 400);
    }

    params.push(id);
    const idParam = `$${params.length}`;

    try {
        const result = await db.query(
            `UPDATE products SET ${fields.join(", ")} WHERE id = ${idParam} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return error(res, "商品不存在", 404);
        }

        return success(res, result.rows[0], "商品更新成功");
    } catch (err) {
        console.error("[Products] Update error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

/**
 * DELETE /api/products/:id
 * 刪除商品（需 superadmin 權限，軟刪除）
 */
router.delete("/:id", authenticate, requireRole("superadmin"), async (req, res) => {
    const { id } = req.params;

    if (!process.env.DATABASE_URL) {
        return error(res, "資料庫未設定", 503);
    }

    try {
        const result = await db.query(
            "UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rows.length === 0) {
            return error(res, "商品不存在", 404);
        }

        return success(res, null, "商品已下架");
    } catch (err) {
        console.error("[Products] Delete error:", err.message);
        return error(res, "伺服器錯誤", 500);
    }
});

module.exports = router;
