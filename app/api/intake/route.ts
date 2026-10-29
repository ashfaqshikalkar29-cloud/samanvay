import { NextRequest, NextResponse } from "next/server";
import { AICTE_INSTITUTIONS_SEED } from "@/lib/institutes-seed";
import { CATEGORY_SCHEMAS, validateDynamicFields } from "@/lib/intake-schemas";
import { encryptIdentity, generateAccessKey } from "@/lib/crypto-anonymous";
import { DEMO_TODAY, OFFICERS, type Bureau, type Channel, type Complaint } from "@/lib/mock";
import { getRepo } from "@/lib/data/repo";

const VALID_CHANNELS: Channel[] = ["web", "mobile", "email", "whatsapp", "helpline", "walk-in"];

function determineBureau(category: string): Bureau {
  const norm = category.toLowerCase();
  if (
    norm.includes("approval") ||
    norm.includes("faculty") ||
    norm.includes("infrastructure") ||
    norm.includes("recognition")
  ) {
    return "RB";
  }
  return "PGRC";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      channel = "web",
      institution_id,
      category,
      description,
      dynamic_fields = {},
      evidence = [],
      is_anonymous = false,
      complainant_name = "",
      complainant_phone = "",
      complainant_email = "",
      complainant_address = "",
      assigned_officer,
    } = body;

    // 1. Channel validation
    if (!VALID_CHANNELS.includes(channel as Channel)) {
      return NextResponse.json(
        { error: `Invalid intake channel "${channel}". Allowed channels: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 }
      );
    }

    // 2. Institution validation
    if (!institution_id) {
      return NextResponse.json({ error: "Institution ID is required." }, { status: 400 });
    }
    const inst = AICTE_INSTITUTIONS_SEED.find((i) => i.id === institution_id || i.aicte_id === institution_id);
    if (!inst) {
      return NextResponse.json({ error: `Selected institution "${institution_id}" was not found in AICTE registry.` }, { status: 400 });
    }

    // 3. Category validation
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    // 4. Description validation
    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json({ error: "Complaint description must be at least 10 characters long." }, { status: 400 });
    }

    // 5. Dynamic category fields validation
    const matchingKey = Object.keys(CATEGORY_SCHEMAS).find(
      (k) => CATEGORY_SCHEMAS[k].name.toLowerCase() === category.toLowerCase() || k.toLowerCase() === category.toLowerCase()
    );
    if (matchingKey) {
      const validation = validateDynamicFields(matchingKey, dynamic_fields);
      if (!validation.valid) {
        return NextResponse.json({ error: "Dynamic form validation failed.", fieldErrors: validation.errors }, { status: 400 });
      }
    }

    // 6. Generate Tracking ID & Access Keys
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const trackingId = `SMV-2026-${randomSuffix}`;
    const complaintId = `C-${randomSuffix.slice(-4)}`;

    let anonymousAccessKey: string | undefined = undefined;
    let encryptedIdentityPayload: string | undefined = undefined;
    let phoneLast4: string | undefined = undefined;

    if (is_anonymous) {
      anonymousAccessKey = generateAccessKey();
      if (complainant_name || complainant_phone || complainant_email) {
        encryptedIdentityPayload = encryptIdentity({
          name: complainant_name,
          phone: complainant_phone,
          email: complainant_email,
          address: complainant_address,
        });
      }
    } else if (complainant_phone) {
      phoneLast4 = complainant_phone.replace(/\D/g, "").slice(-4);
    }

    // 7. Bureau & Officer assignment
    const bureau = determineBureau(category);
    const officerToAssign =
      assigned_officer ||
      OFFICERS.find((o) => o.bureau === bureau)?.name ||
      (bureau === "RB" ? "Dr. A. Kulkarni" : "Ms. R. Iyer");

    // 8. Construct Complaint Record
    const complaint: Complaint = {
      id: complaintId,
      tracking_id: trackingId,
      institution_id: inst.id,
      bureau,
      status: "Pending",
      category,
      channel: channel as Channel,
      description: description.trim(),
      date_received: DEMO_TODAY,
      assigned_officer: officerToAssign,
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Initial scrutiny by bureau officer",
      is_anonymous: Boolean(is_anonymous),
      dynamic_fields,
      evidence,
      complainant_phone_last4: phoneLast4,
      anonymous_access_key: anonymousAccessKey,
    };

    // 9. Persist to data repository
    const repo = getRepo();
    await repo.insertComplaint(complaint);

    // 10. Audit trail
    await repo.addAudit({
      complaint_id: complaintId,
      action: "Grievance Docketed",
      timestamp: new Date().toISOString(),
      officer: channel === "walk-in" ? officerToAssign : "System Intake Gateway",
      remarks: `Docketed via ${channel.toUpperCase()} channel. Tracking ID: ${trackingId}.`,
    });

    const origin = req.nextUrl.origin || "http://localhost:2001";
    const publicTrackUrl = `${origin}/track/${trackingId}`;

    return NextResponse.json({
      success: true,
      message: "Grievance registered and docketed successfully.",
      complaint: {
        id: complaint.id,
        tracking_id: complaint.tracking_id,
        institution: inst.name,
        bureau: complaint.bureau,
        status: complaint.status,
        category: complaint.category,
        channel: complaint.channel,
        date_received: complaint.date_received,
        assigned_officer: complaint.assigned_officer,
        is_anonymous: complaint.is_anonymous,
        tracking_url: publicTrackUrl,
        anonymous_access_key: anonymousAccessKey,
      },
    });
  } catch (err: any) {
    console.error("Intake API error:", err);
    return NextResponse.json({ error: "Failed to process grievance intake. Please try again." }, { status: 500 });
  }
}
