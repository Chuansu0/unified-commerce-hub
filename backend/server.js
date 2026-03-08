const express = require("express");
const { corsMiddleware } = require("./middleware/cors");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────
app.use(express.json());
app.use(corsMiddleware);

// ── Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);

// Health check（Zeabur 用於服務偵測）
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[NeoVega API] Running on port ${PORT}`);
  console.log(`[NeoVega API] ROOT_ID configured: ${!!process.env.ROOT_ID}`);
});
