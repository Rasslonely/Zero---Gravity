/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Manual Swipe Test (BCH Chipnet)
 * ═══════════════════════════════════════════════════════
 *
 * Tests the swipe() function on the deployed ShadowCard covenant.
 * Constructs an oracle message, signs with BCH Schnorr, and calls swipe().
 * Uses the CashScript v0.12 TransactionBuilder API.
 *
 * Prerequisites:
 *   1. Compile + deploy: `npm run compile && npm run deploy`
 *   2. Fund the covenant with tBCH from faucet
 *   3. Set env vars in .env
 *
 * Usage:
 *   npm run swipe
 *   # or: npx tsx scripts/swipe.ts
 */

import dotenv from 'dotenv';
import {
  Contract,
  ElectrumNetworkProvider,
  TransactionBuilder,
  SignatureTemplate,
} from 'cashscript';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  instantiateSecp256k1,
  instantiateSha256,
  hexToBin,
  binToHex,
  hash160,
} from '@bitauth/libauth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root (3 levels up from scripts/)
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// ── Config ──────────────────────────────────────────────
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing env var: ${key}`);
    process.exit(1);
  }
  return val;
}

const ORACLE_PRIVATE_KEY = requireEnv('ORACLE_PRIVATE_KEY');
const BCH_OWNER_PRIVATE_KEY = requireEnv('BCH_OWNER_PRIVATE_KEY');

// ── Paths ───────────────────────────────────────────────
const CONTRACT_DIR = resolve(__dirname, '..');
const ARTIFACT_PATH = resolve(CONTRACT_DIR, 'artifacts/ShadowCard.json');

// ── Helpers ─────────────────────────────────────────────
function writeLittleEndianU64(buf: Uint8Array, offset: number, val: bigint) {
  for (let i = 0; i < 8; i++) {
    buf[offset + i] = Number((val >> BigInt(i * 8)) & 0xFFn);
  }
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log('⚡ Zero-Gravity: Testing swipe() on BCH Chipnet...');

  // Initialize crypto primitives
  const secp256k1 = await instantiateSecp256k1();
  const sha256 = await instantiateSha256();

  // 1. Derive keys
  const oraclePriv = hexToBin(ORACLE_PRIVATE_KEY);
  const ownerPriv = hexToBin(BCH_OWNER_PRIVATE_KEY);
  const oraclePubKeyResult = secp256k1.derivePublicKeyCompressed(oraclePriv);
  const ownerPubKeyResult = secp256k1.derivePublicKeyCompressed(ownerPriv);
  if (typeof oraclePubKeyResult === 'string') throw new Error(oraclePubKeyResult);
  if (typeof ownerPubKeyResult === 'string') throw new Error(ownerPubKeyResult);

  const oraclePubKey = binToHex(oraclePubKeyResult);
  const ownerPubKey = binToHex(ownerPubKeyResult);
  const ownerPubKeyBytes = ownerPubKeyResult;

  // 2. Load contract
  const provider = new ElectrumNetworkProvider('chipnet');
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'));
  const contract = new Contract(artifact, [oraclePubKey, ownerPubKey], {
    provider,
  });

  console.log(`   Covenant: ${contract.address}`);

  // 3. Check covenant balance
  const utxos = await contract.getUtxos();
  const totalSats = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0n);
  console.log(`   Balance: ${totalSats} sats (${utxos.length} UTXOs)`);

  if (totalSats === 0n) {
    console.error('❌ Covenant has no funds. Send tBCH to:', contract.address);
    process.exit(1);
  }

  // 4. Create a test recipient (use owner's pubkey hash as recipient)
  const recipientHash = hash160(ownerPubKeyBytes);

  // 5. Pack oracle message: <recipientHash:20><amountSats:8><nonce:8>
  const amountSats = 1000n; // 0.00001 BCH — tiny test amount
  const nonce = 1n;

  const oracleMessage = new Uint8Array(36);
  oracleMessage.set(new Uint8Array(recipientHash), 0);
  writeLittleEndianU64(oracleMessage, 20, amountSats);
  writeLittleEndianU64(oracleMessage, 28, nonce);

  console.log(`   Recipient hash: ${binToHex(recipientHash)}`);
  console.log(`   Amount: ${amountSats} sats`);
  console.log(`   Nonce: ${nonce}`);

  // 6. Oracle signs the message (BCH Schnorr via checkDataSig)
  //    BCH checkDataSig hashes the message with SHA256 before verifying,
  //    so we hash it ourselves and pass the hash to signMessageHashSchnorr
  const messageHash = sha256.hash(oracleMessage);
  const oracleDataSig = secp256k1.signMessageHashSchnorr(oraclePriv, messageHash);

  if (typeof oracleDataSig === 'string') {
    console.error('❌ Schnorr signing failed:', oracleDataSig);
    process.exit(1);
  }

  console.log(`   Oracle datasig: ${binToHex(oracleDataSig).substring(0, 40)}...`);

  // 7. Build the swipe transaction using CashScript v0.12 TransactionBuilder
  const userSigTemplate = new SignatureTemplate(ownerPriv);

  const txBuilder = new TransactionBuilder({ provider });

  // Add contract UTXO as input, unlocked via swipe()
  txBuilder.addInput(
    utxos[0],
    contract.unlock.swipe(
      oracleDataSig,                   // datasig oracleSig
      oracleMessage,                   // bytes oracleMessage
      userSigTemplate,                 // sig userSig
      ownerPubKeyBytes                 // pubkey userPubKey
    )
  );

  // Output MUST be P2PKH matching recipientHash (the covenant enforces this!)
  // P2PKH lockingBytecode = OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG
  // = 76a914 + recipientHash(20 bytes) + 88ac
  const p2pkhLockingBytecode = new Uint8Array(25);
  p2pkhLockingBytecode[0] = 0x76; // OP_DUP
  p2pkhLockingBytecode[1] = 0xa9; // OP_HASH160
  p2pkhLockingBytecode[2] = 0x14; // PUSH 20 bytes
  p2pkhLockingBytecode.set(recipientHash, 3);
  p2pkhLockingBytecode[23] = 0x88; // OP_EQUALVERIFY
  p2pkhLockingBytecode[24] = 0xac; // OP_CHECKSIG

  txBuilder.addOutput({
    to: p2pkhLockingBytecode,
    amount: amountSats,
  });

  console.log('   📡 Broadcasting swipe transaction...');
  const tx = await txBuilder.send();

  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ SWIPE SUCCESSFUL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   TX Hash: ${tx.txid}`);
  console.log(`   Explorer: https://chipnet.imaginary.cash/tx/${tx.txid}`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Swipe test failed:', err.message || err);
  process.exit(1);
});
