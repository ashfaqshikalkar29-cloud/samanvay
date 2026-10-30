/**
 * Samanvay AICTE Grievance Portal
 * Automated Verification Test Suite - Phase 4: Security, Privacy & Compliance (Domain E)
 */

import {
  hasPermission,
  getPermissionsForRole,
  ROLE_PERMISSIONS,
  authorizePermission,
} from "../lib/security/rbac";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateCurrentTotp,
  verifyTotpToken,
  generateRecoveryCodes,
  mfaStore,
  getOtpAuthUrl,
} from "../lib/security/totp";
import {
  auditChain,
  computeDetailsHash,
  computeBlockHash,
  GENESIS_PREV_HASH,
} from "../lib/security/audit-chain";
import {
  encryptField,
  decryptField,
  encryptComplainantPII,
  decryptComplainantPII,
  maskName,
  maskPhone,
  maskEmail,
  maskGovernmentId,
  dpdpService,
} from "../lib/security/dpdp";

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

async function runPhase4SecurityTests() {
  console.log("\n========================================================");
  console.log("  SAMANVAY PHASE 4: SECURITY & PRIVACY VERIFICATION SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------------------------
  // 1. RBAC Permission Matrix Verification
  // ----------------------------------------------------------------------
  console.log("--- 1. Role-Based Access Control (RBAC) Matrix ---");

  assert(hasPermission("Admin", "workflow:configure"), "Admin has workflow:configure permission");
  assert(hasPermission("Admin", "identity:reveal"), "Admin has identity:reveal permission");
  assert(hasPermission("Chairperson", "identity:reveal"), "Chairperson has identity:reveal permission");
  assert(!hasPermission("RB Officer", "identity:reveal"), "RB Officer CANNOT reveal confidential PII");
  assert(!hasPermission("PGRC Officer", "identity:reveal"), "PGRC Officer CANNOT reveal confidential PII");
  assert(!hasPermission("Institute", "identity:reveal"), "Institute CANNOT reveal complainant PII");
  assert(!hasPermission("Complainant", "identity:reveal"), "Complainant CANNOT reveal other PII");

  assert(hasPermission("Chairperson", "conflict:resolve"), "Chairperson has conflict:resolve permission");
  assert(hasPermission("Chairperson", "penalty:impose"), "Chairperson has penalty:impose permission");
  assert(!hasPermission("RB Officer", "penalty:impose"), "RB Officer CANNOT impose penalties unilaterally");

  assert(hasPermission("Institute", "complaint:extend"), "Institute has complaint:extend permission");
  assert(hasPermission("Institute", "complaint:respond"), "Institute has complaint:respond permission");
  assert(!hasPermission("Institute", "complaint:transition"), "Institute CANNOT transition complaint stages");

  assert(hasPermission("Complainant", "complaint:withdraw"), "Complainant has complaint:withdraw permission");
  assert(hasPermission("Complainant", "privacy:erase"), "Complainant has DPDP privacy:erase permission");

  const authCheckAdmin = authorizePermission({ role: "Admin" }, "identity:reveal");
  assert(authCheckAdmin.authorized, "authorizePermission succeeds for Admin on identity:reveal");

  const authCheckOfficer = authorizePermission({ role: "RB Officer" }, "identity:reveal");
  assert(!authCheckOfficer.authorized && Boolean(authCheckOfficer.reason?.includes("Access Denied")), "authorizePermission blocks RB Officer on identity:reveal");

  // ----------------------------------------------------------------------
  // 2. TOTP Multi-Factor Authentication (RFC 6238)
  // ----------------------------------------------------------------------
  console.log("\n--- 2. RFC 6238 TOTP Multi-Factor Authentication ---");

  // Base32 round-trip
  const testBuffer = Buffer.from("AICTE-SAMANVAY-2026-TEST");
  const encodedBase32 = base32Encode(testBuffer);
  const decodedBuffer = base32Decode(encodedBase32);
  assert(testBuffer.equals(decodedBuffer), "Base32 encoding & decoding round-trips byte-for-byte");

  // Secret generation
  const secret = generateTotpSecret();
  assert(typeof secret === "string" && secret.length === 32, "generateTotpSecret produces 32-character Base32 secret");

  // Current OTP generation & validation
  const currentOtp = generateCurrentTotp(secret);
  assert(/^\d{6}$/.test(currentOtp), "generateCurrentTotp produces 6-digit numeric token");

  const isValidCurrent = verifyTotpToken(secret, currentOtp);
  assert(isValidCurrent, "verifyTotpToken successfully verifies current 6-digit TOTP token");

  const isInvalidOtp = verifyTotpToken(secret, "999999" === currentOtp ? "000000" : "999999");
  assert(!isInvalidOtp, "verifyTotpToken rejects erroneous TOTP token");

  // otpauth URL format
  const otpUrl = getOtpAuthUrl("officer.rb@aicte-india.org", secret);
  assert(otpUrl.startsWith("otpauth://totp/Samanvay%20AICTE:officer.rb%40aicte-india.org"), "getOtpAuthUrl produces compliant URI");

  // Emergency Backup Recovery Codes
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  assert(plainCodes.length === 8 && hashedCodes.length === 8, "generateRecoveryCodes produces 8 backup codes and hashes");
  assert(/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(plainCodes[0]), "Backup code adheres to standard alphanumeric format (e.g. A1B2-C3D4)");

  // Test mfaStore full lifecycle
  const testUserId = "officer.test.mfa@aicte-india.org";
  mfaStore.savePendingSetup(testUserId, secret, hashedCodes);
  assert(mfaStore.getConfig(testUserId)?.isEnabled === false, "MFA store records pending setup as unverified");

  const enableResult = mfaStore.verifyAndEnable(testUserId, currentOtp);
  assert(enableResult.success && mfaStore.getConfig(testUserId)?.isEnabled === true, "verifyAndEnable activates MFA upon correct token");

  // Test single-use backup recovery code consumption
  const backupToTest = plainCodes[0];
  const validateBackup1 = mfaStore.validateTokenOrBackupCode(testUserId, backupToTest);
  assert(validateBackup1.valid && validateBackup1.isBackupCode === true, "Recovery backup code accepted for authentication");

  // Verify backup code is burned (cannot be reused)
  const validateBackup2 = mfaStore.validateTokenOrBackupCode(testUserId, backupToTest);
  assert(!validateBackup2.valid && Boolean(validateBackup2.error?.includes("already been consumed")), "Recovery backup code is permanently burned after single use");

  // ----------------------------------------------------------------------
  // 3. Cryptographic Hash-Chained Audit Trail
  // ----------------------------------------------------------------------
  console.log("\n--- 3. Cryptographic Hash-Chained Audit Trail ---");

  const initialBlocks = auditChain.getBlocks();
  assert(initialBlocks.length >= 3, `Audit chain initialized with ${initialBlocks.length} blocks including Genesis`);

  const genesisBlock = initialBlocks[0];
  assert(genesisBlock.block_index === 0, "Genesis block has index 0");
  assert(genesisBlock.previous_hash === GENESIS_PREV_HASH, "Genesis block previous_hash has 64 zeros");

  // Append new verified block
  const newAuditBlock = auditChain.appendBlock(
    "COMP-2026-TEST",
    "STAGE_TRANSITION_VERIFIED",
    { id: "usr-admin-1", name: "Dr. A. K. Mittal", role: "Admin", bureau: "Central" },
    { from_stage: "Scrutiny", to_stage: "Show-Cause", statutory_rule: "APH 2026 Cl. 4.1" }
  );
  assert(newAuditBlock.previous_hash === initialBlocks[initialBlocks.length - 1].block_hash, "New block successfully links to previous head block hash");

  // Run integrity verification on pristine chain
  const verifyClean = auditChain.verifyChain();
  assert(verifyClean.isValid, `auditChain.verifyChain() validates 100% cryptographic integrity across all ${verifyClean.totalBlocks} blocks`);

  // Tamper Injection Test: Simulate malicious DB alteration
  console.log("  > Injecting simulated malicious tampering into Block #1...");
  auditChain.simulateTamper(1, "action", "MALICIOUS_UNAUTHORIZED_STAGE_BYPASS");

  const verifyTampered = auditChain.verifyChain();
  assert(!verifyTampered.isValid, "Tamper Detection: verifyChain() caught the malicious tampering!");
  assert(verifyTampered.brokenIndex === 1, `Tamper Pinpointing: Successfully isolated broken block index at #${verifyTampered.brokenIndex}`);

  // Restore pristine chain
  auditChain.restorePristineChain();
  const verifyRestored = auditChain.verifyChain();
  assert(verifyRestored.isValid, "Pristine restore succeeds: chain integrity 100% re-established");

  // ----------------------------------------------------------------------
  // 4. DPDP Act 2023 Compliance & Field-Level Encryption
  // ----------------------------------------------------------------------
  console.log("\n--- 4. DPDP Act 2023 Compliance & Field-Level Encryption ---");

  const secretPiiText = "Aadhaar: 1234-5678-9012, Secret Note: Whistleblower faculty at campus";
  const encryptedField = encryptField(secretPiiText);
  assert(encryptedField.startsWith("v1:"), "encryptField produces v1 formatted ciphertext");

  const decryptedField = decryptField(encryptedField);
  assert(decryptedField === secretPiiText, "decryptField recovers original plaintext byte-for-byte");

  // Complainant PII object encryption
  const originalPii = {
    name: "Dr. Sandeep Deshmukh",
    phone: "+91 98220 12345",
    email: "sandeep.deshmukh@vit.edu",
    aadhaarOrId: "5432-1098-7654",
    address: "Staff Quarters 14, Pune, Maharashtra",
  };
  const encryptedPii = encryptComplainantPII(originalPii);
  const decryptedPii = decryptComplainantPII(encryptedPii);
  assert(decryptedPii?.name === originalPii.name && decryptedPii?.phone === originalPii.phone, "encryptComplainantPII & decryptComplainantPII round-trips structured PII");

  // Masking functions
  assert(maskName("Ananya Sharma") === "A**** S****" || maskName("Ananya Sharma").startsWith("A*"), `maskName produces masked format: ${maskName("Ananya Sharma")}`);
  assert(maskPhone("+91 9876543210").includes("*"), `maskPhone masks intermediate digits: ${maskPhone("+91 9876543210")}`);
  assert(maskEmail("ananya.sharma@gmail.com").includes("*"), `maskEmail masks username: ${maskEmail("ananya.sharma@gmail.com")}`);
  assert(maskGovernmentId("1234 5678 9012") === "XXXX-XXXX-9012", `maskGovernmentId preserves last 4 digits: ${maskGovernmentId("1234 5678 9012")}`);

  // Statutory Unmasking with Mandatory Justification & Audit Logging
  const unmaskLog = dpdpService.logUnmasking(
    "COMP-2026-TEST",
    { id: "usr-admin-1", name: "Central Admin", role: "Admin", bureau: "Central" },
    "Statutory hearing summons issued under AICTE Regulations 2026 clause 8.1"
  );
  assert(unmaskLog.logId.startsWith("unmask-"), "logUnmasking generates audit log entry");

  // Check that unmasking event was written to the cryptographic audit chain!
  const latestBlocks = auditChain.getBlocks("COMP-2026-TEST");
  const unmaskAuditBlock = latestBlocks.find((b) => b.action === "DPDP_PII_UNMASK_ACCESS");
  assert(Boolean(unmaskAuditBlock), "Statutory PII unmasking automatically appended a block to the cryptographic audit chain!");

  // Right-to-be-Forgotten Data Erasure Execution
  const erasureRecord = dpdpService.executeErasure(
    "COMP-2026-TEST",
    "citizen-user-123",
    "Complainant",
    "Complainant requested erasure per DPDP Act Section 12"
  );
  assert(erasureRecord.status === "COMPLETED", "executeErasure completes DPDP Section 12 erasure record");

  const erasureAuditBlock = auditChain.getBlocks("COMP-2026-TEST").find((b) => b.action === "DPDP_DATA_ERASURE_EXECUTED");
  assert(Boolean(erasureAuditBlock), "DPDP Section 12 Erasure automatically appended an immutable block to the audit chain!");

  // ----------------------------------------------------------------------
  // Test Summary
  // ----------------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  PHASE 4 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("========================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase4SecurityTests().catch((err) => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
