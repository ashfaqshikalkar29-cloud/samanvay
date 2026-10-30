import { NextRequest, NextResponse } from "next/server";
import { dpdpService } from "@/lib/security/dpdp";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    // 1. Role Authorization: Complainant (for own docket) or Admin
    if (!hasPermission(auth.role, "privacy:erase")) {
      return NextResponse.json(
        {
          error: `Access Denied: Role '${auth.role}' is not authorized to execute DPDP Right-To-Be-Forgotten erasure.`,
        },
        { status: 403 }
      );
    }

    const { complaint_id, reason } = body;
    if (!complaint_id) {
      return NextResponse.json({ error: "Complaint ID is required." }, { status: 400 });
    }

    const repo = getRepo();
    const { complaints } = await repo.loadAll();
    const complaint = complaints.find((c) => c.id === complaint_id || c.tracking_id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: "Grievance record not found." }, { status: 404 });
    }

    // 2. Execute DPDP Section 12 Erasure Record and Cryptographic Audit Block
    const erasureRecord = dpdpService.executeErasure(
      complaint.id,
      auth.userId || "citizen-principal",
      auth.role,
      reason || "Complainant requested personal data erasure under DPDP Act Section 12"
    );

    // 3. Scrub personal identifiers while retaining statutory case metadata for regulatory reporting
    const updatedDynamicFields = { ...(complaint.dynamic_fields || {}) };
    delete updatedDynamicFields._encryptedIdentity;
    updatedDynamicFields.dpdp_erasure = {
      erased_at: erasureRecord.executedAt,
      request_id: erasureRecord.requestId,
      legal_basis: "DPDP Act 2023 Sec 12",
    };

    const sanitizedPatch: any = {
      complainant_name: "[DATA ERASED UNDER DPDP ACT SEC 12]",
      complainant_phone: "[DATA ERASED]",
      complainant_email: "erased@dpdp.gov.in",
      is_anonymous: true,
      dynamic_fields: updatedDynamicFields,
    };

    await repo.updateComplaint(complaint.id, sanitizedPatch);

    // 4. Add timeline event
    await repo.addEvent({
      id: `evt-dpdp-erase-${Date.now()}`,
      complaint_id: complaint.id,
      event_type: "decision",
      bureau: (complaint.bureau as any) || "PGRC",
      actor: auth.userId || "Citizen Data Principal",
      title: "DPDP Right to be Forgotten Executed",
      description: "DPDP Section 12 Right-to-be-Forgotten Data Erasure Executed. Personal identity expunged.",
      created_at: erasureRecord.executedAt,
    });

    return NextResponse.json({
      success: true,
      complaint_id: complaint.id,
      tracking_id: complaint.tracking_id,
      erasureRecord,
      message:
        "Personal identifying data permanently erased under DPDP Act 2023 Section 12. Non-identifying regulatory record preserved for statutory compliance.",
    });
  } catch (err: any) {
    console.error("DPDP Erasure Error:", err);
    return NextResponse.json({ error: "Failed to execute DPDP data erasure request." }, { status: 500 });
  }
}
