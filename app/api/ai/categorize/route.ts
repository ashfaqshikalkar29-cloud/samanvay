import { NextRequest, NextResponse } from "next/server";
import { defaultCategorizer } from "@/lib/ai/categorizer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, description, dynamic_fields } = body;
    const grievanceText = description || text;

    if (!grievanceText || typeof grievanceText !== "string" || grievanceText.trim().length === 0) {
      return NextResponse.json(
        { error: "Grievance text or description is required for auto-categorisation." },
        { status: 400 }
      );
    }

    const prediction = await defaultCategorizer.predict(grievanceText, dynamic_fields || {});

    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (err: any) {
    console.error("AI Categorisation error:", err);
    return NextResponse.json(
      { error: "Failed to auto-categorise grievance." },
      { status: 500 }
    );
  }
}
