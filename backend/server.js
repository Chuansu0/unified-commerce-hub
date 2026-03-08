require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { corsMiddleware } = require("./middleware/cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 3000;

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
  message: { success: false, message: "請求過於頻繁，請稍後再試" },
});

// 登入端點加強限制：每 15 分鐘最多 10 次（防暴力破解）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "嘗試次數過多，請 15 分鐘後再試" },
  skipSuccessfulRequests: true, // 成功登入不計入次數
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
  console.error("[Server] Unhandled error:", err.message);
  res.status(500).json({ success: false, message: "伺服器內部錯誤" });
});

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[NeoVega API] Running on port ${PORT}`);
  console.log(`[NeoVega API] ROOT_ID configured: ${!!process.env.ROOT_ID}`);
  console.log(`[NeoVega API] JWT_SECRET configured: ${!!process.env.JWT_SECRET}`);
  console.log(`[NeoVega API] Database configured: ${!!process.env.DATABASE_URL}`);
});
