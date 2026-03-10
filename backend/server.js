/**
 * NeoVega Backend Server - PocketBase 簡化版
 * 只處理 Telegram Webhook 和 AI 服務
 * 資料存取由前端直接連接 PocketBase
 */
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const { corsMiddleware } = require("./middleware/cors");
const chatRoutes = require("./routes/chat");
const telegramRoutes = require("./routes/telegram");
const telegramBindRoutes = require("./routes/telegramBind");

const app = express();
const PORT = process.env.PORT || 3000;

// ── 信任反向代理 ────────────────────────────────
app.set("trust proxy", 1);

// ── Middleware ──────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);

// ── Rate Limiting ───────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: "請求過於頻繁，請稍後再試" },
});

app.use(globalLimiter);

// ── API Routes（只保留 Telegram & AI）──────────
app.use("/api/chat", chatRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/telegram-bind", telegramBindRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mode: "pocketbase",
    services: {
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      openclaw: !!process.env.OPENCLAW_API_URL,
    },
  });
});

// ── 前端靜態檔案 ────────────────────────────────
const distPath = path.join(__dirname, "../dist");
const hasDistFolder = fs.existsSync(path.join(distPath, "index.html"));

if (hasDistFolder) {
  console.log("[NeoVega API] Serving frontend from", distPath);
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.log("[NeoVega API] No frontend build found, API-only mode");
  app.get("/", (_req, res) => {
    res.json({
      name: "NeoVega API (PocketBase Mode)",
      version: "2.0.0",
      status: "running",
      note: "Frontend not built. Access via /api/* endpoints.",
    });
  });
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });
}

// ── Global Error Handler ────────────────────────
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: "無效的 JSON 格式" });
  }
  console.error("[Server] Unhandled error:", err.stack || err.message);
  res.status(500).json({ success: false, message: "伺服器內部錯誤" });
});

// ── Start ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[NeoVega API] Running on port ${PORT}`);
  console.log(`[NeoVega API] Mode: PocketBase (simplified)`);
  console.log(`[NeoVega API] Telegram: ${!!process.env.TELEGRAM_BOT_TOKEN ? "configured" : "not configured"}`);
  console.log(`[NeoVega API] OpenClaw: ${!!process.env.OPENCLAW_API_URL ? "configured" : "not configured"}`);
});