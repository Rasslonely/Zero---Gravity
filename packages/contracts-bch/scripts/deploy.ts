/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Deploy ShadowCard to BCH Chipnet
 * ═══════════════════════════════════════════════════════
 *
 * Deploys the ShadowCard covenant and prints the covenant address.
 * User manually sends tBCH via faucet to seed liquidity.
 *
 * Prerequisites:
 *   1. Compile first: `npm run compile`
 *   2. Set env vars in .env:
 *      - ORACLE_PRIVATE_KEY (hex, 32 bytes — secp256k1 private key)
 *      - BCH_OWNER_PRIVATE_KEY (hex, 32 bytes — LP owner key)
 *
 * Usage:
 *   npm run deploy
 *   # or: npx tsx scripts/deploy.ts
 */

import dotenv from 'dotenv';
import {
  Contract,
  ElectrumNetworkProvider,
} from 'cashscript';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { instantiateSecp256k1, hexToBin, binToHex } from '@bitauth/libauth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root (3 levels up from scripts/)
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// ── Config ──────────────────────────────────────────────
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing env var: ${key}`);
    console.error('   Copy .env.example → .env and fill in all values.');
    process.exit(1);
  }
  return val;
}

const ORACLE_PRIVATE_KEY = requireEnv('ORACLE_PRIVATE_KEY');
const BCH_OWNER_PRIVATE_KEY = requireEnv('BCH_OWNER_PRIVATE_KEY');

// ── Paths ───────────────────────────────────────────────
const CONTRACT_DIR = resolve(__dirname, '..');
const ARTIFACT_PATH = resolve(CONTRACT_DIR, 'artifacts/ShadowCard.json');

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log('🚀 Zero-Gravity: Deploying ShadowCard to BCH Chipnet...');

  // 1. Check artifact exists
  if (!existsSync(ARTIFACT_PATH)) {
    console.error('❌ Artifact not found. Run `npm run compile` first.');
    process.exit(1);
  }

  // 2. Derive public keys from private keys using libauth
  const secp256k1 = await instantiateSecp256k1();

  const oraclePriv = hexToBin(ORACLE_PRIVATE_KEY);
  const ownerPriv = hexToBin(BCH_OWNER_PRIVATE_KEY);

  const oraclePubKeyResult = secp256k1.derivePublicKeyCompressed(oraclePriv);
  const ownerPubKeyResult = secp256k1.derivePublicKeyCompressed(ownerPriv);
  if (typeof oraclePubKeyResult === 'string') throw new Error(oraclePubKeyResult);
  if (typeof ownerPubKeyResult === 'string') throw new Error(ownerPubKeyResult);

  const oraclePubKey = binToHex(oraclePubKeyResult);
  const ownerPubKey = binToHex(ownerPubKeyResult);

  console.log(`   Oracle PubKey: ${oraclePubKey}`);
  console.log(`   Owner PubKey:  ${ownerPubKey}`);

  // 3. Create network provider (Chipnet)
  const provider = new ElectrumNetworkProvider('chipnet');

  // 4. Load artifact and instantiate contract
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'));
  const contract = new Contract(artifact, [oraclePubKey, ownerPubKey], {
    provider,
  });

  const covenantAddress = contract.address;
  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ SHADOWCARD COVENANT READY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Covenant Address:  ${covenantAddress}`);
  console.log(`   Oracle Public Key: ${oraclePubKey}`);
  console.log(`   Owner Public Key:  ${ownerPubKey}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  console.log('📋 Next steps:');
  console.log(`   1. Send tBCH to the covenant address: ${covenantAddress}`);
  console.log('   2. Use the BCH Chipnet faucet: https://tbch.googol.cash/');
  console.log('   3. Add to your .env:');
  console.log(`      COVENANT_ADDRESS=${covenantAddress}`);
  console.log();
  console.log(`🔍 Explorer: https://chipnet.imaginary.cash/address/${covenantAddress}`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err.message || err);
  process.exit(1);
});
