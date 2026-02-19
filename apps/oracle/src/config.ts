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

// Load .env from monorepo root (3 levels up from src/)
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// ── Validation ──────────────────────────────────────────
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing required env var: ${key}`);
    console.error('   Copy .env.example → .env and fill in all values.');
    process.exit(1);
  }
  return val;
}

// ── Exported Config ─────────────────────────────────────
const oraclePrivateKey = requireEnv('ORACLE_PRIVATE_KEY');
const bchOwnerPrivateKey = requireEnv('BCH_OWNER_PRIVATE_KEY');

console.log('--- CONFIG DEBUG ---');
console.log(`ORACLE_KEY: ${oraclePrivateKey.substring(0, 6)}...`);
console.log(`BCH_OWNER_KEY: ${bchOwnerPrivateKey.substring(0, 6)}...`);
console.log('--------------------');

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
