require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { corsMiddleware } = require("./middleware/cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const { runMigration } = require("./db/migrate");

const app = express();
const PORT = process.env.PORT || 3000;

// ── 信任反向代理（Zeabur / Cloudflare）────────────
// 必須在 rate-limit 之前設定，否則 X-Forwarded-For 驗證失敗
app.set("trust proxy", 1);

// ── Middleware ────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);

// ── Rate Limiting ─────────────────────────────────
// 全域限制：每 15 分鐘最多 300 次請求（防 DDoS）
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // 關閉 x-forwarded-for 額外驗證（已由 trust proxy 處理）
  message: { success: false, message: "請求過於頻繁，請稍後再試" },
});

// 登入端點加強限制：每 15 分鐘最多 10 次（防暴力破解）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // 關閉 x-forwarded-for 額外驗證
  message: { success: false, message: "嘗試次數過多，請 15 分鐘後再試" },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);

// ── Routes ───────────────────────────────────────
app.use("/api/auth/login", loginLimiter); // 登入限制套用在 router 之前
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Health check（Zeabur 用於服務偵測）
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: !!process.env.DATABASE_URL,
  });
});

// ── 404 ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

// ── Global Error Handler ──────────────────────────
app.use((err, _req, res, _next) => {
  // JSON body 解析失敗（express.json 丟出的 SyntaxError）
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: "無效的 JSON 格式" });
  }
  console.error("[Server] Unhandled error:", err.stack || err.message);
  res.status(500).json({ success: false, message: "伺服器內部錯誤" });
});

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[NeoVega API] Running on port ${PORT}`);
  console.log(`[NeoVega API] ROOT_ID configured: ${!!process.env.ROOT_ID}`);
  console.log(`[NeoVega API] JWT_SECRET configured: ${!!process.env.JWT_SECRET}`);
  console.log(`[NeoVega API] Database configured: ${!!process.env.DATABASE_URL}`);

  // 自動執行資料庫初始化（idempotent，安全重複執行）
  if (process.env.DATABASE_URL) {
    runMigration().catch((err) => {
      console.error("[NeoVega API] Migration warning:", err.message);
    });
  }
});
