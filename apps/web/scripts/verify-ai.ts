import dotenv from 'dotenv';
import path from 'path';
import { parseNaturalLanguage } from '../lib/gemini';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testParsing() {
  const inputs = [
    "pay 0.5 for cup of coffee",
    "send $0.5 to merchant",
    "pay $1.5 for tea"
  ];

  console.log("🚀 Starting AI Parsing Verification...");
  
  for (const input of inputs) {
    console.log(`\n📝 Input: "${input}"`);
    try {
      const result = await parseNaturalLanguage(input);
      console.log(`✅ Result: ${JSON.stringify(result.raw, null, 2)}`);
      console.log(`📊 Model: ${result.model} | Latency: ${result.latencyMs}ms`);
    } catch (err: any) {
      console.error(`❌ Failed: ${err.message}`);
    }
  }
}

testParsing();
