import { createClient } from "@supabase/supabase-js";
import { institutions, seedComplaints, buildSeedAudit, type Complaint } from "../lib/mock";
import { detectOverlaps } from "../lib/overlap";
import { getSla } from "../lib/sla";
import type { Database } from "../lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  console.error("Provide them in .env.local and run: npm run seed");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

const ENGINE = "Samanvay Overlap Engine";
const ENGINE_TS = "2026-10-24T05:30:00.000Z";

function engineEntries(prev: Complaint[], next: Complaint[], ts: string) {
  const out = [];
  for (const n of next) {
    const was = prev.find((p) => p.id === n.id)?.is_overlap_flagged ?? false;
    if (n.is_overlap_flagged && !was) {
      out.push({
        complaint_id: n.id,
        action: "Overlap Flagged",
        timestamp: ts,
        officer: ENGINE,
        remarks: `Linked with ${n.overlap_links.map((l) => l.complaint_id).join(", ")} (${n.overlap_links[0].reason}).`,
      });
    }
  }
  return out;
}

async function seed() {
  console.log("🌱 Starting Samanvay Supabase database seed...");

  // 1. Seed Institutions
  console.log(`📦 Seeding ${institutions.length} institutions...`);
  const { error: instError } = await supabase.from("institutions").upsert(
    institutions.map((i) => ({
      id: i.id,
      aicte_id: i.aicte_id,
      name: i.name,
      region: i.region,
    }))
  );
  if (instError) {
    console.error("❌ Failed to upsert institutions:", instError);
    process.exit(1);
  }
  console.log("✅ Institutions seeded successfully.");

  // 2. Detect overlaps on seed complaints
  const initialComplaints = detectOverlaps(seedComplaints);

  // 3. Seed Complaints
  console.log(`📦 Seeding ${initialComplaints.length} complaints...`);
  const complaintsPayload = initialComplaints.map((c) => ({
    id: c.id,
    institution_id: c.institution_id,
    bureau: c.bureau,
    status: c.status,
    category: c.category,
    description: c.description,
    date_received: c.date_received,
    assigned_officer: c.assigned_officer,
    next_action: c.next_action,
    due_date: getSla(c).due,
    is_overlap_flagged: c.is_overlap_flagged,
    updated_at: new Date().toISOString(),
  }));

  const { error: compError } = await supabase.from("complaints").upsert(complaintsPayload);
  if (compError) {
    console.error("❌ Failed to upsert complaints:", compError);
    process.exit(1);
  }
  console.log("✅ Complaints seeded successfully.");

  // 4. Seed Audit Trail
  console.log("📦 Refreshing audit trail entries...");
  const seedIds = seedComplaints.map((c) => c.id);
  // Clear previous seed audit entries for idempotency
  await supabase.from("audit_trail").delete().in("complaint_id", seedIds);

  const allAuditEntries = [
    ...buildSeedAudit(),
    ...engineEntries(seedComplaints, initialComplaints, ENGINE_TS),
  ];

  const auditPayload = allAuditEntries.map((a) => ({
    complaint_id: a.complaint_id,
    action: a.action,
    timestamp: a.timestamp,
    officer: a.officer,
    remarks: a.remarks,
  }));

  const { error: auditError } = await supabase.from("audit_trail").insert(auditPayload);
  if (auditError) {
    console.error("❌ Failed to insert audit trail:", auditError);
    process.exit(1);
  }
  console.log(`✅ Seeded ${auditPayload.length} audit trail entries.`);

  // 5. Seed Overlap Alerts
  console.log("📦 Seeding overlap alerts...");
  const { data: existingAlerts } = await supabase.from("overlap_alerts").select("*");
  const existingMap = new Map<string, any>();
  if (existingAlerts) {
    for (const row of existingAlerts) {
      const key = [row.complaint_a, row.complaint_b].sort().join("|");
      existingMap.set(key, row);
    }
  }

  const seen = new Set<string>();
  const alertsToInsert: any[] = [];

  for (const c of initialComplaints) {
    for (const l of c.overlap_links) {
      const [a, b] = [c.id, l.complaint_id].sort();
      const key = `${a}|${b}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = existingMap.get(key);
      if (existing) {
        // If already exists and is adjudicated, keep it
        if (existing.status !== "Open") {
          continue;
        }
      }

      alertsToInsert.push({
        id: existing ? existing.id : crypto.randomUUID(),
        complaint_a: a,
        complaint_b: b,
        reason: l.reason,
        score: l.score,
        same_institution: l.same_institution,
        status: existing ? existing.status : "Open",
        lead_bureau: existing ? existing.lead_bureau : null,
        adjudicated_by: existing ? existing.adjudicated_by : null,
        adjudicated_at: existing ? existing.adjudicated_at : null,
        note: existing ? existing.note : null,
      });
    }
  }

  if (alertsToInsert.length > 0) {
    const { error: alertError } = await supabase.from("overlap_alerts").upsert(alertsToInsert);
    if (alertError) {
      console.error("❌ Failed to upsert overlap alerts:", alertError);
      process.exit(1);
    }
  }
  console.log(`✅ Seeded ${alertsToInsert.length} overlap alerts.`);

  console.log("\n🎉 Samanvay database seeded successfully! Ready for demo.\n");
}

seed().catch((err) => {
  console.error("Unexpected error during seeding:", err);
  process.exit(1);
});
