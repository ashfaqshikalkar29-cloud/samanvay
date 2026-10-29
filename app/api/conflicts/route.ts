import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";

export async function GET(req: NextRequest) {
  try {
    const repo = getRepo();
    const conflicts = await repo.getConflicts();

    return NextResponse.json({
      success: true,
      total_conflicts: conflicts.length,
      active_conflicts: conflicts.filter((c) => c.status === "Open").length,
      conflicts,
    });
  } catch (err: any) {
    console.error("Conflicts API error:", err);
    return NextResponse.json({ error: "Failed to fetch conflict alerts." }, { status: 500 });
  }
}
