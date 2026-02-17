/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Shadow Oracle Daemon
 * ═══════════════════════════════════════════════════════
 *
 * The Oracle listens for SolvencySignals via Supabase Realtime,
 * signs cryptographic attestations, and broadcasts BCH transactions
 * to release liquidity from the Shadow Covenant.
 *
 * Day 3: Listener wired up — logs incoming PENDING swipes.
 * Day 4: Signer will be wired in to produce attestations.
 */

import { config } from './config.js';
import { startListener } from './listener.js';

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔮 ZERO-GRAVITY: Shadow Oracle Daemon');
console.log('═══════════════════════════════════════════════════════');
console.log(`📡 Supabase:  ${config.supabaseUrl}`);
console.log(`🔑 Oracle:    ${config.oraclePrivateKey.substring(0, 8)}...`);
console.log(`⛓️  Covenant:  ${config.covenantAddress || 'not set'}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');

startListener((swipe) => {
  console.log('');
  console.log('⚡ ── INCOMING SWIPE ──────────────────────────────');
  console.log(`   ID:        ${swipe.id}`);
  console.log(`   User:      ${swipe.user_address}`);
  console.log(`   Recipient: ${swipe.bch_recipient}`);
  console.log(`   Amount:    $${swipe.amount_usd} → ${swipe.amount_bch} BCH`);
  console.log(`   Nonce:     ${swipe.nonce}`);
  console.log('   Status:    PENDING → awaiting signer (Day 4)');
  console.log('──────────────────────────────────────────────────────');
  console.log('');

  // Day 4: Wire signer here
  // const attestation = signAttestation(config.oraclePrivateKey, { ... });
  // await supabase.from('swipes').update({ status: 'ATTESTED', ... });
});

console.log('✅ Oracle is listening for PENDING swipes...');
console.log('   Press Ctrl+C to stop.');
