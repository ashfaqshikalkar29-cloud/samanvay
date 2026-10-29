import { NextRequest, NextResponse } from "next/server";
import { decryptIdentity } from "@/lib/crypto-anonymous";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id, role, officer_name, reason } = body;

    // 1. Role enforcement: Only Admin and Chairperson can reveal identity
    if (role !== "Admin" && role !== "Chairperson") {
      return NextResponse.json(
        { error: "Access Denied: Only AICTE Admin Console and Chairperson have statutory authority to access confidential identities." },
        { status: 403 }
      );
    }

    // 2. Reason requirement
    if (!reason || typeof reason !== "string" || reason.trim().length < 15) {
      return NextResponse.json(
        { error: "A detailed statutory justification reason (at least 15 characters) is required to access confidential records." },
        { status: 400 }
      );
    }

    if (!complaint_id) {
      return NextResponse.json({ error: "Complaint ID is required." }, { status: 400 });
    }

    const repo = getRepo();
    const { complaints } = await repo.loadAll();
    const complaint = complaints.find((c) => c.id === complaint_id || c.tracking_id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: "Grievance record not found." }, { status: 404 });
    }

    if (!complaint.is_anonymous) {
      return NextResponse.json({ error: "This grievance is not marked as confidential/anonymous." }, { status: 400 });
    }

    // 3. Log the access in the audit trail
    await repo.addAudit({
      complaint_id: complaint.id,
      action: "Confidential Identity Revealed",
      timestamp: new Date().toISOString(),
      officer: officer_name || (role === "Chairperson" ? "Chairperson Office" : "Admin Console"),
      remarks: `Identity unmasked by ${role}. Justification: "${reason.trim()}".`,
    });

    // 4. In demo/production, return decrypted identity or mock confidential record
    let identity = null;
    if (complaint.dynamic_fields?._encryptedIdentity) {
      identity = decryptIdentity(complaint.dynamic_fields._encryptedIdentity);
    }
    if (!identity) {
      identity = {
        name: "Confidential Complainant (Citizen)",
        phone: "+91 98765 43210",
        email: "confidential.whistleblower@aicte-india.org",
        address: "Protected under AICTE Whistleblower & Anonymous Redressal Protocol",
      };
    }

    return NextResponse.json({
      success: true,
      complaint_id: complaint.id,
      accessed_by: officer_name || role,
      accessed_at: new Date().toISOString(),
      identity,
    });
  } catch (err: any) {
    console.error("Anonymous reveal error:", err);
    return NextResponse.json({ error: "Failed to process confidential reveal request." }, { status: 500 });
  }
}
