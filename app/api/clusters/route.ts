import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/data/repo";
import { generateComplaintClusters } from "@/lib/clustering";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryFilter = searchParams.get("category");
    const severityFilter = searchParams.get("severity");

    const repo = getRepo();
    const { complaints, institutions } = await repo.loadAll();

    let clusters = await generateComplaintClusters(
      complaints,
      (id) => institutions.find((i) => i.id === id)
    );

    if (categoryFilter) {
      clusters = clusters.filter((c) => c.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (severityFilter) {
      clusters = clusters.filter((c) => c.severity.toLowerCase() === severityFilter.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      total_clusters: clusters.length,
      clusters,
    });
  } catch (err: any) {
    console.error("Clusters fetch error:", err);
    return NextResponse.json({ error: "Failed to generate systemic clusters." }, { status: 500 });
  }
}
