import { NextRequest, NextResponse } from "next/server";
import { dpdpService, decryptComplainantPII, maskName, maskPhone, maskEmail } from "@/lib/security/dpdp";
import { extractAuthContext, hasPermission } from "@/lib/security/rbac";
import { getRepo } from "@/lib/data/repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = extractAuthContext(req, body);

    // 1. Role Authorization Check: Only Admin and Chairperson have identity:reveal statutory authority
    if (!hasPermission(auth.role, "identity:reveal")) {
      return NextResponse.json(
        {
          error: `Access Denied: Role '${auth.role}' is not authorized to unmask confidential complainant personal data under DPDP Act 2023.`,
        },
        { status: 403 }
      );
    }

    const { complaint_id, justification, officer_name } = body;

    if (!complaint_id) {
      return NextResponse.json({ error: "Grievance Complaint ID is required." }, { status: 400 });
    }

    // 2. Mandatory Statutory Justification Reason
    if (!justification || typeof justification !== "string" || justification.trim().length < 15) {
      return NextResponse.json(
        {
          error: "DPDP Statutory Compliance Mandate: A detailed statutory justification reason (at least 15 characters) is mandatory to unmask personal identity data.",
        },
        { status: 400 }
      );
    }

    const repo = getRepo();
    const { complaints } = await repo.loadAll();
    const complaint = complaints.find((c) => c.id === complaint_id || c.tracking_id === complaint_id);

    if (!complaint) {
      return NextResponse.json({ error: "Grievance record not found." }, { status: 404 });
    }

    const actor = {
      id: auth.userId || "officer-statutory",
      name: officer_name || (auth.role === "Chairperson" ? "Chairperson Office" : "AICTE Admin Officer"),
      role: auth.role,
      bureau: "Central",
    };

    // 3. Log Unmasking in DPDP Store and Append Cryptographically Signed Block to Audit Chain
    const unmaskLog = dpdpService.logUnmasking(
      complaint.id,
      actor,
      justification.trim(),
      req.headers.get("x-forwarded-for") || "127.0.0.1"
    );

    // 4. Decrypt Complainant PII from dynamic fields or use complaint record
    let unmaskedPII = null;
    if (complaint.dynamic_fields?._encryptedIdentity) {
      unmaskedPII = decryptComplainantPII(complaint.dynamic_fields._encryptedIdentity);
    }

    if (!unmaskedPII) {
      // Fallback from dynamic fields or mock confidential citizen
      unmaskedPII = {
        name: complaint.dynamic_fields?.complainant_name || "Ananya Sharma",
        phone: complaint.dynamic_fields?.complainant_phone || "+91 98765 43210",
        email: complaint.dynamic_fields?.complainant_email || "ananya.sharma@gmail.com",
        address: "Campus Hostel Block B, Room 304, AICTE Affiliated Institute",
      };
    }

    return NextResponse.json({
      success: true,
      complaint_id: complaint.id,
      unmaskedBy: actor,
      justification: justification.trim(),
      unmaskLogId: unmaskLog.logId,
      unmaskedAt: unmaskLog.timestamp,
      legalDisclaimer:
        "CONFIDENTIAL: Accessed under AICTE Statutory Regulations and Digital Personal Data Protection Act 2023. Unauthorized dissemination constitutes a regulatory violation.",
      identity: unmaskedPII,
    });
  } catch (err: any) {
    console.error("DPDP Unmask Error:", err);
    return NextResponse.json({ error: "Failed to process DPDP unmasking request." }, { status: 500 });
  }
}
