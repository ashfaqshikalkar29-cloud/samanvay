import { NextRequest, NextResponse } from "next/server";
import { defaultTranslator } from "@/lib/ai/translation";
import { SupportedLanguage } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, target_language = "en" } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text string is required for auto-translation." },
        { status: 400 }
      );
    }

    const validLangs: SupportedLanguage[] = ["en", "hi", "mr", "ta", "bn", "te"];
    if (!validLangs.includes(target_language as SupportedLanguage)) {
      return NextResponse.json(
        { error: `Invalid target_language. Supported: ${validLangs.join(", ")}` },
        { status: 400 }
      );
    }

    const translation = await defaultTranslator.translate(
      text,
      target_language as SupportedLanguage
    );

    return NextResponse.json({
      success: true,
      translation,
    });
  } catch (err: any) {
    console.error("Auto-translation error:", err);
    return NextResponse.json(
      { error: "Failed to process translation." },
      { status: 500 }
    );
  }
}
