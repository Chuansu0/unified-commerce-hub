/**
 * Telegram 整合資料庫 Migration
 * 執行方式：node db/migrate-telegram.js
 */
require("dotenv").config();
const { pool } = require("./index");

const SQL_TELEGRAM = `
-- ── 修改 users 表，加入 Telegram 欄位 ────────────────────────────
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telegram_bound_at TIMESTAMPTZ;

-- ── Telegram 綁定碼表 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_bind_codes (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bind_code    VARCHAR(50) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 對話表 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 訊息表 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('web', 'telegram')),
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 索引 ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_telegram_bind_codes_user_id ON telegram_bind_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_bind_codes_bind_code ON telegram_bind_codes(bind_code);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ── 自動更新 conversations.updated_at 觸發器 ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_conversations') THEN
    CREATE TRIGGER set_timestamp_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;
`;

async function runTelegramMigration(customPool) {
    const p = customPool || pool;
    const client = await p.connect();
    try {
        console.log("[Telegram Migration] 開始建立 Telegram 整合資料表...");
        await client.query(SQL_TELEGRAM);
        console.log("[Telegram Migration] ✅ Telegram 資料表建立完成");
    } catch (err) {
        console.error("[Telegram Migration] ❌ 錯誤:", err.message);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    runTelegramMigration()
        .catch(() => process.exit(1))
        .finally(() => pool.end());
}

module.exports = { runTelegramMigration };
