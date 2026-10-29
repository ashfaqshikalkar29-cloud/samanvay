import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { computeWatchlist, DEFAULT_WATCHLIST_CONFIG } from "@/lib/watchlist";
import { DEMO_TODAY } from "@/lib/mock";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minComplaints = searchParams.get("min_complaints")
      ? parseInt(searchParams.get("min_complaints")!, 10)
      : DEFAULT_WATCHLIST_CONFIG.minComplaints;
    const windowMonths = searchParams.get("window_months")
      ? parseInt(searchParams.get("window_months")!, 10)
      : DEFAULT_WATCHLIST_CONFIG.windowMonths;

    const repo = getRepo();
    const { complaints, institutions } = await repo.loadAll();

    const watchlisted = computeWatchlist(
      complaints,
      institutions,
      { minComplaints, windowMonths },
      DEMO_TODAY
    );

    return NextResponse.json({
      success: true,
      config: {
        min_complaints: minComplaints,
        window_months: windowMonths,
        reference_date: DEMO_TODAY,
      },
      total_watchlisted: watchlisted.length,
      institutes: watchlisted,
    });
  } catch (err: any) {
    console.error("Watchlist API error:", err);
    return NextResponse.json({ error: "Failed to generate repeat-offender watchlist." }, { status: 500 });
  }
}
