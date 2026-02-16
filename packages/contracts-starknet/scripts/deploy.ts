/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Deploy Vault to Starknet Sepolia
 * ═══════════════════════════════════════════════════════
 *
 * Uses starknet.js (no starkli required).
 *
 * Prerequisites:
 *   1. Build contract: `scarb build` (in WSL)
 *   2. Set env vars in .env:
 *      - STARKNET_RPC_URL (Alchemy Sepolia endpoint)
 *      - DEPLOYER_PRIVATE_KEY (Argent X account private key)
 *      - DEPLOYER_ADDRESS (Argent X account address)
 *
 * Usage:
 *   npx tsx packages/contracts-starknet/scripts/deploy.ts
 */

import 'dotenv/config';
import { RpcProvider, Account, Contract, json, CallData } from 'starknet';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Config ──────────────────────────────────────────────
const RPC_URL = requireEnv('STARKNET_RPC_URL');
const DEPLOYER_PRIVATE_KEY = requireEnv('DEPLOYER_PRIVATE_KEY');
const DEPLOYER_ADDRESS = requireEnv('DEPLOYER_ADDRESS');

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing env var: ${key}`);
    console.error('   Copy .env.example → .env and fill in all values.');
    process.exit(1);
  }
  return val;
}

// ── Paths to compiled artifacts ─────────────────────────
// After `scarb build`, these appear in target/dev/
const CONTRACT_DIR = resolve(__dirname, '..');
const SIERRA_PATH = resolve(CONTRACT_DIR, 'target/dev/zero_gravity_vault_Vault.contract_class.json');
const CASM_PATH = resolve(CONTRACT_DIR, 'target/dev/zero_gravity_vault_Vault.compiled_contract_class.json');

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log('🚀 Zero-Gravity: Deploying Vault to Starknet Sepolia...');
  console.log(`   RPC: ${RPC_URL}`);
  console.log(`   Deployer: ${DEPLOYER_ADDRESS}`);
  console.log();

  // 1. Initialize provider + account
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, DEPLOYER_ADDRESS, DEPLOYER_PRIVATE_KEY);

  // Verify account connectivity
  const chainId = await provider.getChainId();
  console.log(`📡 Connected to chain: ${chainId}`);

  // 2. Read compiled contract artifacts
  console.log('📦 Reading contract artifacts...');
  let sierraContract: any;
  let casmContract: any;

  try {
    sierraContract = json.parse(readFileSync(SIERRA_PATH, 'utf-8'));
    casmContract = json.parse(readFileSync(CASM_PATH, 'utf-8'));
  } catch (err) {
    console.error('❌ Could not read compiled contract artifacts.');
    console.error('   Make sure to run `scarb build` first (in WSL):');
    console.error(`   wsl -d Ubuntu -- bash -lc "cd '${CONTRACT_DIR}' && scarb build"`);
    process.exit(1);
  }

  // 3. Declare the contract class
  console.log('📝 Declaring contract class...');
  const declareResponse = await account.declare({
    contract: sierraContract,
    casm: casmContract,
  });
  console.log(`   TX Hash: ${declareResponse.transaction_hash}`);
  console.log(`   Class Hash: ${declareResponse.class_hash}`);
  console.log('   ⏳ Waiting for confirmation...');
  await provider.waitForTransaction(declareResponse.transaction_hash);
  console.log('   ✅ Contract class declared!');
  console.log();

  // 4. Deploy an instance
  console.log('🏗️  Deploying contract instance...');
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: CallData.compile({}), // No constructor args
  });
  console.log(`   TX Hash: ${deployResponse.transaction_hash}`);
  console.log('   ⏳ Waiting for confirmation...');
  await provider.waitForTransaction(deployResponse.transaction_hash);

  // Get the deployed contract address
  const contractAddress = deployResponse.contract_address;
  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ VAULT DEPLOYED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Class Hash:       ${declareResponse.class_hash}`);
  console.log(`   Explorer:         https://sepolia.voyager.online/contract/${contractAddress}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  console.log('📋 Add to your .env:');
  console.log(`   VAULT_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err.message || err);
  process.exit(1);
});
