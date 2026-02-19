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
 * Day 5: ✅ CashAddr decode — real HASH160 extraction via libauth
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { startListener } from './listener.js';
import { signAttestation } from './signer.js';
import { broadcastSwipe } from './broadcaster.js';
import { resolveRecipientHash } from './cashaddr.js';
import { binToHex } from '@bitauth/libauth';

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
  console.log(`   User:      ${swipe.user_id}`);
  console.log(`   Recipient: ${swipe.bch_recipient}`);
  console.log(`   Amount:    $${swipe.amount_usd} → ${swipe.amount_bch ?? '?'} BCH`);
  console.log(`   Nonce:     ${swipe.nonce}`);

  try {
    // Decode CashAddr (or raw hex hash) → 20-byte HASH160
    const recipientHash = resolveRecipientHash(swipe.bch_recipient);
    console.log(`   🔗 HASH160: ${binToHex(recipientHash)}`);

    const attestation = await signAttestation(config.oraclePrivateKey, {
      bchRecipientHash: recipientHash,
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

    // 🚀 Day 7: Broadcaster Integration
    try {
      console.log('   🚀 Broadcasting to BCH Chipnet...');
      
      // Prepare swipe object with the new attestation data for the broadcaster
      const attestedSwipe = {
        ...swipe,
        oracle_signature: attestation.signature,
        oracle_message: attestation.message,
      };

      const txId = await broadcastSwipe(attestedSwipe);
      
      // Update swipe status to CONFIRMED in Supabase
      const { error: confirmError } = await supabase
        .from('swipes')
        .update({
          status: 'CONFIRMED',
          bch_tx_hash: txId,
          bch_confirmed_at: new Date().toISOString(),
        })
        .eq('id', swipe.id);

        if (confirmError) {
          console.error(`   ❌ Failed to confirm swipe: ${confirmError.message}`);
        } else {
          console.log(`   ✅ Status: ATTESTED → CONFIRMED`);
          console.log(`   🔗 Explorer: https://chipnet.chaingraph.cash/tx/${txId}`);
        }

    } catch (broadcastErr: any) {
      const errMsg = broadcastErr.message || broadcastErr;
      console.error(`   ❌ Broadcast failed: ${errMsg}`);
      
      // Log to file for debugging
      try {
        const fs = await import('fs');
        const logMsg = `[${new Date().toISOString()}] Swipe ${swipe.id} Broadcast Error: ${errMsg}\nStack: ${broadcastErr.stack}\n\n`;
        fs.appendFileSync('broadcast_error.log', logMsg);
        console.log('   📄 Error logged to apps/oracle/broadcast_error.log');
      } catch (fsErr) {
        console.error('   ⚠️ Failed to write to log file.');
      }

      // Note: We leave it as ATTESTED so it can be retried or debugged manually, 
      // or the user can broadcast it themselves via frontend if we built that flow.
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
console.log('   CashAddr: ACTIVE (libauth decoder)');
console.log('   Press Ctrl+C to stop.');
