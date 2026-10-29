import { NextRequest, NextResponse } from "next/server";
import { defaultEmbeddingService, findTopKSimilar, SEMANTIC_THRESHOLDS } from "@/lib/embeddings";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      complaint_id,
      threshold_duplicate = SEMANTIC_THRESHOLDS.likelyDuplicate,
      threshold_related = SEMANTIC_THRESHOLDS.possiblyRelated,
      limit = 5,
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Grievance text is required for semantic duplicate detection." }, { status: 400 });
    }

    const embedding = await defaultEmbeddingService.embed(text);
    const repo = getRepo();
    const { complaints } = await repo.loadAll();

    const topMatches = findTopKSimilar(
      embedding,
      text,
      complaints,
      limit,
      complaint_id,
      { likelyDuplicate: threshold_duplicate, possiblyRelated: threshold_related }
    );

    return NextResponse.json({
      success: true,
      text_length: text.length,
      thresholds: {
        likely_duplicate: threshold_duplicate,
        possibly_related: threshold_related,
      },
      matches: topMatches,
      has_likely_duplicate: topMatches.some((m) => m.category === "likely_duplicate"),
    });
  } catch (err: any) {
    console.error("Semantic duplicates search error:", err);
    return NextResponse.json({ error: "Failed to perform semantic duplicate detection." }, { status: 500 });
  }
}
