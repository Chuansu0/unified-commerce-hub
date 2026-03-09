const jwt = require("jsonwebtoken");
const Joi = require("joi");
const router = express.Router();
const db = require("../db");
const { success, error } = require("../utils/response");

// ── 輸入驗證 Schema ───────────────────────────────────────────────
const loginSchema = Joi.object({
  username: Joi.string().max(255).required().messages({
    "string.empty": "請輸入帳號",
    "any.required": "請提供帳號",
  }),
  password: Joi.string().max(255).required().messages({
    "string.empty": "請輸入密碼",
    "any.required": "請提供密碼",
  }),
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(100).required().messages({
    "string.alphanum": "帳號只能包含英文字母和數字",
    "string.min": "帳號至少需要 3 個字元",
    "string.max": "帳號不能超過 100 個字元",
    "any.required": "請提供帳號",
  }),
  email: Joi.string().email().max(255).required().messages({
    "string.email": "請輸入有效的電子郵件",
    "any.required": "請提供電子郵件",
  }),
  password: Joi.string().min(8).max(255).required().messages({
    "string.min": "密碼至少需要 8 個字元",
    "any.required": "請提供密碼",
  }),
});

// ── JWT 簽發 ──────────────────────────────────────────────────────
function signToken(userId, username, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET 未設定");

  return jwt.sign(
    { sub: String(userId), username, role },
    secret,
    { expiresIn: "7d", issuer: "neovega-api" }
  );
}

/**
 * POST /api/auth/login
 *
 * 驗證邏輯：
 * 1. 比對 ROOT_ID / ROOT_PASSWORD 環境變數 → superadmin（不需資料庫）
 * 2. 查詢 PostgreSQL users 表，bcrypt 比對密碼 → user
 * 3. 皆不符合 → 拒絕登入
 */
router.post("/login", async (req, res) => {
  try {
    console.log("[Auth] Login attempt, body keys:", Object.keys(req.body || {}));

    // ── 輸入驗證 ──────────────────────────────────
    const { error: validationError, value } = loginSchema.validate(req.body, { abortEarly: true });
    if (validationError) {
      return error(res, validationError.details[0].message, 400);
    }

    const { username, password } = value;
    console.log("[Auth] Validated username:", username);

    // ── 超級管理員驗證（環境變數，無需資料庫）────────
    const ROOT_ID = process.env.ROOT_ID;
    const ROOT_PASSWORD = process.env.ROOT_PASSWORD;

    console.log("[Auth] ROOT_ID set:", !!ROOT_ID, "ROOT_PASSWORD set:", !!ROOT_PASSWORD);

    if (!ROOT_ID || !ROOT_PASSWORD) {
      console.error("[Auth] ROOT_ID or ROOT_PASSWORD not configured!");
      return error(res, "伺服器設定錯誤", 500);
    }

    const isRootUser = safeEqual(username, ROOT_ID) && safeEqual(password, ROOT_PASSWORD);
    console.log("[Auth] isRootUser:", isRootUser);

    if (isRootUser) {
      const token = signToken("root", username, "superadmin");
      return success(res, {
        token,
        user: { id: "root", username, role: "superadmin" },
      }, "歡迎，超級管理員");
    }

    // ── 一般用戶驗證（資料庫）────────────────────────
    const dbAvailable = !!process.env.DATABASE_URL;
    if (!dbAvailable) {
      return error(res, "帳號或密碼錯誤", 401);
    }

    const result = await db.query(
      "SELECT id, username, email, password_hash, role FROM users WHERE username = $1 AND is_active = TRUE",
      [username]
    );

    if (result.rows.length === 0) {
      return error(res, "帳號或密碼錯誤", 401);
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return error(res, "帳號或密碼錯誤", 401);
    }

    const token = signToken(user.id, user.username, user.role);
    return success(res, {
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    }, "登入成功");
  } catch (err) {
    console.error("[Auth] Login error:", err.stack || err.message);
    return error(res, "伺服器錯誤，請稍後再試", 500);
  }
});

/**
 * POST /api/auth/register
 * 用戶註冊，密碼以 bcrypt 加密後存入資料庫
 */
router.post("/register", async (req, res) => {
  const { error: validationError, value } = registerSchema.validate(req.body, { abortEarly: true });
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { username, email, password } = value;

  if (!process.env.DATABASE_URL) {
    return error(res, "資料庫未設定，無法完成註冊", 503);
  }

  try {
    // 檢查帳號/信箱是否已存在
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existing.rows.length > 0) {
      return error(res, "帳號或電子郵件已被使用", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, role)
			 VALUES ($1, $2, $3, 'user')
			 RETURNING id, username, email, role`,
      [username, email, passwordHash]
    );

    const newUser = result.rows[0];
    const token = signToken(newUser.id, newUser.username, newUser.role);

    return success(res, {
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
    }, "註冊成功", 201);
  } catch (err) {
    console.error("[Auth] Register error:", err.message);
    return error(res, "伺服器錯誤，請稍後再試", 500);
  }
});

/**
 * GET /api/auth/me
 * 取得當前登入用戶資訊（需 Bearer Token）
 */
const { authenticate } = require("../middleware/auth");

router.get("/me", authenticate, async (req, res) => {
  // superadmin 來自環境變數，不需查詢資料庫
  if (req.user.id === "root") {
    return success(res, {
      id: "root",
      username: req.user.username,
      role: "superadmin",
    });
  }

  if (!process.env.DATABASE_URL) {
    return success(res, req.user);
  }

  try {
    const result = await db.query(
      "SELECT id, username, email, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return error(res, "用戶不存在", 404);
    }

    return success(res, result.rows[0]);
  } catch (err) {
    console.error("[Auth] Me error:", err.message);
    return error(res, "伺服器錯誤", 500);
  }
});

/**
 * Timing-safe string comparison（防 timing attack）
 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    const padded = Buffer.alloc(bufA.length);
    bufB.copy(padded);
    crypto.timingSafeEqual(bufA, padded);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = router;
