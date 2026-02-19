import { decodeCashAddr } from '../src/cashaddr.js';
import { decodeCashAddress, CashAddressType } from '@bitauth/libauth';

const addr = 'bchtest:qpd9x25dwms0hqfqf7f0aa65ebb0371a292df23f9c';

console.log(`\n🔍 Debugging CashAddr: ${addr}\n`);

try {
  console.log('1. Testing src/cashaddr.ts wrapper...');
  const result = decodeCashAddr(addr);
  console.log('   ✅ Success:', result);
} catch (err: any) {
  console.error('   ❌ Wrapper Failed:', err.message);
}

console.log('\n2. Testing libauth direct...');
const directResult = decodeCashAddress(addr);
console.log('   Result:', directResult);

if (typeof directResult === 'string') {
  console.error('   ❌ Libauth returned string error:', directResult);
} else {
  console.log('   ✅ Libauth decoded:', directResult);
}

// Test without prefix?
const payload = addr.split(':')[1];
if (payload) {
  console.log(`\n3. Testing payload only: ${payload}`);
  const rawResult = decodeCashAddress(payload);
  console.log('   Result:', rawResult);
}
