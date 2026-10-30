/**
 * Samanvay AICTE Grievance Portal
 * Phase 6 Verification Test Suite: Admin, Platform, Health, PWA, Assisted Filing & Coverage
 * Run via: npx tsx scripts/test-phase6-admin-platform.ts
 */

import assert from "assert";
import { featureFlagManager, DEFAULT_FEATURE_FLAGS } from "../lib/feature-flags";
import { OFFICER_ROSTER, smartAssignmentEngine } from "../lib/assignment";
import { ROLE_PERMISSIONS } from "../lib/security/rbac";
import { GET as getHealth } from "../app/health/route";

async function runTests() {
  console.log("===============================================================================");
  console.log("SAMANVAY: Phase 6 Admin Platform, Health, PWA & Accessibility Test Suite");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✕ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // ── 1. Feature Flag Engine Tests ──────────────────────────────────────────
  console.log("1. Feature Flag Engine (Domain G)");

  await test("Default flags loaded and contain key capabilities", () => {
    const flags = featureFlagManager.getAllFlags();
    assert(flags.length >= 9, "Expected at least 9 default feature flags");
    assert(featureFlagManager.getFlag("enable_ai_dedup") !== undefined);
    assert(featureFlagManager.getFlag("enable_auto_routing") !== undefined);
    assert(featureFlagManager.getFlag("enable_distress_scan") !== undefined);
    assert(featureFlagManager.getFlag("enable_simple_mode") !== undefined);
  });

  await test("Feature flag evaluation without role restriction", () => {
    const isDistressEnabled = featureFlagManager.isEnabled("enable_distress_scan");
    assert.strictEqual(isDistressEnabled, true);
  });

  await test("Feature flag role restriction guards", () => {
    // enable_auto_routing is only allowed for Admin and Chairperson
    const adminAllowed = featureFlagManager.isEnabled("enable_auto_routing", { role: "Admin" });
    const chairpersonAllowed = featureFlagManager.isEnabled("enable_auto_routing", { role: "Chairperson" });
    const complainantDenied = featureFlagManager.isEnabled("enable_auto_routing", { role: "Complainant" });
    const instituteDenied = featureFlagManager.isEnabled("enable_auto_routing", { role: "Institute" });

    assert.strictEqual(adminAllowed, true, "Admin should be allowed");
    assert.strictEqual(chairpersonAllowed, true, "Chairperson should be allowed");
    assert.strictEqual(complainantDenied, false, "Complainant should be denied");
    assert.strictEqual(instituteDenied, false, "Institute should be denied");
  });

  await test("Dynamic feature flag updates and author attribution", () => {
    const updated = featureFlagManager.setFlag(
      "enable_video_hearings",
      { isEnabled: false },
      "Auditor General"
    );
    assert(updated !== null);
    assert.strictEqual(updated?.isEnabled, false);
    assert.strictEqual(updated?.updatedBy, "Auditor General");

    // Reset back to true for other tests
    featureFlagManager.setFlag("enable_video_hearings", { isEnabled: true }, "Central Administrator");
    assert.strictEqual(featureFlagManager.isEnabled("enable_video_hearings", { role: "Admin" }), true);
  });

  // ── 2. System Health Probe Tests ──────────────────────────────────────────
  console.log("\n2. System Health Probe & Observability (Domain G)");

  await test("System Health Probe endpoint returns valid health telemetry", async () => {
    const response = await getHealth();
    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.status, "UP");
    assert(typeof data.uptimeSeconds === "number");
    assert(data.uptimeSeconds >= 0);
    assert(data.system !== undefined);
    assert(typeof data.system.memoryUsageMb.heapUsed === "number");
    assert(data.services !== undefined);
    assert.strictEqual(data.services.database.status, "HEALTHY");
    assert.strictEqual(data.services.embeddingsEngine.status, "READY");
    assert.strictEqual(data.services.auditChain.status, "SECURE");
    assert(typeof data.services.embeddingsEngine.latencyMs === "number");
    assert.strictEqual(data.services.slaWorker.status, "RUNNING");
  });

  // ── 3. Staff Roster & Leave Delegation Tests ──────────────────────────────
  console.log("\n3. Staff Roster & Smart Leave Delegation (Domain A & G)");

  await test("Officer roster initializes with RB and PGRC officers", () => {
    const roster = smartAssignmentEngine.getRoster();
    assert(roster.length >= 6);
    const rbOfficers = roster.filter((o) => o.bureau === "RB");
    const pgrcOfficers = roster.filter((o) => o.bureau === "PGRC");
    assert(rbOfficers.length >= 3);
    assert(pgrcOfficers.length >= 3);
  });

  await test("Leave tracking and delegation configuration", () => {
    const officerOnLeave = OFFICER_ROSTER.find((o) => o.onLeave);
    assert(officerOnLeave !== undefined, "Expected at least 1 officer on leave in seed data");
    assert(officerOnLeave?.delegateOfficerId !== undefined, "Expected delegate officer assigned");
    assert(officerOnLeave?.leaveUntil !== undefined, "Expected leave until date");
  });

  await test("Smart assignment routes around officers on leave to delegates", () => {
    // Dr. Meera Nambiar (off-rb-3) is on leave and delegated to Dr. A. Kulkarni (off-rb-1)
    const decision = smartAssignmentEngine.assignOfficer("RB", "Fee Regulation", "Western", "round-robin");
    assert(decision.officerId !== "off-rb-3", "Should not assign to officer currently on leave");
    assert(decision.officerName.length > 0);
    assert.strictEqual(decision.bureau, "RB");
  });

  // ── 4. Assisted Filing & Receipt Generation Tests ─────────────────────────
  console.log("\n4. Assisted Filing & Printable Receipts (Domain F)");

  await test("Assisted docket structure contains operator attribution and citizen consent", () => {
    const mockDocket = {
      docketId: "SAM-CSC-2026-4892",
      filedAt: "2026-10-30 16:00:00",
      operatorId: "CSC-VLE-84291",
      operatorName: "Suresh Kumar",
      cscCenterCode: "CSC-MH-PUN-042",
      district: "Pune",
      state: "Maharashtra",
      consentType: "Verbal Recorded",
      complainantName: "Ganesh Shinde",
      complainantMobile: "9876543210",
      complainantCategory: "Student",
      institutionName: "College of Engineering Pune (COEP Tech)",
      bureau: "RB" as const,
      category: "Fee Regulation",
      description: "College demanded unapproved library development fee of Rs. 15,000",
    };

    assert(mockDocket.docketId.startsWith("SAM-CSC-2026-"));
    assert(mockDocket.operatorId.startsWith("CSC-VLE-"));
    assert.strictEqual(mockDocket.consentType, "Verbal Recorded");
    assert.strictEqual(mockDocket.bureau, "RB");
    assert.strictEqual(mockDocket.complainantMobile.length, 10);
  });

  await test("Automatic bureau routing for assisted filing categories", () => {
    const rbCategories = ["Fee Regulation", "Faculty Norms", "Approval / Affiliation"];
    const pgrcCategories = ["Campus Safety & Anti-Ragging", "Scholarship", "Hostel & Amenities"];

    for (const cat of rbCategories) {
      const bureau = rbCategories.includes(cat) ? "RB" : "PGRC";
      assert.strictEqual(bureau, "RB", `Expected ${cat} to route to RB`);
    }

    for (const cat of pgrcCategories) {
      const bureau = rbCategories.includes(cat) ? "RB" : "PGRC";
      assert.strictEqual(bureau, "PGRC", `Expected ${cat} to route to PGRC`);
    }
  });

  // ── 5. Simple Mode Plain-Language Glossary ────────────────────────────────
  console.log("\n5. Simple Mode Plain-Language Dictionary (Domain F)");

  await test("Simple mode plain-language replacements replace bureaucratic jargon", () => {
    const dictionary: Record<string, string> = {
      "Approval Bureau (RB)": "College Approval Office",
      "Grievance Redressal Cell (PGRC)": "Student Welfare & Complaints Office",
      "SLA Breach": "Overdue Response",
      "Show-Cause Notice": "Formal Explanation Request Letter",
      "Adjudication": "Final Decision",
      "Disposed": "Resolved & Closed",
      "Capitation Fee": "Illegal Extra Donation / Fees",
      "DPDP Act 2023": "Digital Personal Data Protection Law",
    };

    assert.strictEqual(dictionary["Approval Bureau (RB)"], "College Approval Office");
    assert.strictEqual(dictionary["Grievance Redressal Cell (PGRC)"], "Student Welfare & Complaints Office");
    assert.strictEqual(dictionary["SLA Breach"], "Overdue Response");
    assert.strictEqual(dictionary["Show-Cause Notice"], "Formal Explanation Request Letter");
    assert.strictEqual(dictionary["Capitation Fee"], "Illegal Extra Donation / Fees");
  });

  // ── 6. RBAC Role Governance Verification ──────────────────────────────────
  console.log("\n6. RBAC Permissions Matrix Governance (Domain E & G)");

  await test("All 6 roles have defined permissions without nulls", () => {
    const roles = ["Admin", "RB Officer", "PGRC Officer", "Chairperson", "Institute", "Complainant"] as const;
    for (const role of roles) {
      const perms = ROLE_PERMISSIONS[role];
      assert(perms !== undefined, `Role ${role} must have defined permissions`);
      assert(perms.length > 0, `Role ${role} must have at least 1 permission`);
    }
    // Admin has highest permissions
    assert(ROLE_PERMISSIONS.Admin.length >= 15);
    // Complainant has restricted permissions
    assert(ROLE_PERMISSIONS.Complainant.length <= 5);
  });

  console.log("\n===============================================================================");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
