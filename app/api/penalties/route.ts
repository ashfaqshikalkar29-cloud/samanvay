import { NextRequest, NextResponse } from "next/server";
import { penaltyTracker } from "@/lib/penalties";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaint_id");

    if (complaintId) {
      const penalties = penaltyTracker.getPenaltiesForComplaint(complaintId);
      return NextResponse.json({ success: true, count: penalties.length, penalties });
    }

    const penalties = penaltyTracker.getAllPenalties();
    return NextResponse.json({ success: true, count: penalties.length, penalties });
  } catch (err: any) {
    console.error("Get Penalties Error:", err);
    return NextResponse.json({ error: "Failed to fetch penalties." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    if (!hasPermission(auth.role, "penalty:impose")) {
      return NextResponse.json(
        { error: `Access Denied: Role '${auth.role}' is not authorized to impose statutory penalties.` },
        { status: 403 }
      );
    }

    const {
      complaint_id,
      institution_id,
      institution_name,
      penalty_type,
      title,
      directive_details,
      monetary_amount,
      compliance_deadline,
      ordered_by,
    } = body;

    if (!complaint_id || !institution_id || !penalty_type || !title || !directive_details || !compliance_deadline) {
      return NextResponse.json(
        { error: "Missing required fields for penalty imposition." },
        { status: 400 }
      );
    }

    const penalty = await penaltyTracker.imposePenalty({
      complaintId: complaint_id,
      institutionId: institution_id,
      institutionName: institution_name || "AICTE Institution",
      penaltyType: penalty_type,
      title,
      directiveDetails: directive_details,
      monetaryAmount: monetary_amount,
      complianceDeadline: compliance_deadline,
      orderedBy: ordered_by || `${auth.role} Office, AICTE`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Statutory regulatory penalty / directive successfully ordered and registered.",
        penalty,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Impose Penalty Error:", err);
    return NextResponse.json({ error: "Failed to impose penalty." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { penalty_id, action, proof_url, officer_name, notes } = body;

    if (!penalty_id || !action) {
      return NextResponse.json({ error: "Penalty ID and action are required." }, { status: 400 });
    }

    if (action === "SUBMIT_PROOF") {
      const updated = await penaltyTracker.submitComplianceProof(penalty_id, proof_url || "");
      if (!updated) return NextResponse.json({ error: "Penalty record not found." }, { status: 404 });
      return NextResponse.json({ success: true, message: "Compliance proof submitted.", penalty: updated });
    }

    if (action === "VERIFY_COMPLIANCE") {
      const updated = await penaltyTracker.verifyCompliance(
        penalty_id,
        officer_name || "Verification Officer",
        notes || "Verified compliant."
      );
      if (!updated) return NextResponse.json({ error: "Penalty record not found." }, { status: 404 });
      return NextResponse.json({ success: true, message: "Compliance successfully verified.", penalty: updated });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Update Penalty Error:", err);
    return NextResponse.json({ error: "Failed to update penalty status." }, { status: 500 });
  }
}
