import crypto from "crypto";

// Use environment secret or deterministic server secret fallback
const ENCRYPTION_SECRET = process.env.ANONYMOUS_IDENTITY_SECRET || "samanvay-aicte-secure-anonymous-key-2026-secret-32b";
const KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();

export interface ComplainantIdentity {
  name: string;
  phone: string;
  email: string;
  address?: string;
}

export function generateAccessKey(): string {
  const bytes = crypto.randomBytes(6);
  return `AK-${bytes.toString("hex").toUpperCase().slice(0, 4)}-${bytes.toString("hex").toUpperCase().slice(4, 8)}`;
}

export function encryptIdentity(identity: ComplainantIdentity): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  
  const text = JSON.stringify(identity);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptIdentity(payload: string): ComplainantIdentity | null {
  try {
    const [ivHex, tagHex, encryptedHex] = payload.split(":");
    if (!ivHex || !tagHex || !encryptedHex) return null;

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (err) {
    console.error("Failed to decrypt confidential identity:", err);
    return null;
  }
}
