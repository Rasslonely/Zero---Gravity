/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Shadow Oracle Daemon
 * ═══════════════════════════════════════════════════════
 *
 * The Oracle listens for SolvencySignals via Supabase Realtime,
 * signs cryptographic attestations, and updates swipe status
 * to ATTESTED in Supabase.
 *
 * Day 3: ✅ Listener wired — logs incoming PENDING swipes
 * Day 4: ✅ Signer wired — produces attestations + updates DB
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { startListener } from './listener.js';
import { signAttestation } from './signer.js';
import { hexToBin, binToHex, hash160 } from '@bitauth/libauth';

// Initialize Supabase client for DB updates
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔮 ZERO-GRAVITY: Shadow Oracle Daemon');
console.log('═══════════════════════════════════════════════════════');
console.log(`📡 Supabase:  ${config.supabaseUrl}`);
console.log(`🔑 Oracle:    ${config.oraclePrivateKey.substring(0, 8)}...`);
console.log(`⛓️  Covenant:  ${config.covenantAddress || 'not set'}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');

startListener(async (swipe) => {
  console.log('');
  console.log('⚡ ── INCOMING SWIPE ──────────────────────────────');
  console.log(`   ID:        ${swipe.id}`);
  console.log(`   User:      ${swipe.user_address}`);
  console.log(`   Recipient: ${swipe.bch_recipient}`);
  console.log(`   Amount:    $${swipe.amount_usd} → ${swipe.amount_bch} BCH`);
  console.log(`   Nonce:     ${swipe.nonce}`);

  try {
    // Convert BCH recipient to HASH160 (for now, use raw bytes or a placeholder)
    // In production, this would decode the CashAddr to get the hash
    const recipientHashHex = swipe.bch_recipient.length === 40
      ? swipe.bch_recipient  // Already a hex hash
      : '0000000000000000000000000000000000000000'; // Placeholder for CashAddr decode

    const attestation = await signAttestation(config.oraclePrivateKey, {
      bchRecipientHash: hexToBin(recipientHashHex),
      amountSatoshis: BigInt(Math.round((swipe.amount_bch || 0) * 1e8)),
      nonce: BigInt(swipe.nonce),
    });

    console.log(`   🔏 Signature: ${binToHex(attestation.signature).substring(0, 40)}...`);
    console.log(`   📦 Message:   ${binToHex(attestation.message)}`);
    console.log(`   🔑 PubKey:    ${binToHex(attestation.publicKey)}`);

    // Update swipe status to ATTESTED in Supabase
    const { error } = await supabase
      .from('swipes')
      .update({
        status: 'ATTESTED',
        oracle_signature: Buffer.from(attestation.signature).toString('base64'),
        oracle_message: Buffer.from(attestation.message).toString('base64'),
        attested_at: new Date().toISOString(),
      })
      .eq('id', swipe.id);

    if (error) {
      console.error(`   ❌ Failed to update swipe: ${error.message}`);
    } else {
      console.log(`   ✅ Status: PENDING → ATTESTED`);
    }
  } catch (err: any) {
    console.error(`   ❌ Signing failed: ${err.message}`);

    // Mark as FAILED
    await supabase
      .from('swipes')
      .update({ status: 'FAILED' })
      .eq('id', swipe.id);
  }

  console.log('──────────────────────────────────────────────────────');
  console.log('');
});

console.log('✅ Oracle is listening for PENDING swipes...');
console.log('   Signer: ACTIVE (BCH Schnorr via @bitauth/libauth)');
console.log('   Press Ctrl+C to stop.');
