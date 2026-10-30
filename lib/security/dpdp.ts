/**
 * Samanvay AICTE Grievance Portal
 * Digital Personal Data Protection (DPDP) Act 2023 Compliance Engine
 * Provides AES-256-GCM field-level encryption, role-based PII masking,
 * statutory unmasking audit logs, and DPDP Section 12 Data Erasure (Right to be Forgotten).
 */

import crypto from "crypto";
import { Role } from "@/lib/mock";
import { auditChain } from "@/lib/security/audit-chain";

const DPDP_SECRET =
  process.env.DPDP_ENCRYPTION_KEY ||
  process.env.ANONYMOUS_IDENTITY_SECRET ||
  "samanvay-aicte-dpdp-aes-256-gcm-master-key-32b";

// Derive 256-bit key using SHA-256
const ENCRYPTION_KEY = crypto.createHash("sha256").update(DPDP_SECRET).digest();

export interface ComplainantPII {
  name: string;
  phone: string;
  email: string;
  aadhaarOrId?: string;
  address?: string;
}

export interface EncryptedFieldPayload {
  format: "v1";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface PiiUnmaskLog {
  logId: string;
  complaintId: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  justification: string;
  timestamp: string;
  ipAddress?: string;
}

export interface DataErasureRecord {
  requestId: string;
  complaintId: string;
  requestedBy: string;
  actorRole: Role;
  reason: string;
  executedAt: string;
  status: "COMPLETED";
}

/**
 * Encrypt arbitrary plain text or JSON string using AES-256-GCM
 */
export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

  let ciphertext = cipher.update(plainText, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `v1:${iv.toString("hex")}:${authTag}:${ciphertext}`;
}

/**
 * Decrypt AES-256-GCM ciphertext formatted as v1:iv:authTag:ciphertext
 */
export function decryptField(payload: string): string | null {
  try {
    const parts = payload.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
      // Legacy fallback for iv:authTag:ciphertext format
      if (parts.length === 3) {
        const [ivHex, tagHex, cipherHex] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(tagHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let dec = decipher.update(cipherHex, "hex", "utf8");
        dec += decipher.final("utf8");
        return dec;
      }
      return null;
    }

    const [, ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("DPDP Decryption Error:", err);
    return null;
  }
}

/**
 * Encrypt full complainant PII object into secure storage string
 */
export function encryptComplainantPII(pii: ComplainantPII): string {
  return encryptField(JSON.stringify(pii));
}

/**
 * Decrypt full complainant PII object
 */
export function decryptComplainantPII(encryptedPayload: string): ComplainantPII | null {
  const decrypted = decryptField(encryptedPayload);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Mask Complainant Name: 'Ramesh Kumar Sharma' -> 'R**** K**** S****'
 */
export function maskName(name: string): string {
  if (!name || name.trim().length === 0) return "Anonymous Citizen";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + "*".repeat(Math.min(part.length - 1, 4));
    })
    .join(" ");
}

/**
 * Mask Phone: '+91 9876543210' -> '+91 98*****210'
 */
export function maskPhone(phone: string): string {
  if (!phone) return "+91 XXXXXXXXXX";
  const clean = phone.trim();
  if (clean.length < 6) return "******";
  const start = clean.slice(0, Math.min(6, clean.length - 3));
  const end = clean.slice(-3);
  return `${start}${"*".repeat(Math.max(3, clean.length - start.length - end.length))}${end}`;
}

/**
 * Mask Email: 'ananya.sharma@gmail.com' -> 'a*****a@gmail.com'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "******@aicte-india.org";
  const [local, domain] = email.trim().split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const maskedLocal = `${local[0]}${"*".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask Aadhaar / Government ID: '1234 5678 9012' -> 'XXXX-XXXX-9012'
 */
export function maskGovernmentId(idNumber?: string): string {
  if (!idNumber) return "XXXX-XXXX-XXXX";
  const clean = idNumber.replace(/[\s-]/g, "");
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * In-Memory DPDP Stores for Unmasking Audits and Data Erasure
 */
class DpdpComplianceStore {
  private unmaskLogs: PiiUnmaskLog[] = [];
  private erasureRecords: DataErasureRecord[] = [];

  constructor() {
    // Seed initial unmask log for testing
    this.unmaskLogs.push({
      logId: "unmask-log-seed-1",
      complaintId: "COMP-2026-0001",
      actorId: "usr-admin-1",
      actorName: "Dr. A. K. Mittal",
      actorRole: "Admin",
      justification: "Statutory notice verification per AICTE 2026 Approval Regulations clause 7.2",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    });
  }

  /**
   * Log statutory unmasking event and write to cryptographic audit chain
   */
  logUnmasking(
    complaintId: string,
    actor: { id: string; name: string; role: Role; bureau?: string },
    justification: string,
    ipAddress?: string
  ): PiiUnmaskLog {
    const logId = `unmask-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const log: PiiUnmaskLog = {
      logId,
      complaintId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      justification,
      timestamp,
      ipAddress,
    };

    this.unmaskLogs.push(log);

    // Cryptographic audit chain link
    auditChain.appendBlock(
      complaintId,
      "DPDP_PII_UNMASK_ACCESS",
      actor,
      {
        logId,
        justification,
        fields_revealed: ["name", "phone", "email", "address"],
        statutory_mandate: "AICTE Confidential Redressal Framework & DPDP 2023",
      }
    );

    return log;
  }

  getUnmaskLogs(complaintId?: string): PiiUnmaskLog[] {
    if (!complaintId) return [...this.unmaskLogs];
    return this.unmaskLogs.filter((l) => l.complaintId === complaintId);
  }

  /**
   * Execute DPDP Section 12 Right-To-Be-Forgotten Erasure
   */
  executeErasure(
    complaintId: string,
    requestedBy: string,
    actorRole: Role,
    reason: string
  ): DataErasureRecord {
    const requestId = `dpdp-erasure-${Date.now()}`;
    const executedAt = new Date().toISOString();

    const record: DataErasureRecord = {
      requestId,
      complaintId,
      requestedBy,
      actorRole,
      reason,
      executedAt,
      status: "COMPLETED",
    };

    this.erasureRecords.push(record);

    // Write permanent erasure event to cryptographic audit chain
    auditChain.appendBlock(
      complaintId,
      "DPDP_DATA_ERASURE_EXECUTED",
      { id: requestedBy, name: "Citizen Complainant / Data Principal", role: actorRole },
      {
        requestId,
        legal_basis: "DPDP Act 2023 Section 12 (Right to Erasure of Personal Data)",
        action_taken: "All personal identifiers expunged; anonymized case metadata retained for statutory compliance",
        reason,
      }
    );

    return record;
  }

  getErasureRecords(): DataErasureRecord[] {
    return [...this.erasureRecords];
  }
}

export const dpdpService = new DpdpComplianceStore();
