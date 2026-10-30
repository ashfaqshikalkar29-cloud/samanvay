import { NextRequest, NextResponse } from "next/server";
import { auditChain } from "@/lib/security/audit-chain";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    if (!hasPermission(auth.role, "audit:verify")) {
      return NextResponse.json(
        { error: `Access Denied: Role '${auth.role}' is not authorized to verify cryptographic audit trail.` },
        { status: 403 }
      );
    }

    // 1. Handle Tamper Reset Simulation
    if (body.reset === true) {
      auditChain.restorePristineChain();
      const verification = auditChain.verifyChain();
      return NextResponse.json({
        success: true,
        action: "TAMPER_RESET_RESTORED",
        message: "Audit chain successfully restored to pristine cryptographic state.",
        verification,
      });
    }

    // 2. Handle Tamper Injection Simulation (For interactive demo & testing)
    if (body.simulateTamper === true) {
      const blockIndex = typeof body.blockIndex === "number" ? body.blockIndex : 1;
      const field = body.field || "action";
      const value = body.value || "UNAUTHORIZED_STAGE_BYPASS";

      const tamperResult = auditChain.simulateTamper(blockIndex, field, value);
      const verification = auditChain.verifyChain();

      return NextResponse.json({
        success: true,
        action: "TAMPER_SIMULATION_EXECUTED",
        tamperResult,
        verification,
      });
    }

    // 3. Standard Cryptographic Audit Verification
    const verification = auditChain.verifyChain();

    return NextResponse.json({
      success: true,
      action: "AUDIT_VERIFICATION_COMPLETE",
      verification,
    });
  } catch (err: any) {
    console.error("Audit Verification Error:", err);
    return NextResponse.json({ error: "Failed to verify audit trail cryptographic integrity." }, { status: 500 });
  }
}
