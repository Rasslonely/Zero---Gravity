-- =============================================================
-- ZERO-GRAVITY: Migration 002 — Widen address columns
-- =============================================================
-- 
-- Problem: P2SH32 CashAddr addresses (bchtest:p...) are 72 chars,
-- exceeding the original VARCHAR(54) limit designed for P2PKH.
--
-- This migration widens all BCH address columns to VARCHAR(80)
-- to accommodate P2SH32 (covenant addresses).
--
-- Applied: Phase 2 (Day 5) via Supabase Dashboard SQL Editor
-- =============================================================

-- Widen users.bch_address
ALTER TABLE users ALTER COLUMN bch_address TYPE VARCHAR(80);

-- Widen swipes.bch_recipient
ALTER TABLE swipes ALTER COLUMN bch_recipient TYPE VARCHAR(80);

-- Widen liquidity_pool.covenant_address
ALTER TABLE liquidity_pool ALTER COLUMN covenant_address TYPE VARCHAR(80);
