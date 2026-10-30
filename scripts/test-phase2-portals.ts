// ==============================================================================
// SAMANVAY: Phase 2 Automated Verification Suite
// Tests Complainant & Institute Portals, Notification Adapters, and Proactive Nudges
// ==============================================================================

import { defaultNotificationService } from "../lib/notifications/service";
import { evaluateAndGenerateNudges, dispatchProactiveNudges } from "../lib/notifications/nudges";
import { generate5kComplaints } from "../lib/seed-5k";
import { AICTE_INSTITUTIONS_SEED } from "../lib/institutes-seed";
import { Complaint, DEMO_TODAY } from "../lib/mock";
import { pauseSla } from "../lib/sla-engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase2Tests() {
  console.log("=================================================================");
  console.log("   SAMANVAY: RUNNING PHASE 2 AUTOMATED VERIFICATION SUITE       ");
  console.log("   Complainant & Institute Portals, Notifications & Nudges       ");
  console.log("=================================================================\n");

  // ── TEST 1: Multi-Channel Notification Adapters ───────────────────────────
  console.log("[Test 1] Multi-Channel Notification Gateway Adapters...");

  // SMS Gateway (CDAC/NIC simulation)
  const smsReceipt = await defaultNotificationService.sendNotification({
    complaint_id: "C-1001",
    tracking_id: "SMV-2026-001001",
    recipient_role: "complainant",
    recipient_name: "Rajesh Sharma",
    recipient_contact: "+91 98765 43210",
    channel: "sms",
    title: "Grievance Status",
    message: "Your grievance is under scrutiny.",
  });
  assert(smsReceipt.receipt.success === true, "SMS successfully dispatched via CDAC/NIC gateway");
  assert(smsReceipt.receipt.gateway_response?.includes("CDAC-GW 200 OK") === true, "CDAC DLT verification confirmed");

  // Email Gateway (NIC Mail simulation)
  const emailReceipt = await defaultNotificationService.sendNotification({
    complaint_id: "C-1001",
    tracking_id: "SMV-2026-001001",
    recipient_role: "institute",
    recipient_name: "Principal, MIT Pune",
    recipient_contact: "principal@mitpune.edu.in",
    channel: "email",
    title: "AICTE Statutory Notice",
    message: "Statutory show-cause notice attached.",
  });
  assert(emailReceipt.receipt.success === true, "Email successfully queued via NIC Mail SMTP");
  assert(emailReceipt.receipt.gateway_response?.includes("NIC-MAIL 250") === true, "NIC Mail 250 response verified");

  // WhatsApp Gateway (Meta Cloud API simulation)
  const waReceipt = await defaultNotificationService.sendNotification({
    complaint_id: "C-1002",
    tracking_id: "SMV-2026-001002",
    recipient_role: "complainant",
    recipient_name: "Student Complainant",
    recipient_contact: "+91 98123 45678",
    channel: "whatsapp",
    title: "Fee Refund Update",
    message: "College administration has processed your refund.",
  });
  assert(waReceipt.receipt.success === true, "WhatsApp template message delivered via Meta WhatsApp API");
  assert(waReceipt.receipt.gateway_response?.includes("META-WA 200 OK") === true, "WhatsApp API 200 confirmed");

  // Query notification history
  const history = defaultNotificationService.getNotifications({ complaint_id: "C-1001" });
  assert(history.length >= 2, `Notification history contains records for C-1001 (actual: ${history.length})`);

  // ── TEST 2: Proactive Nudge Engine (50% and 80% SLA Reminders) ────────────
  console.log("\n[Test 2] Proactive Nudge Engine & SLA Milestones...");

  const sampleComplaints: Complaint[] = [
    // Case 1: Show-Cause at 55% elapsed (should trigger 50% reminder)
    {
      id: "C-2001",
      tracking_id: "SMV-2026-002001",
      institution_id: "inst-1",
      bureau: "RB",
      status: "In-Process",
      category: "Fee Regulation",
      channel: "web",
      description: "Excess fees demanded",
      date_received: "2026-10-15",
      assigned_officer: "Dr. A. Kulkarni",
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Await reply",
      dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-10-15" },
    },
    // Case 2: Show-Cause at 85% elapsed (should trigger 80% urgent reminder)
    {
      id: "C-2002",
      tracking_id: "SMV-2026-002002",
      institution_id: "inst-2",
      bureau: "RB",
      status: "In-Process",
      category: "Fee Regulation",
      channel: "email",
      description: "Refund delayed",
      date_received: "2026-10-11",
      assigned_officer: "Mr. S. Verma",
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Await reply",
      dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-10-11" },
    },
    // Case 3: Paused docket awaiting student clarification
    {
      id: "C-2003",
      tracking_id: "SMV-2026-002003",
      institution_id: "inst-1",
      bureau: "PGRC",
      status: "Pending",
      category: "Student Services",
      channel: "mobile",
      description: "Original certificates withheld",
      date_received: "2026-10-18",
      assigned_officer: "Ms. R. Iyer",
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Awaiting student affidavit",
      dynamic_fields: {
        _current_stage: "Scrutiny",
        is_paused_awaiting_info: true,
        paused_at: "2026-10-19T09:00:00Z",
        pause_reason: "Original fee payment receipt needed",
      },
    },
  ];

  const nudges = evaluateAndGenerateNudges(sampleComplaints, AICTE_INSTITUTIONS_SEED, DEMO_TODAY);
  assert(nudges.length >= 3, `Generated proactive nudges (actual: ${nudges.length})`);

  const n50 = nudges.find((n) => n.type === "show_cause_50");
  assert(n50 !== undefined && n50.complaint_id === "C-2001", "Identified 50% Show-Cause statutory milestone for C-2001");

  const n80 = nudges.find((n) => n.type === "show_cause_80");
  assert(n80 !== undefined && n80.complaint_id === "C-2002", "Identified 80% urgent Show-Cause statutory milestone for C-2002");

  const nInfo = nudges.find((n) => n.type === "info_request");
  assert(nInfo !== undefined && nInfo.complaint_id === "C-2003", "Identified info request nudge to citizen for paused docket C-2003");

  // Dispatch nudges
  const dispatched = await dispatchProactiveNudges(nudges);
  assert(dispatched.length === nudges.length, `Successfully dispatched all ${dispatched.length} generated nudges`);

  // ── TEST 3: Scaled Proactive Nudges Evaluation on 5,000 Complaints ────────
  console.log("\n[Test 3] Nudge Engine Throughput on 5k Benchmark Dataset...");
  const full5k = generate5kComplaints();
  const t0 = performance.now();
  const bulkNudges = evaluateAndGenerateNudges(full5k, AICTE_INSTITUTIONS_SEED, DEMO_TODAY);
  const evalDuration = Math.round(performance.now() - t0);

  assert(bulkNudges.length > 0, `Scanned 5k dataset and identified ${bulkNudges.length} proactive statutory nudges`);
  assert(evalDuration < 500, `Nudge evaluation finished within ${evalDuration}ms (< 500ms threshold)`);

  console.log("\n=================================================================");
  console.log("   ✅ ALL PHASE 2 AUTOMATED TESTS PASSED SUCCESSFULLY!          ");
  console.log("=================================================================\n");
}

runPhase2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
