import { instantiateSecp256k1, binToHex, hexToBin } from '@bitauth/libauth';
import { ElectrumNetworkProvider } from 'cashscript';
import { config } from '../src/config.js';

async function main() {
  const libauth = await instantiateSecp256k1();
  const provider = new ElectrumNetworkProvider('chipnet');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 Checking Balances (Zero-Gravity Debug)');
  console.log('═══════════════════════════════════════════════════════');

  // 1. Check Covenant Balance
  console.log(`\n🏦 Covenant Address: ${config.covenantAddress}`);
  try {
    const utxos = await provider.getUtxos(config.covenantAddress);
    const balanceSats = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0n);
    console.log(`   💰 Balance: ${Number(balanceSats) / 1e8} BCH (${balanceSats} sats)`);
    console.log(`   📦 UTXO Count: ${utxos.length}`);
    
    if (utxos.length > 0) {
      console.log('   ✅ Covenant HAS FUNDS. Broadcast SHOULD work if logic is correct.');
    } else {
      console.error('   ❌ Covenant is EMPTY! Broadcast WILL FAIL.');
      console.log('   👉 Run `npm run seed-liquidity` to fix this.');
    }
  } catch (err: any) {
    console.error('   ❌ Failed to fetch balance:', err.message);
  }

  // 2. Relayer Check (Simple)
  console.log(`\n👤 Relayer Private Key (Start): ${config.bchOwnerPrivateKey.substring(0, 6)}...`);
  // Note: Deriving address from private key in pure TS without heavy deps is tricky.
  // We assume the Relayer has funds or the Covenant pays fees (as per design).
  
  console.log('\n═══════════════════════════════════════════════════════');
}

main();
