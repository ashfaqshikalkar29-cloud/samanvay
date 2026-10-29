import { NextRequest, NextResponse } from "next/server";
import { AICTE_INSTITUTIONS_SEED } from "@/lib/institutes-seed";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

  if (!q) {
    return NextResponse.json({
      institutes: AICTE_INSTITUTIONS_SEED.slice(0, limit),
      total: AICTE_INSTITUTIONS_SEED.length,
    });
  }

  const results = AICTE_INSTITUTIONS_SEED.filter((inst) => {
    return (
      inst.name.toLowerCase().includes(q) ||
      inst.aicte_id.toLowerCase().includes(q) ||
      inst.state.toLowerCase().includes(q) ||
      inst.district.toLowerCase().includes(q) ||
      inst.programmes.some((p) => p.toLowerCase().includes(q))
    );
  }).slice(0, limit);

  return NextResponse.json({
    institutes: results,
    total: results.length,
  });
}
