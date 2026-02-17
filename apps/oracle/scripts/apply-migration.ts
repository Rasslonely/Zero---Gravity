/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Apply Database Migration to Supabase
 * ═══════════════════════════════════════════════════════
 *
 * Reads the 001_initial.sql migration and applies it to
 * the Supabase database via the REST API (service_role key).
 *
 * Usage:
 *   node --import tsx/esm scripts/apply-migration.ts
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('📦 Applying database migration...');

  const sqlPath = resolve(__dirname, '..', '..', '..', 'supabase', 'migrations', '001_initial.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Split into individual statements (naive split on semicolons)
  // Filter empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`   Found ${statements.length} SQL statements`);

  // Execute via Supabase RPC (raw SQL)
  // Note: Supabase JS client doesn't support arbitrary SQL.
  // Use the REST API directly.
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt }),
      });
      
      if (!response.ok) {
        console.log(`   ⚠️  [${i + 1}/${statements.length}] ${preview}...`);
        console.log(`       Status: ${response.status} (may already exist)`);
      } else {
        console.log(`   ✅ [${i + 1}/${statements.length}] ${preview}...`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  [${i + 1}/${statements.length}] ${preview}... (${err.message})`);
    }
  }

  console.log('');
  console.log('💡 If statements failed, copy supabase/migrations/001_initial.sql');
  console.log('   and paste it directly into the Supabase Dashboard SQL Editor:');
  console.log(`   ${supabaseUrl}/project/default/sql`);
}

main();
