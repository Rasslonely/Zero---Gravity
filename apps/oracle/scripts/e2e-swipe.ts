import { createClient } from '@supabase/supabase-js';
import { ElectrumNetworkProvider } from 'cashscript';
import { config } from '../src/config.js';
import { randomUUID } from 'crypto';

// Initialize Clients
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const provider = new ElectrumNetworkProvider('chipnet');

const TEST_USER_ID = randomUUID(); // New random user for this test
const RECIPIENT_ADDR = 'bchtest:qpd9x25dwms0hqfqf7f0aa65ebb0371a292df23f9c'; // Faucet return address (safe)
const AMOUNT_USD = 0.5;
const AMOUNT_BCH = 0.00015;

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 ZERO-GRAVITY: END-TO-END SWIPE TEST (Day 8)');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // 1. Create Test User
    console.log(`\n👤 Creating Test User: ${TEST_USER_ID}`);
    const { error: userError } = await supabase.from('users').insert({
      id: TEST_USER_ID,
      starknet_address: `0x${randomUUID().replace(/-/g, '')}`, // Fake address
      bch_address: null
    });
    if (userError) throw new Error(`User creation failed: ${userError.message}`);
    console.log('   ✅ User created.');

    // 2. Insert PENDING Swipe
    const swipeId = randomUUID();
    const nonce = Math.floor(Date.now() / 1000);
    console.log(`\n➡️  Initiating Swipe: ${swipeId}`);
    console.log(`   Amount: $${AMOUNT_USD} (${AMOUNT_BCH} BCH)`);
    
    const startTime = Date.now();
    const { error: swipeError } = await supabase.from('swipes').insert({
      id: swipeId,
      user_id: TEST_USER_ID,
      amount_usd: AMOUNT_USD,
      amount_bch: AMOUNT_BCH,
      bch_recipient: RECIPIENT_ADDR,
      nonce: nonce,
      status: 'PENDING',
      starknet_tx_hash: `0x${randomUUID().replace(/-/g, '')}`, // Fake hash
      starknet_block: 123456
    });

    if (swipeError) throw new Error(`Swipe insertion failed: ${swipeError.message}`);
    console.log('   ✅ Swipe PENDING. Waiting for Oracle...');

    // 3. Poll for Completion
    let status = 'PENDING';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    let bchTxHash = '';

    while (status !== 'CONFIRMED' && status !== 'FAILED' && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      
      const { data } = await supabase
        .from('swipes')
        .select('status, bch_tx_hash')
        .eq('id', swipeId)
        .single();
      
      if (data) {
        if (data.status !== status) {
          console.log(`\n🔄 Status Update: ${status} → ${data.status}`);
          status = data.status;
        }
        if (data.bch_tx_hash) {
          bchTxHash = data.bch_tx_hash;
        }
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (status === 'CONFIRMED') {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🏆 SWIPE SUCCESSFUL! (The Golden Record)');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`⏱️  Total Latency: ${duration}s`);
      console.log(`🔗 BCH TX Hash:   ${bchTxHash}`);
      console.log(`🌍 Explorer:      https://chipnet.chaingraph.cash/tx/${bchTxHash}`);

      // 4. Verify On-Chain
      console.log('\n🔍 Verifying On-Chain...');
      // CashScript provider might throw if TX not found immediately
      // retry a few times
      let txFound = false;
      for (let i=0; i<5; i++) {
        try {
           // getTransaction returns full tx object or throws
           // Note: provider.getTransaction returns boolean or object depending on version? 
           // ElectrumNetworkProvider returns simple hex in getRawTransaction or object details.
           // checking logic...
           // checking 'getRawTransaction' usually.
          await provider.getRawTransaction(bchTxHash);
          txFound = true;
          break;
        } catch (e) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (txFound) {
         console.log('   ✅ TX Verified on Chipnet Mempool/Block');
      } else {
         console.warn('   ⚠️ TX not found on node yet (propagation delay?)');
      }

    } else {
      console.error(`\n❌ SWIPE FAILED. Status: ${status}`);
      throw new Error('Timeout or Failure');
    }

  } catch (err: any) {
    console.error(`\n💥 Fatal Error: ${err.message}`);
    process.exit(1);
  }
}

main();
