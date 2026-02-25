import { NextResponse } from 'next/server';
import { parseNaturalLanguage } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    console.log(`🧠 Parsing NL intent: "${prompt}"`);

    // Use the robust waterfall logic from lib/gemini
    // This handles key rotation and model fallback automatically
    const result = await parseNaturalLanguage(prompt);

    // If the model returned an intentional error (NOT_A_PAYMENT)
    if ('error' in result.raw) {
      return NextResponse.json(result.raw, { status: 400 });
    }

    return NextResponse.json(result.raw);

  } catch (error: any) {
    console.error("❌ Critical Parse Error:", error);
    
    // Return a structured error instead of a misleading success mock
    return NextResponse.json({ 
      error: "PARSE_FAILED", 
      message: error.message || "Failed to parse transaction intent" 
    }, { status: 500 });
  }
}
