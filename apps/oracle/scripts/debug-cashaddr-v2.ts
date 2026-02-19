import { decodeCashAddress, CashAddressType } from '@bitauth/libauth';
import { decodeCashAddr } from '../src/cashaddr.js';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.resolve('debug_results.log');
const log = (msg: string) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

// Clear log
fs.writeFileSync(logFile, '');

log('--- START DEBUG ---');
const addr = 'bchtest:qpd9x25dwms0hqfqf7f0aa65ebb0371a292df23f9c';
log(`Testing Address: "${addr}"`);
log(`Address Length: ${addr.length}`);
log(`Char codes: ${addr.split('').map(c => c.charCodeAt(0)).join(',')}`);

// 1. Test src/cashaddr.ts wrapper
try {
  log('\n1. src/cashaddr.ts wrapper:');
  const res = decodeCashAddr(addr);
  log(`   SUCCESS: ${res}`);
} catch (e: any) {
  log(`   FAILED: ${e.message}`);
}

// 2. Test libauth direct
try {
  log('\n2. libauth direct:');
  const res = decodeCashAddress(addr);
  log(`   Result Type: ${typeof res}`);
  if (typeof res === 'string') {
    log(`   ERROR String: ${res}`);
  } else {
    log(`   SUCCESS Payload: ${res.payload}`);
    log(`   SUCCESS Prefix: ${res.prefix}`);
  }
} catch (e: any) {
  log(`   EXCEPTION: ${e.message}`);
}

// 3. Test splitting manually
try {
  log('\n3. Manual Split:');
  const parts = addr.split(':');
  log(`   Parts: ${JSON.stringify(parts)}`);
  if (parts.length > 1) {
    const payload = parts[1];
    log(`   Payload only: "${payload}"`);
    // Try decoding just payload? (Likely fail as it lacks prefix context)
    const res = decodeCashAddress(payload);
    log(`   Result for payload-only: ${typeof res === 'string' ? res : 'OBJECT'}`);
  }
} catch (e: any) {
  log(`   EXCEPTION: ${e.message}`);
}

// 4. Test explicit prefix if supported?
// Inspect function signature?
log('\n4. Function Check:');
log(`   decodeCashAddress.length (args): ${decodeCashAddress.length}`);

log('--- END DEBUG ---');
