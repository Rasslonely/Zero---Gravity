/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Compile ShadowCard Covenant
 * ═══════════════════════════════════════════════════════
 *
 * Compiles ShadowCard.cash → artifacts/ShadowCard.json
 * Uses the `cashc` compiler package (separate from cashscript SDK since v0.12).
 *
 * Usage:
 *   npm run compile
 *   # or: npx tsx scripts/compile.ts
 */

import { compileFile } from 'cashc';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTRACT_DIR = resolve(__dirname, '..');
const SOURCE_PATH = resolve(CONTRACT_DIR, 'contracts/ShadowCard.cash');
const ARTIFACT_DIR = resolve(CONTRACT_DIR, 'artifacts');
const ARTIFACT_PATH = resolve(ARTIFACT_DIR, 'ShadowCard.json');

async function main() {
  console.log('🔨 Compiling ShadowCard.cash...');
  console.log(`   Source: ${SOURCE_PATH}`);

  // Compile the CashScript contract using the cashc compiler
  const artifact = compileFile(new URL(`file://${SOURCE_PATH}`));

  // Create artifacts directory if it doesn't exist
  if (!existsSync(ARTIFACT_DIR)) {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // Write artifact JSON
  writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2));

  console.log(`   ✅ Artifact written: ${ARTIFACT_PATH}`);
  console.log(`   Contract name: ${artifact.contractName}`);
  console.log(`   Bytecode size: ${artifact.bytecode.length} chars`);
  console.log(`   Constructor params: ${artifact.constructorInputs.map((i: any) => `${i.type} ${i.name}`).join(', ')}`);
}

main().catch((err) => {
  console.error('❌ Compilation failed:', err.message || err);
  process.exit(1);
});
