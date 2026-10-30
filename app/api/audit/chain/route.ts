import { NextRequest, NextResponse } from "next/server";
import { auditChain, GENESIS_PREV_HASH } from "@/lib/security/audit-chain";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id") || undefined;
    const auth = extractAuthContext(req);

    // Audit reading requires audit:read permission
    if (!hasPermission(auth.role, "audit:read")) {
      return NextResponse.json(
        { error: `Access Denied: Role '${auth.role}' is not authorized to inspect audit blocks.` },
        { status: 403 }
      );
    }

    const blocks = auditChain.getBlocks(complaintId);
    const headBlock = blocks[blocks.length - 1];

    return NextResponse.json({
      success: true,
      totalBlocks: blocks.length,
      filter: complaintId || "ALL",
      genesisPreviousHash: GENESIS_PREV_HASH,
      chainHeadHash: headBlock ? headBlock.block_hash : null,
      blocks,
    });
  } catch (err: any) {
    console.error("Audit Chain Query Error:", err);
    return NextResponse.json({ error: "Failed to query cryptographic audit ledger." }, { status: 500 });
  }
}
