import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config.js';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function main() {
  console.log('🔍 Checking Swipes Table...');
  const { data: swipes, error } = await supabase
    .from('swipes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching swipes:', error);
    return;
  }

  if (swipes.length === 0) {
    console.log('   No swipes found.');
  } else {
    swipes.forEach(s => {
      console.log(`\n📌 ID: ${s.id}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Amount: $${s.amount_usd} (${s.amount_bch} BCH)`);
      if (s.bch_tx_hash) console.log(`   🔗 TX: ${s.bch_tx_hash}`);
      console.log(`   Created: ${new Date(s.created_at).toLocaleTimeString()}`);
    });
  }
}

main();
