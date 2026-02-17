/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Oracle Attestation Signer
 * ═══════════════════════════════════════════════════════
 *
 * Produces BCH-compatible Schnorr signatures for checkDataSig
 * verification inside the ShadowCard covenant.
 *
 * Uses @bitauth/libauth for BCH-native EC-Schnorr-SHA256
 * (NOT BIP340 Schnorr — BCH has its own construction).
 *
 * Oracle message format (36 bytes, little-endian):
 *   Bytes  0–19:  recipientHash   (HASH160 of recipient pubkey)
 *   Bytes 20–27:  amountSatoshis  (uint64 LE)
 *   Bytes 28–35:  nonce           (uint64 LE)
 */

import {
  instantiateSecp256k1,
  instantiateSha256,
  hexToBin,
  binToHex,
} from '@bitauth/libauth';
import type { Secp256k1, Sha256 } from '@bitauth/libauth';

// ── Types ───────────────────────────────────────────────
export interface AttestationInput {
  bchRecipientHash: Uint8Array; // 20 bytes (HASH160 of recipient pubkey)
  amountSatoshis: bigint;
  nonce: bigint;
}

export interface AttestationOutput {
  signature: Uint8Array;  // 64 bytes (BCH Schnorr)
  message: Uint8Array;    // 36 bytes (20 + 8 + 8)
  publicKey: Uint8Array;  // 33 bytes (compressed)
}

// ── Helpers ─────────────────────────────────────────────
function writeLittleEndianU64(buf: Uint8Array, offset: number, val: bigint): void {
  for (let i = 0; i < 8; i++) {
    buf[offset + i] = Number((val >> BigInt(i * 8)) & 0xFFn);
  }
}

export function packOracleMessage(input: AttestationInput): Uint8Array {
  if (input.bchRecipientHash.length !== 20) {
    throw new Error(`recipientHash must be 20 bytes, got ${input.bchRecipientHash.length}`);
  }
  if (input.amountSatoshis <= 0n) {
    throw new Error(`amountSatoshis must be positive, got ${input.amountSatoshis}`);
  }

  const message = new Uint8Array(36);
  message.set(input.bchRecipientHash, 0);
  writeLittleEndianU64(message, 20, input.amountSatoshis);
  writeLittleEndianU64(message, 28, input.nonce);
  return message;
}

// ── Singleton Crypto Instances ──────────────────────────
let _secp256k1: Secp256k1 | null = null;
let _sha256: Sha256 | null = null;

async function getCrypto(): Promise<{ secp256k1: Secp256k1; sha256: Sha256 }> {
  if (!_secp256k1) _secp256k1 = await instantiateSecp256k1();
  if (!_sha256) _sha256 = await instantiateSha256();
  return { secp256k1: _secp256k1, sha256: _sha256 };
}

// ── Core Signing Function ───────────────────────────────
/**
 * Signs an attestation for the ShadowCard covenant.
 *
 * BCH `checkDataSig` interprets 64-byte signatures as Schnorr.
 * It hashes the message with SHA256 before verification, so we
 * must hash before signing with `signMessageHashSchnorr`.
 *
 * @param privateKeyHex - Oracle secp256k1 private key (32 bytes hex)
 * @param input - Attestation input (recipient, amount, nonce)
 * @returns Signature, packed message, and public key
 */
export async function signAttestation(
  privateKeyHex: string,
  input: AttestationInput
): Promise<AttestationOutput> {
  const { secp256k1, sha256 } = await getCrypto();

  // 1. Pack message bytes (must match ShadowCard.cash parsing order)
  const message = packOracleMessage(input);

  // 2. Derive public key
  const privateKey = hexToBin(privateKeyHex);
  const pubKeyResult = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof pubKeyResult === 'string') {
    throw new Error(`Invalid private key: ${pubKeyResult}`);
  }

  // 3. Hash message with SHA256 (BCH checkDataSig pre-hashes)
  const messageHash = sha256.hash(message);

  // 4. Sign with BCH Schnorr (EC-Schnorr-SHA256 construction)
  const sigResult = secp256k1.signMessageHashSchnorr(privateKey, messageHash);
  if (typeof sigResult === 'string') {
    throw new Error(`Schnorr signing failed: ${sigResult}`);
  }

  return {
    signature: sigResult,
    message,
    publicKey: pubKeyResult,
  };
}

/**
 * Verify an attestation signature (for testing / debugging).
 */
export async function verifyAttestation(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  const { secp256k1, sha256 } = await getCrypto();
  const messageHash = sha256.hash(message);
  return secp256k1.verifySignatureSchnorr(signature, publicKey, messageHash);
}
