import { NextRequest, NextResponse } from "next/server";
import { defaultPIIService } from "@/lib/ai/pii";
import { Role } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, viewer_role = "Complainant", is_privileged = false } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text string is required for PII extraction and redaction." },
        { status: 400 }
      );
    }

    const redaction = defaultPIIService.redact(
      text,
      viewer_role as Role,
      Boolean(is_privileged)
    );

    return NextResponse.json({
      success: true,
      viewer_role,
      is_privileged: Boolean(is_privileged),
      redaction,
    });
  } catch (err: any) {
    console.error("PII Redaction error:", err);
    return NextResponse.json(
      { error: "Failed to process entity extraction and PII redaction." },
      { status: 500 }
    );
  }
}
