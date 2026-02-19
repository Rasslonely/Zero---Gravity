import { TransactionBuilder, ElectrumNetworkProvider } from 'cashscript';

const provider = new ElectrumNetworkProvider('chipnet');
const builder = new TransactionBuilder({ provider });

console.log('--- TransactionBuilder Prototype ---');
const proto = Object.getPrototypeOf(builder);
console.log(Object.getOwnPropertyNames(proto));

console.log('--- TransactionBuilder Keys ---');
console.log(Object.keys(builder));
