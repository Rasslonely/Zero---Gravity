import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config.js'; // Ensure correct path
import { randomUUID } from 'crypto';

// Re-initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey); // Use Service Role to bypass RLS for test insertion

async function main() {
  console.log('🧪 Starting End-to-End Broadcast Test...');
  console.log('   Target: BCH Chipnet');

  // 1. Create a persistent test user if not exists (or use existing)
  // We need a user ID. Let's create a dummy user or fetch one.
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  let userId: string;

  if (user) {
    userId = user.id;
    console.log(`   👤 Using existing user: ${userId}`);
  } else {
    // Create dummy user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        starknet_address: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Dummy STARKNET address
        bch_address: 'bchtest:qrm295874830303030303030303030303030303030', // Dummy BCH address
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create test user:', createError);
      process.exit(1);
    }
    userId = newUser.id;
    console.log(`   👤 Created test user: ${userId}`);
  }

  // 2. Insert PENDING Swipe
  const recipientAddr = 'bchtest:qpd9x25dwms0hqfqf7f0aa65ebb0371a292df23f9c'; // A valid testnet address (random or faucet return address)
  // Use a faucet return address or just a random one. Or the one from Day 2.
  // Let's use the one from Day 2 logs: `bchtest:p0rcmcclq2uz5qvk0h6wlmrjj4zrtvz3qsucm7txe5jzh8d9x25dwms0hqfqf` is covenant.
  // Address `bchtest:qpd9x25dwms0hqfqf7f0aa65ebb0371a292df23f9c` is standard P2PKH length.
  
  const testSwipe = {
    user_id: userId,
    amount_usd: 0.50, // 50 cents
    amount_bch: 0.00015000, // ~15000 sats
    bch_recipient: recipientAddr, 
    nonce: Math.floor(Date.now() / 1000), // Unique nonce
    status: 'PENDING',
    starknet_tx_hash: '0x' + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''), // Fake hash
    starknet_block: 123456,
  };

  console.log('   ➡️ Inserting PENDING swipe...');
  const { data: swipe, error: insertError } = await supabase
    .from('swipes')
    .insert(testSwipe)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    process.exit(1);
  }

  console.log(`   ✅ Swipe inserted. ID: ${swipe.id}`);
  console.log('   ⏳ Waiting for Oracle to pick it up...');

  // 3. Poll for status change
  let attempts = 0;
  const maxAttempts = 20; // 20 * 2s = 40s timeout

  const interval = setInterval(async () => {
    attempts++;
    const { data: updated, error: pollError } = await supabase
      .from('swipes')
      .select('status, bch_tx_hash')
      .eq('id', swipe.id)
      .single();
    
    if (pollError) {
      console.error('   ⚠️ Poll error:', pollError.message);
      return; // Keep trying
    }

    process.stdout.write(`\r   🔄 Check ${attempts}/${maxAttempts}: ${updated.status}   `);

    if (updated.status === 'CONFIRMED') {
      clearInterval(interval);
      console.log('\n\n✅ SUCCESS! Swipe CONFIRMED.');
      console.log(`   🔗 BCH TX: https://chipnet.chaingraph.cash/tx/${updated.bch_tx_hash}`);
      process.exit(0);
    } else if (updated.status === 'FAILED') {
      clearInterval(interval);
      console.log('\n\n❌ FAILURE! Swipe FAILED.');
      process.exit(1);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.log('\n\n❌ TIMEOUT! Oracle did not confirm in time.');
      process.exit(1);
    }
  }, 2000);

}

main().catch(err => console.error(err));
