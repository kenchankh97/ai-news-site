-- Your AI News - PostgreSQL Schema
-- Run once against your Railway PostgreSQL database: node scripts/initDb.js

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) UNIQUE NOT NULL,
    password_hash        VARCHAR(255),
    display_name         VARCHAR(100),
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    verify_token         VARCHAR(255),
    verify_token_expires TIMESTAMPTZ,
    reset_token          VARCHAR(255),
    reset_token_expires  TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token) WHERE verify_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- =====================
-- USER PREFERENCES TABLE (1:1 with users)
-- =====================
CREATE TABLE IF NOT EXISTS user_preferences (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language     VARCHAR(10) NOT NULL DEFAULT 'en',
    categories   TEXT[] NOT NULL DEFAULT ARRAY['ai-business','ai-technology','ai-ethics','ai-research'],
    email_digest BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_prefs_user_id ON user_preferences(user_id);

-- =====================
-- NEWS ARTICLES TABLE (cache from GNews + LLM summaries)
-- =====================
CREATE TABLE IF NOT EXISTS news_articles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gnews_url     TEXT UNIQUE NOT NULL,
    title_en      TEXT NOT NULL,
    title_zh_tw   TEXT,
    title_zh_cn   TEXT,
    summary_en    TEXT,
    summary_zh_tw TEXT,
    summary_zh_cn TEXT,
    source_name   VARCHAR(255),
    source_url    TEXT,
    image_url     TEXT,
    category      VARCHAR(50) NOT NULL DEFAULT 'ai-technology',
    published_at  TIMESTAMPTZ,
    fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_id      VARCHAR(20),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_category   ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON news_articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_batch_id   ON news_articles(batch_id);
CREATE INDEX IF NOT EXISTS idx_articles_is_active  ON news_articles(is_active) WHERE is_active = TRUE;

-- =====================
-- SESSIONS TABLE (for refresh token storage and revocation)
-- =====================
CREATE TABLE IF NOT EXISTS sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) UNIQUE NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh    ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- =====================
-- AUTO-UPDATE updated_at TRIGGERS
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prefs_updated_at ON user_preferences;
CREATE TRIGGER trg_prefs_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
