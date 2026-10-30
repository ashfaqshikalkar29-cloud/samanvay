// ==============================================================================
// SAMANVAY: Phase 1 Automated Verification Suite
// Tests 5k Seed Data, Workflow Engine, Multi-Tier SLA Escalations & Smart Assignment
// ==============================================================================

import { generate5kComplaints } from "../lib/seed-5k";
import { defaultWorkflowEngine } from "../lib/workflow/engine";
import { calculateStageSla, pauseSla, resumeSla, runSlaTick } from "../lib/sla-engine";
import { defaultAssignmentEngine, OFFICER_ROSTER } from "../lib/assignment";
import { Complaint, DEMO_TODAY } from "../lib/mock";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase1Tests() {
  console.log("=================================================================");
  console.log("   SAMANVAY: RUNNING PHASE 1 AUTOMATED VERIFICATION SUITE       ");
  console.log("=================================================================\n");

  // ── TEST 1: Mulberry32 5,000 Complaints Seed Generation ────────────────────
  console.log("[Test 1] 5,000 Fictional Complaints Generator (Mulberry32 PRNG)...");
  const t0 = performance.now();
  const dataset = generate5kComplaints();
  const duration = Math.round(performance.now() - t0);

  assert(dataset.length === 5000, `Generated exactly 5,000 complaints (actual: ${dataset.length})`);
  assert(duration < 250, `Generation finished within performance threshold (${duration}ms < 250ms)`);

  const rbCount = dataset.filter((c) => c.bureau === "RB").length;
  const pgrcCount = dataset.filter((c) => c.bureau === "PGRC").length;
  assert(rbCount > 2000 && pgrcCount > 2000, `Balanced cross-bureau split (RB: ${rbCount}, PGRC: ${pgrcCount})`);

  const uniqueInsts = new Set(dataset.map((c) => c.institution_id));
  assert(uniqueInsts.size >= 200, `Mapped to at least 200 realistic institutions (actual: ${uniqueInsts.size})`);

  const plantedDups = dataset.filter((c) => c.dynamic_fields?.is_planted_overlap);
  assert(plantedDups.length === 320, `Planted exactly 160 near-duplicate pairs (320 records, actual: ${plantedDups.length})`);

  const clusters = new Set(dataset.map((c) => c.dynamic_fields?.cluster_id).filter(Boolean));
  assert(clusters.size === 30, `Includes 30 systemic grievance clusters (actual: ${clusters.size})`);

  // ── TEST 2: Statutory Workflow Engine & Transition Guards ─────────────────
  console.log("\n[Test 2] Statutory Workflow Engine & Guards...");
  const feeWf = defaultWorkflowEngine.getWorkflowForCategory("Fee Regulation");
  assert(feeWf.stages.includes("Show-Cause"), "Fee Regulation workflow contains Show-Cause stage");
  assert(feeWf.stages.includes("Hearing"), "Fee Regulation workflow contains Hearing stage");

  const raggingWf = defaultWorkflowEngine.getWorkflowForCategory("Ragging & Campus Safety");
  assert(raggingWf.defaultSlaDays["Scrutiny"] === 1, "Anti-ragging scrutiny SLA is strictly 1 day (emergency)");

  // Test Valid Transition
  const sampleComplaint: Complaint = {
    ...dataset[0],
    category: "Fee Regulation",
    bureau: "RB",
    status: "Pending",
    dynamic_fields: { _current_stage: "Scrutiny" },
    next_action: "Issue show-cause notice",
  };

  const validTransition = defaultWorkflowEngine.validateAndTransition(
    sampleComplaint,
    "Show-Cause",
    "Dr. A. Kulkarni",
    "RB Officer",
    { next_action: "Issue show-cause" },
    "Formal notice issued"
  );
  assert(validTransition.success === true, "RB Officer can transition Fee Regulation from Scrutiny to Show-Cause");

  // Test Invalid Role Transition
  const invalidRole = defaultWorkflowEngine.validateAndTransition(
    sampleComplaint,
    "Show-Cause",
    "Student",
    "Complainant"
  );
  assert(invalidRole.success === false, "Complainant cannot execute statutory Show-Cause transition");

  // Test Approval Requirement
  sampleComplaint.dynamic_fields = {
    ...(sampleComplaint.dynamic_fields || {}),
    _current_stage: "Compliance",
  };
  const approvalCheck = defaultWorkflowEngine.validateAndTransition(
    sampleComplaint,
    "Disposed",
    "Dr. A. Kulkarni",
    "RB Officer"
  );
  assert(approvalCheck.success === true && approvalCheck.requiredApprovalPending === true,
    "Final disposal transition triggers required approval pending flag for Chairperson"
  );

  // ── TEST 3: Multi-Tier SLA Timer & Escalation Ladder ──────────────────────
  console.log("\n[Test 3] Multi-Tier SLA Timer, Pause & Escalations...");

  // Normal on-track case
  const onTrackComplaint: Complaint = {
    ...dataset[0],
    category: "Fee Regulation",
    status: "In-Process",
    date_received: "2026-10-22",
    dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-10-22" },
  };
  const slaOnTrack = calculateStageSla(onTrackComplaint, "2026-10-24");
  assert(slaOnTrack.tier === "On track" && slaOnTrack.escalationLevel === 0, "Recent case is On track (level 0)");

  // 50% Warning case (8 days elapsed out of 15d SLA)
  const warningComplaint: Complaint = {
    ...dataset[0],
    category: "Fee Regulation",
    status: "In-Process",
    date_received: "2026-10-16",
    dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-10-16" },
  };
  const slaWarning = calculateStageSla(warningComplaint, "2026-10-24");
  assert(slaWarning.tier === "Warning (50%)" && slaWarning.escalationLevel === 1,
    `50% SLA elapsed triggers Warning notice (tier: ${slaWarning.tier}, level: ${slaWarning.escalationLevel})`
  );

  // 100% Breach case (16 days elapsed out of 15d SLA)
  const breachComplaint: Complaint = {
    ...dataset[0],
    category: "Fee Regulation",
    status: "In-Process",
    date_received: "2026-10-06",
    dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-10-06" },
  };
  const slaBreach = calculateStageSla(breachComplaint, "2026-10-24");
  assert(slaBreach.tier === "Breach (100%)" && slaBreach.escalationLevel === 2,
    `100% SLA elapsed triggers Breach to Bureau Head (tier: ${slaBreach.tier}, level: ${slaBreach.escalationLevel})`
  );

  // 200% Critical Breach case (32 days elapsed out of 15d SLA) -> Direct Chairperson Escalation
  const criticalComplaint: Complaint = {
    ...dataset[0],
    category: "Fee Regulation",
    status: "In-Process",
    date_received: "2026-09-20",
    dynamic_fields: { _current_stage: "Show-Cause", _stage_started_at: "2026-09-20" },
  };
  const slaCritical = calculateStageSla(criticalComplaint, "2026-10-24");
  assert(slaCritical.tier === "Critical Breach (200%+)" && slaCritical.escalationLevel === 3,
    `200% SLA elapsed triggers Critical Breach escalated to Chairperson (level: 3, authority: ${slaCritical.escalationAuthority})`
  );

  // SLA Pause & Resume
  const pausePatch = pauseSla(warningComplaint, "Awaiting college audit report", "2026-10-20T10:00:00Z");
  warningComplaint.dynamic_fields = pausePatch.dynamic_fields;
  const pausedSla = calculateStageSla(warningComplaint, "2026-10-24");
  assert(pausedSla.isPaused === true, "SLA timer correctly registers paused state");
  assert(pausedSla.totalPausedHours > 0, `Accumulated pause duration recorded (${pausedSla.totalPausedHours}h)`);

  const resumePatch = resumeSla(warningComplaint, "2026-10-24T10:00:00Z");
  warningComplaint.dynamic_fields = resumePatch.dynamic_fields;
  assert(warningComplaint.dynamic_fields?.is_paused_awaiting_info === false, "SLA timer resumed successfully");

  // Automated SLA Tick over full 5k dataset
  const tickResult = runSlaTick(dataset, DEMO_TODAY);
  assert(tickResult.evaluatedCount === 5000, `SLA tick evaluated all 5,000 cases`);
  assert(tickResult.escalatedToChairperson.length > 0,
    `Identified 2x breach cases escalated to Chairperson (${tickResult.escalatedToChairperson.length} cases)`
  );

  // ── TEST 4: Smart Assignment & Officer Roster ─────────────────────────────
  console.log("\n[Test 4] Smart Assignment, Specialization & Delegation...");
  const roster = defaultAssignmentEngine.getRoster();
  assert(roster.length >= 6, `Officer roster contains at least 6 officers (actual: ${roster.length})`);

  // Least-workload assignment
  defaultAssignmentEngine.recomputeWorkloads(dataset.slice(0, 100));
  const leastWorkloadDecision = defaultAssignmentEngine.assignOfficer("RB", "Fee Regulation", "Western", "least-workload");
  assert(leastWorkloadDecision.officerName.length > 0, `Least-workload assigned to ${leastWorkloadDecision.officerName}`);

  // Skill & Region matching
  const skillDecision = defaultAssignmentEngine.assignOfficer("PGRC", "Ragging & Campus Safety", "Southern", "skill-region");
  assert(skillDecision.officerName === "Ms. R. Iyer", `Skill-region accurately assigned ragging case in Southern region to Ms. R. Iyer`);

  // Leave & Delegation
  // Dr. Meera Nambiar is on leave and has delegate off-rb-1 (Dr. A. Kulkarni)
  const leaveOfficer = defaultAssignmentEngine.getOfficerById("off-rb-3");
  assert(leaveOfficer?.onLeave === true, "Dr. Meera Nambiar is marked on statutory inspection leave");

  // Manual Reassignment with justification
  const reassignRes = defaultAssignmentEngine.reassignComplaint(
    sampleComplaint,
    "Mr. S. Verma",
    "Specialized faculty cadre inspection needed",
    "Dr. A. Kulkarni",
    "RB Officer"
  );
  assert(reassignRes.success === true, "Manual reassignment succeeded with mandatory justification");
  assert(reassignRes.auditEntry?.action === "Officer Reassigned", "Audit trail entry generated for reassignment");
  assert(reassignRes.timelineEvent?.event_type === "transfer", "Timeline event generated for reassignment");

  console.log("\n=================================================================");
  console.log("   ✅ ALL PHASE 1 AUTOMATED TESTS PASSED SUCCESSFULLY!          ");
  console.log("=================================================================\n");
}

runPhase1Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
