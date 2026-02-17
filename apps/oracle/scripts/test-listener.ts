/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Test Oracle Listener
 * ═══════════════════════════════════════════════════════
 *
 * Inserts a test PENDING swipe into the Supabase `swipes` table
 * to verify the Oracle listener picks it up via Realtime.
 *
 * Prerequisites:
 *   1. `swipes` table must exist (run migration first)
 *   2. Oracle daemon must be running: `npm run dev`
 *   3. Env vars set in .env
 *
 * Usage:
 *   node --import tsx/esm scripts/test-listener.ts
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧪 Testing Oracle Listener...');
  console.log('   Make sure `npm run dev` is running in another terminal!');
  console.log('');

  // First, ensure we have a test user (or create one)
  const testStarknetAddr = '0x0000000000000000000000000000000000000000000000000000000000000001';
  
  let userId: string;
  
  // Try to find existing test user
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('starknet_address', testStarknetAddr)
    .single();

  if (existingUser) {
    userId = existingUser.id;
    console.log(`   Found test user: ${userId}`);
  } else {
    // Create test user
    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({ starknet_address: testStarknetAddr, bch_address: 'bchtest:qz2nqfpf' })
      .select('id')
      .single();

    if (userErr) {
      console.error('❌ Failed to create test user:', userErr.message);
      console.error('   Have you applied the migration? Run:');
      console.error('   node --import tsx/esm scripts/apply-migration.ts');
      console.error('   Or paste supabase/migrations/001_initial.sql into the SQL Editor.');
      process.exit(1);
    }
    userId = newUser!.id;
    console.log(`   Created test user: ${userId}`);
  }

  // Insert a test swipe
  const testSwipe = {
    user_id: userId,
    nonce: Date.now(), // unique nonce
    amount_usd: 5.00,
    amount_bch: 0.00025,
    bch_recipient: 'bchtest:qz2nqfpf',
    status: 'PENDING',
    starknet_tx_hash: `0x${randomUUID().replace(/-/g, '')}`,
  };

  console.log('   Inserting test PENDING swipe...');
  const { data: swipe, error: swipeErr } = await supabase
    .from('swipes')
    .insert(testSwipe)
    .select()
    .single();

  if (swipeErr) {
    console.error('❌ Failed to insert test swipe:', swipeErr.message);
    console.error('   Details:', swipeErr);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ TEST SWIPE INSERTED');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   ID:      ${swipe.id}`);
  console.log(`   Amount:  $${swipe.amount_usd} → ${swipe.amount_bch} BCH`);
  console.log(`   Status:  ${swipe.status}`);
  console.log(`   Nonce:   ${swipe.nonce}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('👀 Check the Oracle terminal — it should log:');
  console.log('   📡 New PENDING swipe detected: ' + swipe.id);
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exit(1);
});
