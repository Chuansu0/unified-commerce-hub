const express = require("express");
const crypto = require("crypto");
const router = express.Router();

/**
 * POST /api/auth/login
 *
 * 驗證邏輯：
 * 1. 比對 ROOT_ID / ROOT_PASSWORD 環境變數 → superadmin
 * 2. 未來可擴充資料庫查詢 → user
 * 3. 皆不符合 → 拒絕登入
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // ── 輸入驗證 ──────────────────────────────────
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      role: "guest",
      message: "請提供帳號與密碼",
    });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      role: "guest",
      message: "輸入格式錯誤",
    });
  }

  // 長度限制，防止過長輸入
  if (username.length > 255 || password.length > 255) {
    return res.status(400).json({
      success: false,
      role: "guest",
      message: "輸入超過長度限制",
    });
  }

  // ── 超級管理員驗證 ─────────────────────────────
  const ROOT_ID = process.env.ROOT_ID;
  const ROOT_PASSWORD = process.env.ROOT_PASSWORD;

  if (!ROOT_ID || !ROOT_PASSWORD) {
    console.error("[Auth] ROOT_ID or ROOT_PASSWORD not configured!");
    return res.status(500).json({
      success: false,
      role: "guest",
      message: "伺服器設定錯誤",
    });
  }

  // 使用 timing-safe 比對防止 timing attack
  const isRootUser = safeEqual(username, ROOT_ID) && safeEqual(password, ROOT_PASSWORD);

  if (isRootUser) {
    return res.json({
      success: true,
      role: "superadmin",
      message: "歡迎，超級管理員",
    });
  }

  // ── 一般用戶驗證（TODO: 接入資料庫）──────────────
  // 目前尚未接入資料庫，所有非 ROOT 帳號均拒絕登入。
  // CLINE 可在此處擴充：查詢 PostgreSQL / MongoDB 用戶表。
  //
  // 範例：
  // const user = await db.users.findOne({ username });
  // if (user && await bcrypt.compare(password, user.passwordHash)) {
  //   return res.json({ success: true, role: "user", message: "登入成功" });
  // }

  return res.status(401).json({
    success: false,
    role: "guest",
    message: "帳號或密碼錯誤",
  });
});

/**
 * Timing-safe string comparison
 * 防止透過回應時間差異推測密碼內容
 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // 長度不同時仍執行比對，避免洩漏長度資訊
    const padded = Buffer.alloc(bufA.length);
    bufB.copy(padded);
    crypto.timingSafeEqual(bufA, padded);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = router;
