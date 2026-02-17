/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Seed Liquidity Pool in Supabase
 * ═══════════════════════════════════════════════════════
 *
 * Inserts (or upserts) the BCH covenant address into the
 * `liquidity_pool` table with the actual on-chain balance
 * fetched from Chipnet via ElectrumNetworkProvider.
 *
 * Idempotent: re-running updates the balance + last_synced_at.
 *
 * Usage:
 *   npm run seed-liquidity
 *   # or: node --import tsx/esm scripts/seed-liquidity.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  Contract,
  ElectrumNetworkProvider,
} from 'cashscript';
import { instantiateSecp256k1, hexToBin, binToHex } from '@bitauth/libauth';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// ── Env ─────────────────────────────────────────────────
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing env var: ${key}`);
    process.exit(1);
  }
  return val;
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const ORACLE_PRIVATE_KEY = requireEnv('ORACLE_PRIVATE_KEY');
const BCH_OWNER_PRIVATE_KEY = requireEnv('BCH_OWNER_PRIVATE_KEY');

const ARTIFACT_PATH = resolve(__dirname, '..', '..', '..', 'packages', 'contracts-bch', 'artifacts', 'ShadowCard.json');

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('💧 ZERO-GRAVITY: Seeding Liquidity Pool');
  console.log('═══════════════════════════════════════════════════════');

  // 1. Derive public keys to reconstruct covenant address
  const secp256k1 = await instantiateSecp256k1();

  const oraclePriv = hexToBin(ORACLE_PRIVATE_KEY);
  const ownerPriv = hexToBin(BCH_OWNER_PRIVATE_KEY);
  const oraclePubResult = secp256k1.derivePublicKeyCompressed(oraclePriv);
  const ownerPubResult = secp256k1.derivePublicKeyCompressed(ownerPriv);
  if (typeof oraclePubResult === 'string') throw new Error(oraclePubResult);
  if (typeof ownerPubResult === 'string') throw new Error(ownerPubResult);

  const oraclePubKey = binToHex(oraclePubResult);
  const ownerPubKey = binToHex(ownerPubResult);

  // 2. Load covenant contract
  const provider = new ElectrumNetworkProvider('chipnet');
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'));
  const contract = new Contract(artifact, [oraclePubKey, ownerPubKey], { provider });

  const covenantAddress = contract.address;
  console.log(`   📜 Covenant: ${covenantAddress}`);

  // 3. Query on-chain balance
  const utxos = await contract.getUtxos();
  const totalSats = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0n);
  const totalBch = Number(totalSats) / 1e8;

  console.log(`   💰 On-chain: ${totalSats} sats (${totalBch} BCH) across ${utxos.length} UTXOs`);

  // 4. Upsert into Supabase liquidity_pool
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Check if covenant already exists
  const { data: existing } = await supabase
    .from('liquidity_pool')
    .select('id')
    .eq('covenant_address', covenantAddress)
    .maybeSingle();

  if (existing) {
    // Update existing row
    const { error } = await supabase
      .from('liquidity_pool')
      .update({
        total_deposited_bch: totalBch,
        last_synced_at: new Date().toISOString(),
      })
      .eq('covenant_address', covenantAddress);

    if (error) {
      console.error(`   ❌ Update failed: ${error.message}`);
      process.exit(1);
    }
    console.log('   ✅ Updated existing liquidity_pool row');
  } else {
    // Insert new row
    const { error } = await supabase
      .from('liquidity_pool')
      .insert({
        covenant_address: covenantAddress,
        total_deposited_bch: totalBch,
        total_released_bch: 0,
        last_synced_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`   ❌ Insert failed: ${error.message}`);
      process.exit(1);
    }
    console.log('   ✅ Seeded liquidity_pool with covenant');
  }

  // 5. Verify
  const { data: verify, error: verifyErr } = await supabase
    .from('liquidity_pool')
    .select('*')
    .eq('covenant_address', covenantAddress)
    .single();

  if (verifyErr || !verify) {
    console.error('   ❌ Verification failed');
    process.exit(1);
  }

  console.log('');
  console.log('   📋 Liquidity Pool State:');
  console.log(`      Covenant:    ${verify.covenant_address}`);
  console.log(`      Deposited:   ${verify.total_deposited_bch} BCH`);
  console.log(`      Released:    ${verify.total_released_bch} BCH`);
  console.log(`      Available:   ${verify.available_bch} BCH`);
  console.log(`      Last Synced: ${verify.last_synced_at}`);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Liquidity pool seeded successfully!');
  console.log('═══════════════════════════════════════════════════════');

  // Disconnect from Electrum
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err.message || err);
  process.exit(1);
});
