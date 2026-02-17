/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Signer Unit Tests
 * ═══════════════════════════════════════════════════════
 *
 * 3 tests for the Oracle attestation signer:
 *   1. Sign + verify round-trip
 *   2. Deterministic signatures (same input → same output)
 *   3. Different nonce → different signature
 *
 * Run:
 *   npm test
 *   # or: node --import tsx/esm --test test/signer.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signAttestation, verifyAttestation, packOracleMessage } from '../src/signer.js';
import { hexToBin, binToHex } from '@bitauth/libauth';

// Test oracle private key (DO NOT use in production)
const TEST_ORACLE_KEY = '4e76972049fd3dcc0aab42eba3e1e38f75ac5261dbaa52c3cd72bbb564c60e1e';

// Test recipient hash (20 bytes — simulated HASH160)
const TEST_RECIPIENT = hexToBin('0e521510b2d62a7d4014b7630f00f8d59f64521e');

describe('Oracle Signer', () => {

  it('test_sign_valid: should produce a valid Schnorr signature', async () => {
    const result = await signAttestation(TEST_ORACLE_KEY, {
      bchRecipientHash: TEST_RECIPIENT,
      amountSatoshis: 1000n,
      nonce: 1n,
    });

    // Signature should be 64 bytes (Schnorr)
    assert.equal(result.signature.length, 64, 'Signature must be 64 bytes');

    // Message should be 36 bytes
    assert.equal(result.message.length, 36, 'Message must be 36 bytes');

    // Public key should be 33 bytes (compressed)
    assert.equal(result.publicKey.length, 33, 'Public key must be 33 bytes (compressed)');

    // Verify the signature
    const valid = await verifyAttestation(result.signature, result.message, result.publicKey);
    assert.ok(valid, 'Signature verification must pass');

    console.log('   ✅ Signature valid:', binToHex(result.signature).substring(0, 32) + '...');
    console.log('   ✅ Public key:', binToHex(result.publicKey));
  });

  it('test_deterministic: same inputs should produce identical signatures', async () => {
    const input = {
      bchRecipientHash: TEST_RECIPIENT,
      amountSatoshis: 5000n,
      nonce: 42n,
    };

    const result1 = await signAttestation(TEST_ORACLE_KEY, input);
    const result2 = await signAttestation(TEST_ORACLE_KEY, input);

    assert.deepEqual(result1.signature, result2.signature, 'Signatures must be identical');
    assert.deepEqual(result1.message, result2.message, 'Messages must be identical');
    assert.deepEqual(result1.publicKey, result2.publicKey, 'Public keys must be identical');

    console.log('   ✅ Deterministic: both signatures =', binToHex(result1.signature).substring(0, 32) + '...');
  });

  it('test_different_nonce: different nonce should produce different signatures', async () => {
    const result1 = await signAttestation(TEST_ORACLE_KEY, {
      bchRecipientHash: TEST_RECIPIENT,
      amountSatoshis: 1000n,
      nonce: 1n,
    });

    const result2 = await signAttestation(TEST_ORACLE_KEY, {
      bchRecipientHash: TEST_RECIPIENT,
      amountSatoshis: 1000n,
      nonce: 2n,
    });

    // Signatures MUST differ (different nonce → different message → different sig)
    assert.notDeepEqual(result1.signature, result2.signature, 'Signatures must differ with different nonces');

    // Messages should also differ
    assert.notDeepEqual(result1.message, result2.message, 'Messages must differ with different nonces');

    console.log('   ✅ Nonce 1 sig:', binToHex(result1.signature).substring(0, 32) + '...');
    console.log('   ✅ Nonce 2 sig:', binToHex(result2.signature).substring(0, 32) + '...');
  });
});
