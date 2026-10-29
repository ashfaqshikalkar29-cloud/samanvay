import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { child_id, officer, role } = body;

    // 1. Role validation
    if (role && !["Admin", "RB Officer", "PGRC Officer", "Chairperson"].includes(role)) {
      return NextResponse.json(
        { error: "Access Denied: Only bureau officers and administrators can unmerge complaints." },
        { status: 403 }
      );
    }

    if (!child_id) {
      return NextResponse.json({ error: "Child complaint ID is required to unmerge." }, { status: 400 });
    }

    const repo = getRepo();
    const ok = await repo.unmergeComplaint(child_id, officer || "Officer");

    if (!ok) {
      return NextResponse.json({ error: "Complaint not found or not in merged status." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Case ${child_id} has been unmerged and restored to independent status.`,
      child_id,
    });
  } catch (err: any) {
    console.error("Unmerge error:", err);
    return NextResponse.json({ error: "Failed to unmerge complaint." }, { status: 500 });
  }
}
