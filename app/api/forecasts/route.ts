import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { defaultAnalyticsEngine } from "@/lib/ai/analytics";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const horizonParam = searchParams.get("horizon");
    const horizonWeeks = horizonParam ? parseInt(horizonParam, 10) : 8;

    const repo = getRepo();
    const { complaints, institutions } = await repo.loadAll();

    const forecasts = defaultAnalyticsEngine.generateForecast(
      complaints,
      institutions,
      Math.min(12, Math.max(4, horizonWeeks))
    );

    return NextResponse.json({
      success: true,
      analytics: forecasts,
    });
  } catch (err: any) {
    console.error("Predictive analytics error:", err);
    return NextResponse.json(
      { error: "Failed to generate predictive forecasts." },
      { status: 500 }
    );
  }
}
