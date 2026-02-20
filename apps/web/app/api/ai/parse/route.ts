import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the API Key
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      // Mocked response for demo purposes if no API key is set
      return NextResponse.json({
        amount: 5,
        currency: 'USD',
        memo: 'Test Coffee',
        confidence: 0.95
      });
    }

    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Strict system prompt for deterministic JSON output
    const systemPrompt = `You are the Zero-Gravity NLP parser. Extract payment intent from the user text.
Return ONLY valid JSON, with EXACTLY these keys:
- amount (number)
- currency (string, e.g., 'USD', 'ETH')
- memo (string, short description)
- confidence (number between 0.0 and 1.0)

Example text: "pay 5 bucks for coffee"
Example JSON: {"amount": 5, "currency": "USD", "memo": "Coffee", "confidence": 0.98}

Text: "${prompt}"`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().trim();
    
    // Clean markdown code blocks if present
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanJson);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    return NextResponse.json({ error: "Failed to parse intent. Please try standard format (e.g., Pay $5 for coffee)." }, { status: 500 });
  }
}
