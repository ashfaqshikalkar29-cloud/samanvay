import { NextRequest, NextResponse } from "next/server";
import { AICTE_INSTITUTIONS_SEED } from "@/lib/institutes-seed";
import { CATEGORY_SCHEMAS, validateDynamicFields } from "@/lib/intake-schemas";
import { encryptIdentity, generateAccessKey } from "@/lib/crypto-anonymous";
import { DEMO_TODAY, OFFICERS, type Bureau, type Channel, type Complaint } from "@/lib/mock";
import { getRepo } from "@/lib/data/repo";
import { defaultClassifier } from "@/lib/classifier";
import { defaultEmbeddingService, findTopKSimilar } from "@/lib/embeddings";
import { defaultDistressScanner } from "@/lib/ai/distress";
import { defaultCategorizer } from "@/lib/ai/categorizer";
import { defaultFraudEngine } from "@/lib/ai/fraud";

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

    // 7. Bureau Auto-Routing & Classifier (2.4)
    const classification = defaultClassifier.classify(category, description, dynamic_fields);
    const bureau = (assigned_officer ? determineBureau(category) : classification.predicted_bureau);
    const isTriage = assigned_officer ? false : classification.is_triage;
    const officerToAssign =
      assigned_officer ||
      (isTriage ? "Triage Desk" : OFFICERS.find((o) => o.bureau === bureau)?.name || (bureau === "RB" ? "Dr. A. Kulkarni" : "Ms. R. Iyer"));

    // 8. Generate 384-dimensional Semantic Vector Embedding (2.1)
    const embedding = await defaultEmbeddingService.embed(description.trim());

    // 9. Phase 3 AI Intelligence: Distress Scan, Categorisation & Priority, Fraud Detection
    const distress = await defaultDistressScanner.scan(description.trim());
    const aiPredictions = await defaultCategorizer.predict(description.trim(), dynamic_fields);
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;
    const fraudEval = defaultFraudEngine.evaluate(complaintId, description.trim(), inst.id, {
      ip: clientIp,
      userAgent,
      phone: complainant_phone || undefined,
    });

    const isDistressed = distress.has_distress;
    const initialUrgency = isDistressed ? "critical" : (aiPredictions?.urgency || "medium");

    let initialNextAction = isTriage
      ? "In Triage Queue: Requires manual bureau assignment"
      : "Initial scrutiny by bureau officer";

    if (isDistressed) {
      initialNextAction = "EMERGENCY: Immediate safety officer dispatch & crisis intervention";
    } else if (fraudEval.risk_tier !== "clean") {
      initialNextAction = "Flagged by Anti-Spam Shield — awaiting officer review in Suspicious Queue";
    }

    // 10. Construct Complaint Record
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
      next_action: initialNextAction,
      is_anonymous: Boolean(is_anonymous),
      dynamic_fields,
      evidence,
      complainant_phone_last4: phoneLast4,
      anonymous_access_key: anonymousAccessKey,
      embedding,
      routing_confidence: classification.confidence,
      routing_rationale: classification.rationale,
      is_triage: isTriage,
      has_distress: isDistressed,
      distress_details: isDistressed ? distress : undefined,
      urgency: initialUrgency,
      legal_risk: aiPredictions.legal_risk,
      ai_predictions: aiPredictions,
      fraud_score: fraudEval.overall_score,
      fraud_evaluation: fraudEval,
    };

    // 11. Persist to data repository
    const repo = getRepo();
    await repo.insertComplaint(complaint);

    // 12. Audit trail & Cross-Bureau Event Stream (2.5)
    await repo.addAudit({
      complaint_id: complaintId,
      action: isTriage ? "Grievance Docketed in Triage" : "Grievance Docketed",
      timestamp: new Date().toISOString(),
      officer: channel === "walk-in" ? officerToAssign : "System Intake Gateway",
      remarks: `Docketed via ${channel.toUpperCase()} channel. Auto-Routing: ${Math.round(classification.confidence * 100)}% confidence for ${classification.predicted_bureau}. Priority: ${initialUrgency.toUpperCase()}${isDistressed ? " (SOS Distress Signal)" : ""}. Tracking ID: ${trackingId}.`,
    });

    if (isDistressed) {
      await repo.addEvent({
        id: `evt-distress-${complaintId}-${Date.now()}`,
        complaint_id: complaintId,
        bureau: "System",
        event_type: "status_change",
        actor: "AI Distress Sentinel",
        title: "CRITICAL DISTRESS SIGNAL FLAGGED",
        description: `Automated safety scanner detected distress markers (${distress.distress_category}). Safety protocols initiated.`,
        created_at: new Date().toISOString(),
      });
    }

    await repo.addEvent({
      id: `evt-${complaintId}-${Date.now()}`,
      complaint_id: complaintId,
      bureau: isTriage ? "System" : bureau,
      event_type: "status_change",
      actor: "Intake Classifier Gateway",
      title: isTriage ? "Grievance Placed in Triage Queue" : `Grievance Auto-Routed to ${bureau}`,
      description: classification.rationale,
      created_at: new Date().toISOString(),
    });

    // 12. Check Semantic Similarities across All Bureaus (2.1)
    const { complaints: allComplaints } = await repo.loadAll();
    const topSimilar = findTopKSimilar(
      embedding,
      description.trim(),
      allComplaints,
      5,
      complaintId
    );

    const origin = req.nextUrl.origin || "http://localhost:2001";
    const publicTrackUrl = `${origin}/track/${trackingId}`;

    return NextResponse.json({
      success: true,
      message: isTriage
        ? "Grievance registered and placed in triage queue for multi-bureau review."
        : "Grievance registered and docketed successfully.",
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
        is_triage: complaint.is_triage,
        routing_confidence: complaint.routing_confidence,
        routing_rationale: complaint.routing_rationale,
        tracking_url: publicTrackUrl,
        anonymous_access_key: anonymousAccessKey,
        urgency: complaint.urgency,
        legal_risk: complaint.legal_risk,
        has_distress: complaint.has_distress,
        fraud_score: complaint.fraud_score,
      },
      ai_insights: {
        urgency: complaint.urgency,
        severity_score: aiPredictions.severity_score,
        legal_risk: complaint.legal_risk,
        has_distress: isDistressed,
        distress_category: isDistressed ? distress.distress_category : undefined,
        fraud_risk: fraudEval.risk_tier,
        fraud_score: fraudEval.overall_score,
      },
      semantic_similarity: {
        top_matches: topSimilar,
        likely_duplicates_count: topSimilar.filter((m) => m.category === "likely_duplicate").length,
      },
    });
  } catch (err: any) {
    console.error("Intake API error:", err);
    return NextResponse.json({ error: "Failed to process grievance intake. Please try again." }, { status: 500 });
  }
}
