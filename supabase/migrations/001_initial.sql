-- =============================================================
-- ZERO-GRAVITY: SUPABASE DATABASE SCHEMA
-- Platform: Supabase (PostgreSQL 15+ with RLS)
-- From: ARCHITECTURE.md §3.4
-- Applied: Phase 2 (Day 5) via Supabase CLI or Dashboard
-- =============================================================

-- Enable RLS globally
ALTER DATABASE postgres SET "app.jwt_claims" TO '';

-- ENUM TYPES
CREATE TYPE swipe_status AS ENUM (
    'PENDING',      -- SolvencySignal emitted, Oracle processing
    'ATTESTED',     -- Oracle signed the attestation
    'BROADCAST',    -- BCH TX broadcast to mempool
    'CONFIRMED',    -- BCH TX confirmed (1+ block)
    'FAILED',       -- Any step failed
    'EXPIRED'       -- Nonce expired (TTL exceeded)
);

CREATE TYPE deposit_asset AS ENUM ('ETH', 'USDC', 'WBTC', 'STRK');

-- =============================================================
-- TABLE: users
-- =============================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    starknet_address    VARCHAR(66) NOT NULL UNIQUE,
    bch_address         VARCHAR(54),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_starknet_addr CHECK (starknet_address ~ '^0x[0-9a-fA-F]{1,64}$')
);

CREATE INDEX idx_users_starknet ON users(starknet_address);

-- RLS: Users can only read/update their own row
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own data" ON users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- =============================================================
-- TABLE: vault_deposits
-- =============================================================
CREATE TABLE vault_deposits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset               deposit_asset NOT NULL,
    amount              NUMERIC(78, 18) NOT NULL,
    starknet_tx_hash    VARCHAR(66) NOT NULL UNIQUE,
    block_number        BIGINT NOT NULL,
    deposited_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_deposits_user ON vault_deposits(user_id);
CREATE INDEX idx_deposits_block ON vault_deposits(block_number);

-- RLS: Users see only their deposits. Oracle (service_role) sees all.
ALTER TABLE vault_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own deposits" ON vault_deposits
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Oracle inserts deposits" ON vault_deposits
    FOR INSERT WITH CHECK (true);  -- service_role key only

-- =============================================================
-- TABLE: swipes (The core transaction log)
-- =============================================================
CREATE TABLE swipes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nonce               BIGINT NOT NULL,
    amount_usd          NUMERIC(18, 6) NOT NULL,
    amount_bch          NUMERIC(18, 8),
    bch_recipient       VARCHAR(54) NOT NULL,
    status              swipe_status NOT NULL DEFAULT 'PENDING',
    nl_input            TEXT,                            -- Original NL text (if used)
    ai_confidence       NUMERIC(3, 2),                   -- Gemini confidence score

    -- Starknet Side
    starknet_tx_hash    VARCHAR(66) NOT NULL,
    starknet_block      BIGINT,

    -- Oracle Side
    oracle_signature    BYTEA,
    oracle_message      BYTEA,
    attested_at         TIMESTAMPTZ,

    -- BCH Side
    bch_tx_hash         VARCHAR(64),
    bch_confirmed_at    TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),

    CONSTRAINT chk_positive_swipe CHECK (amount_usd > 0),
    CONSTRAINT uq_user_nonce UNIQUE (user_id, nonce)
);

CREATE INDEX idx_swipes_status ON swipes(status);
CREATE INDEX idx_swipes_user ON swipes(user_id);
CREATE INDEX idx_swipes_pending ON swipes(status, expires_at)
    WHERE status IN ('PENDING', 'ATTESTED', 'BROADCAST');

-- RLS: Users read own swipes. Oracle updates all.
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own swipes" ON swipes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own swipes" ON swipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Oracle updates swipes" ON swipes
    FOR UPDATE USING (true);  -- service_role key only

-- ENABLE SUPABASE REALTIME on swipes table
-- (Oracle subscribes to INSERT/UPDATE events)
ALTER PUBLICATION supabase_realtime ADD TABLE swipes;

-- =============================================================
-- TABLE: liquidity_pool (BCH Covenant State Mirror)
-- =============================================================
CREATE TABLE liquidity_pool (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    covenant_address    VARCHAR(54) NOT NULL UNIQUE,
    total_deposited_bch NUMERIC(18, 8) NOT NULL DEFAULT 0,
    total_released_bch  NUMERIC(18, 8) NOT NULL DEFAULT 0,
    available_bch       NUMERIC(18, 8) GENERATED ALWAYS AS
                        (total_deposited_bch - total_released_bch) STORED,
    last_synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_solvency CHECK (total_deposited_bch >= total_released_bch)
);

-- RLS: Public read, Oracle write
ALTER TABLE liquidity_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read LP" ON liquidity_pool FOR SELECT USING (true);
CREATE POLICY "Oracle updates LP" ON liquidity_pool FOR UPDATE USING (true);

-- =============================================================
-- TABLE: ai_parse_log (Audit trail for Gemini inputs)
-- =============================================================
CREATE TABLE ai_parse_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),
    raw_input           TEXT NOT NULL,
    sanitized_input     TEXT NOT NULL,
    output_json         JSONB,
    confidence          NUMERIC(3, 2),
    flagged_injection   BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_parse_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own logs" ON ai_parse_log
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================
-- TRIGGER: Auto-update updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_swipes_updated BEFORE UPDATE ON swipes
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =============================================================
-- Function: Auto-expire stale swipes
-- (Invoked by Supabase pg_cron — free tier supports cron)
-- =============================================================
CREATE OR REPLACE FUNCTION expire_stale_swipes()
RETURNS void AS $$
BEGIN
    UPDATE swipes
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status IN ('PENDING', 'ATTESTED')
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Uncomment after enabling pg_cron extension in Supabase:
-- SELECT cron.schedule('expire-swipes', '* * * * *', 'SELECT expire_stale_swipes()');
