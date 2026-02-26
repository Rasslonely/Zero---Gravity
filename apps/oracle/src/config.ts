/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Oracle Configuration
 * ═══════════════════════════════════════════════════════
 *
 * Loads and validates all required environment variables.
 * Fail-fast: throws immediately if any required var is missing.
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root (if exists)
const envPath = resolve(__dirname, '..', '..', '..', '.env');
dotenv.config({ path: envPath });

// ── Validation ──────────────────────────────────────────
// In production (Dewacloud), we rely on system environment variables, 
// so we don't crash if the .env file itself is missing, as long as the vars exist.
function requireEnv(key: string): string {
  const val = process.env[key];
  if (val) return val;

  // Try common variations (with/without NEXT_PUBLIC_)
  const alternativeKey = key.startsWith('NEXT_PUBLIC_') 
    ? key.replace('NEXT_PUBLIC_', '') 
    : `NEXT_PUBLIC_${key}`;
  
  const altVal = process.env[alternativeKey];
  if (altVal) {
    console.log(`ℹ️  Using environment variable fallback: ${key} -> ${alternativeKey}`);
    return altVal;
  }

  console.error(`❌ Missing required env var: ${key} (and tried ${alternativeKey})`);
  console.error('   In production: Set this in the Dewacloud "Variables" UI.');
  process.exit(1);
}

// ── Exported Config ─────────────────────────────────────

export const config = {
  // Supabase
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // Oracle signing key (secp256k1 hex)
  oraclePrivateKey: requireEnv('ORACLE_PRIVATE_KEY'),

  // BCH owner key (secp256k1 hex — signs user-side of covenant TX)
  bchOwnerPrivateKey: requireEnv('BCH_OWNER_PRIVATE_KEY'),

  // Starknet
  starknetRpcUrl: process.env.STARKNET_RPC_URL || '',

  // BCH
  bchElectrumServer: process.env.BCH_ELECTRUM_SERVER || 'wss://chipnet.imaginary.cash:50004',
  covenantAddress: process.env.COVENANT_ADDRESS || '',

  // Paths
  covenantArtifactPath: resolve(__dirname, '..', '..', '..', 'packages', 'contracts-bch', 'artifacts', 'ShadowCard.json'),
} as const;
