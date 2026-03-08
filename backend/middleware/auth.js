const jwt = require("jsonwebtoken");
const { error } = require("../utils/response");

/**
 * JWT 驗證中介層
 * 從 Authorization: Bearer <token> 標頭中解析 JWT
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return error(res, "未提供認證 Token，請先登入", 401);
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error("[Auth Middleware] JWT_SECRET 未設定！");
        return error(res, "伺服器設定錯誤", 500);
    }

    try {
        const payload = jwt.verify(token, secret);
        req.user = {
            id: payload.sub,
            username: payload.username,
            role: payload.role,
        };
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return error(res, "Token 已過期，請重新登入", 401);
        }
        return error(res, "無效的 Token", 401);
    }
}

/**
 * 角色驗證中介層（需搭配 authenticate 使用）
 * @param {...string} roles - 允許的角色名稱
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return error(res, "未授權", 401);
        }
        if (!roles.includes(req.user.role)) {
            return error(res, "權限不足", 403);
        }
        next();
    };
}

module.exports = { authenticate, requireRole };
