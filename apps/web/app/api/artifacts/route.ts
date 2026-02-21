import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const CONTRACT_DIR = join(process.cwd(), '..', '..', 'packages', 'contracts-starknet');
    
    // File paths based on scarb build output
    const SIERRA_PATH = join(CONTRACT_DIR, 'target', 'dev', 'zero_gravity_vault_Vault.contract_class.json');
    const CASM_PATH = join(CONTRACT_DIR, 'target', 'dev', 'zero_gravity_vault_Vault.compiled_contract_class.json');

    const sierra = JSON.parse(readFileSync(SIERRA_PATH, 'utf-8'));
    const casm = JSON.parse(readFileSync(CASM_PATH, 'utf-8'));

    return NextResponse.json({ sierra, casm });
  } catch (error: any) {
    console.error("API Artifact Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
