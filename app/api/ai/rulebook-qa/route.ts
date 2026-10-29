import { NextRequest, NextResponse } from "next/server";
import { defaultRulebookQA } from "@/lib/ai/rulebook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, question } = body;
    const prompt = query || question;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Query or question is required for AICTE Rulebook Q&A." },
        { status: 400 }
      );
    }

    const response = await defaultRulebookQA.ask(prompt);

    return NextResponse.json({
      success: true,
      result: response,
    });
  } catch (err: any) {
    console.error("Rulebook Q&A error:", err);
    return NextResponse.json(
      { error: "Failed to query AICTE rulebook knowledge base." },
      { status: 500 }
    );
  }
}
