/**
 * Samanvay AICTE Grievance Portal
 * National eSign API Route (Domain E)
 */

import { NextRequest, NextResponse } from "next/server";
import { defaultESignAdapter } from "@/lib/integrations/esign";
import { hasPermission } from "@/lib/security/rbac";
import { Role } from "@/lib/mock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userRole, signerName, documentId, documentTitle, documentHash, transactionId, otp } = body;

    // Check staff permissions
    const role = (userRole || "RB Officer") as Role;
    if (role === "Complainant" || role === "Institute") {
      return NextResponse.json(
        { error: "Forbidden: Regulatory digital signature requires statutory officer credentials." },
        { status: 403 }
      );
    }

    if (action === "initiate") {
      if (!documentId || !documentHash) {
        return NextResponse.json({ error: "Missing documentId or documentHash" }, { status: 400 });
      }

      const res = await defaultESignAdapter.initiateSigning({
        documentId,
        documentTitle: documentTitle || "AICTE Official Statutory Order",
        documentHashSha256: documentHash,
        signerName: signerName || "Dr. A. Kulkarni",
        signerRole: role,
        authMode: "OTP",
      });

      return NextResponse.json({ success: true, ...res });
    }

    if (action === "verify") {
      if (!transactionId || !otp) {
        return NextResponse.json({ error: "Missing transactionId or OTP" }, { status: 400 });
      }

      const verification = await defaultESignAdapter.verifyAndSign(transactionId, otp);
      return NextResponse.json({ success: true, verification });
    }

    if (action === "check") {
      const { signatureId, currentHash } = body;
      const result = await defaultESignAdapter.verifySignature(signatureId, currentHash);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action. Supported: initiate, verify, check" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "eSign processing error" }, { status: 500 });
  }
}
