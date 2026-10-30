/**
 * Samanvay AICTE Grievance Portal
 * Automated Verification Test Suite - Phase 5: External Integration Adapters, Hearings & Policies
 */

import { aicteDbAdapter } from "../lib/integrations/aicte-db";
import { cpgramsAdapter } from "../lib/integrations/cpgrams";
import { digiLockerAdapter } from "../lib/integrations/digilocker";
import { scholarshipPfmsAdapter } from "../lib/integrations/scholarship-pfms";
import { regulatorForwardAdapter } from "../lib/integrations/regulator-forward";
import { eOfficeAdapter } from "../lib/integrations/eoffice";
import { videoHearingAdapter } from "../lib/integrations/video-hearing";
import { hearingManager } from "../lib/hearings";
import { noticeManager } from "../lib/notices";
import { penaltyTracker } from "../lib/penalties";
import { apiKeyManager } from "../lib/api-keys";
import { knowledgeBaseService } from "../lib/knowledge-base";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${details ? " - " + details : ""}`);
    failCount++;
  }
}

async function runPhase5Tests() {
  console.log("\n==================================================================");
  console.log("  SAMANVAY PHASE 5: EXTERNAL ADAPTERS & WORKFLOW TEST SUITE");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------
  // 1. AICTE Approval Database Integration Adapter
  // ----------------------------------------------------------------------
  console.log("--- 1. AICTE Approval Database Adapter ---");

  const approval1 = await aicteDbAdapter.getApprovalRecord("inst-1");
  assert(Boolean(approval1 && approval1.aicte_id === "1-10972411"), "AICTE DB adapter resolves record by institute ID");
  assert(Boolean(approval1?.programmes.length && approval1.programmes.length >= 3), "AICTE DB returns approved programmes and intake numbers");
  assert(Boolean(approval1?.mandatory_committees.anti_ragging_committee), "AICTE DB returns mandatory committee compliance status");

  const approvalByAicteId = await aicteDbAdapter.getApprovalRecord("1-33274981");
  assert(Boolean(approvalByAicteId && approvalByAicteId.institution_id === "inst-2"), "AICTE DB adapter resolves record by 1-xxxx AICTE ID");
  assert(approvalByAicteId?.approval_status === "Show-Cause Pending", "AICTE DB identifies show-cause status for inst-2");

  // ----------------------------------------------------------------------
  // 2. CPGRAMS Ingestion & De-duplication Adapter
  // ----------------------------------------------------------------------
  console.log("\n--- 2. CPGRAMS Ingestion & Overlap Adapter ---");

  const pendingCpgrams = await cpgramsAdapter.fetchPendingQueue();
  assert(pendingCpgrams.length >= 2, `fetchPendingQueue returns ${pendingCpgrams.length} pending CPGRAMS grievances`);

  const duplicateImport = await cpgramsAdapter.ingestGrievance(pendingCpgrams[0]);
  assert(
    duplicateImport.status === "CONSOLIDATED_DUPLICATE" || duplicateImport.status === "INGESTED_NEW",
    `CPGRAMS ingestion de-duplication evaluated status: ${duplicateImport.status}`
  );
  assert(Boolean(duplicateImport.samanvay_docket_id.startsWith("SMV-CPGRAMS-")), "CPGRAMS generates synchronized Samanvay tracking reference");

  // ----------------------------------------------------------------------
  // 3. DigiLocker Identity Verification Adapter
  // ----------------------------------------------------------------------
  console.log("\n--- 3. DigiLocker Identity Verification Adapter ---");

  const { authUrl, state } = digiLockerAdapter.getAuthorizationUrl("COMP-2026-0001", "http://localhost:2001/api/auth/callback");
  assert(authUrl.includes("digilocker.meripehchaan.gov.in") && state.includes("COMP-2026-0001"), "getAuthorizationUrl generates compliant PKCE consent URL");

  const verifiedProfile = await digiLockerAdapter.exchangeConsentCode("mock-code-1234", "COMP-2026-0001", "Ananya Sharma");
  assert(verifiedProfile.is_verified === true, "exchangeConsentCode returns verified citizen state");
  assert(verifiedProfile.masked_aadhaar.startsWith("XXXXXXXX"), "Masked Aadhaar returned securely without storing raw UID");

  // ----------------------------------------------------------------------
  // 4. NSP / PFMS Scholarship Lookup Adapter
  // ----------------------------------------------------------------------
  console.log("\n--- 4. NSP / PFMS Scholarship Status Adapter ---");

  const scholarshipPragati = await scholarshipPfmsAdapter.lookupScholarship("NSP-2026-PRAGATI-0192");
  assert(scholarshipPragati?.disbursement_status === "DISBURSED", "NSP lookup resolves Pragati scholarship as DISBURSED");
  assert(scholarshipPragati?.sanctioned_amount === 50000 && Boolean(scholarshipPragati?.utr_reference), "Disbursement includes Rs 50,000 and valid bank UTR reference");

  const scholarshipGate = await scholarshipPfmsAdapter.lookupScholarship("NSP-2026-GATE-4491");
  assert(scholarshipGate?.disbursement_status === "PFMS_PROCESSING", "NSP lookup resolves GATE scholarship in PFMS_PROCESSING status");

  const scholarshipByAadhaar = await scholarshipPfmsAdapter.lookupScholarship("4912");
  assert(Boolean(scholarshipByAadhaar && scholarshipByAadhaar.student_aadhaar_last4 === "4912"), "Scholarship lookup by student Aadhaar last-4 succeeds");

  // ----------------------------------------------------------------------
  // 5. Cross-Regulator Referral Adapter
  // ----------------------------------------------------------------------
  console.log("\n--- 5. Cross-Regulator Referral Adapter ---");

  const referral = await regulatorForwardAdapter.forwardGrievance({
    complaintId: "COMP-2026-UGC-01",
    regulator: "UGC",
    officerName: "Dr. A. K. Mittal",
    remarks: "Campus-wide fee dispute involves university degree departments beyond AICTE sole purview",
  });
  assert(referral.status === "OUTWARD_DISPATCHED", "forwardGrievance dispatches referral in OUTWARD_DISPATCHED status");
  assert(referral.official_reference_number.includes("AICTE/INTER-REG/UGC"), "Generates official inter-regulatory reference number");
  assert(Boolean(referral.expected_reply_date), "Calculates statutory expected reply deadline");

  // ----------------------------------------------------------------------
  // 6. e-Office Dossier Export Adapter
  // ----------------------------------------------------------------------
  console.log("\n--- 6. e-Office Dossier Export Adapter ---");

  const dossier = await eOfficeAdapter.exportToEOffice({
    complaintId: "C-1001",
    officerName: "Dr. Rajesh Verma",
    bureau: "PGRC",
    subject: "Statutory Order on Arbitrary Fee Overcharge",
    notingText: "Recommend issuance of formal show-cause under APH Clause 7.1",
  });
  assert(dossier.diarize_number.startsWith("EO-AICTE-"), "exportToEOffice generates formal NIC diarization number");
  assert(dossier.green_sheet_notes.length >= 1, "Generates electronic green-sheet noting trail");

  const approvedDossier = await eOfficeAdapter.processApprovalWebhook(dossier.dossier_id, "Approved. Proceed with show-cause.");
  assert(approvedDossier?.dispatch_status === "APPROVED_BY_CHAIRPERSON", "e-Office webhook successfully records Chairperson approval");
  assert(Boolean(approvedDossier?.green_sheet_notes.some((n) => n.includes("Note #2"))), "Green-sheet noting appended with Note #2");

  // ----------------------------------------------------------------------
  // 7. Video Hearing & Conflict Detection Engine
  // ----------------------------------------------------------------------
  console.log("\n--- 7. Video Hearing & Conflict Detection Engine ---");

  const videoMeeting = await videoHearingAdapter.provisionMeeting({
    hearingId: "HRG-TEST-001",
    complaintId: "C-1001",
    title: "Inquiry on Capitation Fee",
    startIso: "2026-11-10T10:00:00Z",
    endIso: "2026-11-10T11:00:00Z",
    participants: [{ name: "Ananya Sharma", email: "citizen@example.com", role: "Complainant" }],
  });
  assert(videoMeeting.meeting_url.includes("meet.google.com"), "videoHearingAdapter provisions Google Meet link");
  assert(videoMeeting.ics_calendar_data.includes("BEGIN:VCALENDAR"), "videoHearingAdapter generates RFC 5545 .ics iCalendar data");

  // Test Schedule Conflict Detection
  console.log("  > Testing participant conflict detection...");
  const conflictTest = hearingManager.checkForConflicts(
    "2026-11-05", // Same date as sample hearing HRG-2026-001 (11:00-12:00)
    "11:30",
    "12:30",
    [{ name: "Ananya Sharma", email: "ananya.sharma@gmail.com", role: "Complainant", attendance_status: "Invited" }],
    "Different Officer"
  );
  assert(conflictTest.hasConflict === true, "checkForConflicts successfully flags overlapping participant booking");

  // Schedule valid non-conflicting hearing
  const newHearing = await hearingManager.scheduleHearing({
    complaintId: "C-1002",
    title: "Examination of Faculty Salary Withholding",
    date: "2026-11-12",
    startTime: "14:00",
    endTime: "15:00",
    mode: "Video",
    presidingOfficer: "Dr. A. Kulkarni (Director)",
    participants: [
      { name: "Dr. Ramesh Deshmukh", email: "ramesh@college.edu", role: "Complainant", attendance_status: "Invited" },
      { name: "Principal", email: "principal@college.edu", role: "Principal / Institute Head", attendance_status: "Invited" },
    ],
  });
  assert(newHearing.hearing.status === "Scheduled", "scheduleHearing successfully convenes hearing");

  // Record Minutes of Hearing
  const concludedHearing = await hearingManager.recordHearingMinutes(
    newHearing.hearing.id,
    "Quorum convened. Principal admitted delay in 7th CPC disbursal. Directed full salary payment by Nov 20.",
    "Order #14: Pay pending salary within 8 days"
  );
  assert(concludedHearing?.status === "Concluded", "recordHearingMinutes successfully concludes hearing with order");

  // ----------------------------------------------------------------------
  // 8. Show-Cause Notice Engine
  // ----------------------------------------------------------------------
  console.log("\n--- 8. Show-Cause Notice Engine ---");

  const notice = await noticeManager.issueNotice({
    complaintId: "C-1001",
    institutionId: "inst-1",
    institutionName: "Sahyadri Institute of Engineering & Technology",
    category: "Fee Regulation",
    allegationSummary: "Arbitrary collection of capitation fee of Rs 45,000.",
    issuedByOfficer: "Dr. Rajesh Verma",
    deadlineDays: 15,
  });
  assert(notice.notice_reference.startsWith("AICTE/LEGAL/SCN/"), "issueNotice generates standard notice reference");
  assert(notice.rendered_text.includes("Sahyadri Institute of Engineering & Technology"), "Show-cause template merges {{institute_name}} tag");
  assert(notice.rendered_text.includes(notice.compliance_deadline), "Show-cause template merges {{compliance_deadline}} tag");

  // Submit Institutional Reply
  const repliedNotice = await noticeManager.submitReply(notice.id, {
    explanation: "Tuition fee was mistakenly billed by accounts clerk. Refund of Rs 45,000 has been initiated.",
    attachmentUrls: ["https://samanvay.aicte-india.org/proof/refund-voucher-001.pdf"],
  });
  assert(repliedNotice?.status === "REPLY_SUBMITTED", "submitReply records formal institution response and proof");

  // ----------------------------------------------------------------------
  // 9. Regulatory Penalty Tracker
  // ----------------------------------------------------------------------
  console.log("\n--- 9. Regulatory Action & Penalty Tracker ---");

  const penalty = await penaltyTracker.imposePenalty({
    complaintId: "C-1001",
    institutionId: "inst-1",
    institutionName: "Sahyadri Institute of Engineering & Technology",
    penaltyType: "FEE_REFUND_ORDER",
    title: "Restitution Order for Capitation Fee Refund",
    directiveDetails: "Refund Rs 45,000 within 15 days.",
    monetaryAmount: 45000,
    complianceDeadline: "2026-11-15",
    orderedBy: "Chairperson, AICTE",
  });
  assert(penalty.status === "PENDING_COMPLIANCE", "imposePenalty records directive in PENDING_COMPLIANCE");

  // Verify compliance
  const verifiedPenalty = await penaltyTracker.verifyCompliance(penalty.id, "Dr. Rajesh Verma", "Bank refund statement verified.");
  assert(verifiedPenalty?.status === "COMPLIANCE_VERIFIED", "verifyCompliance marks directive verified and closed");

  // ----------------------------------------------------------------------
  // 10. API v1 Integration Client Authentication & Rate Limiting
  // ----------------------------------------------------------------------
  console.log("\n--- 10. API v1 Authentication & Rate Limiting ---");

  const validKeyCheck = apiKeyManager.validateKey("aicte_v1_live_mah_881920491024");
  assert(validKeyCheck.valid === true && validKeyCheck.tenant === "DTE_MAHARASHTRA", "apiKeyManager authorizes valid State DTE key");

  const invalidKeyCheck = apiKeyManager.validateKey("aicte_v1_invalid_key_random");
  assert(invalidKeyCheck.valid === false && invalidKeyCheck.status === 401, "apiKeyManager blocks unauthorized key with 401");

  // ----------------------------------------------------------------------
  // 11. Regulatory Knowledge Base Search
  // ----------------------------------------------------------------------
  console.log("\n--- 11. Regulatory Knowledge Base Search ---");

  const feeArticles = knowledgeBaseService.searchArticles("fee refund");
  assert(feeArticles.length > 0 && feeArticles[0].aph_clause.includes("Clause 7.1.3"), "knowledgeBaseService returns APH Clause 7.1.3 for fee refund search");

  const raggingArticles = knowledgeBaseService.searchArticles("ragging");
  assert(raggingArticles.length > 0 && raggingArticles[0].summary.includes("non-bailable"), "knowledgeBaseService returns 24-hr FIR mandate for anti-ragging search");

  // ----------------------------------------------------------------------
  // Test Summary
  // ----------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`  PHASE 5 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
