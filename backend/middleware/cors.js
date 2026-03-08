const cors = require("cors");

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const corsMiddleware = cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

module.exports = { corsMiddleware };
