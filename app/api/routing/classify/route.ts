import { NextRequest, NextResponse } from "next/server";
import { defaultClassifier } from "@/lib/classifier";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, description, text, dynamic_fields } = body;
    const textDesc = description || text;

    if (!textDesc || typeof textDesc !== "string") {
      return NextResponse.json({ error: "Description or text is required for classification." }, { status: 400 });
    }

    const result = defaultClassifier.classify(category || "", textDesc, dynamic_fields);

    return NextResponse.json({
      success: true,
      classification: result,
    });
  } catch (err: any) {
    console.error("Classifier API error:", err);
    return NextResponse.json({ error: "Failed to classify grievance." }, { status: 500 });
  }
}
