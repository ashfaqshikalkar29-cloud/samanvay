/**
 * Samanvay AICTE Grievance Portal
 * RFC 6238 Time-Based One-Time Password (TOTP) Multi-Factor Authentication (MFA)
 * Includes QR code generation, drift window verification, and SHA-256 hashed recovery backup codes.
 */

import crypto from "crypto";
import QRCode from "qrcode";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode Buffer to RFC 3548 Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode Base32 string back to Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a cryptographically secure Base32 TOTP secret (20 bytes = 160 bits = 32 Base32 chars)
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generate 6-digit TOTP for a given counter value and secret
 */
export function generateOtpForCounter(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

/**
 * Generate the current TOTP token for a secret
 */
export function generateCurrentTotp(secretBase32: string, timeStepSeconds: number = 30): string {
  const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  return generateOtpForCounter(secretBase32, counter);
}

/**
 * Verify a 6-digit TOTP code against a secret with time drift window tolerance
 * window = 1 checks: current step, -1 step (-30s), +1 step (+30s)
 */
export function verifyTotpToken(
  secretBase32: string,
  token: string,
  window: number = 1,
  timeStepSeconds: number = 30
): boolean {
  if (!token || token.trim().length !== 6) return false;
  const cleanToken = token.trim();
  const currentCounter = Math.floor(Date.now() / 1000 / timeStepSeconds);

  for (let delta = -window; delta <= window; delta++) {
    const expected = generateOtpForCounter(secretBase32, currentCounter + delta);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard otpauth URL for Google Authenticator, Microsoft Authenticator, etc.
 */
export function getOtpAuthUrl(accountName: string, secret: string, issuer: string = "Samanvay AICTE"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code data URL (PNG) from otpauth URL
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#0f172a", // Slate-900
      light: "#ffffff",
    },
  });
}

/**
 * Generate 8 alphanumeric recovery backup codes (e.g., 'A8B2-9F1C')
 */
export interface BackupCode {
  plain: string;
  hash: string;
}

export function generateRecoveryCodes(count: number = 8): {
  plainCodes: string[];
  hashedCodes: { hash: string; used: boolean }[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: { hash: string; used: boolean }[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const hash = crypto.createHash("sha256").update(formatted).digest("hex");

    plainCodes.push(formatted);
    hashedCodes.push({ hash, used: false });
  }

  return { plainCodes, hashedCodes };
}

/**
 * MFA User Record stored in repository or memory
 */
export interface MfaUserConfig {
  userId: string;
  secret: string;
  isEnabled: boolean;
  backupCodes: { hash: string; used: boolean }[];
  createdAt: string;
  enabledAt?: string;
  lastUsedAt?: string;
}

// In-memory MFA store with persistent runtime state
class MfaStore {
  private configs = new Map<string, MfaUserConfig>();

  constructor() {
    // Seed default administrative officer records for seamless out-of-the-box demo
    this.seedDemoUser("admin@aicte-india.org", "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    this.seedDemoUser("chairperson@aicte-india.org", "MZXW633PN5XW6MZXW633PN5XW6MZXW63");
    this.seedDemoUser("officer.rb@aicte-india.org", "NBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    this.seedDemoUser("officer.pgrc@aicte-india.org", "OBRWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
  }

  private seedDemoUser(userId: string, secret: string) {
    const { hashedCodes } = generateRecoveryCodes(8);
    this.configs.set(userId, {
      userId,
      secret,
      isEnabled: true,
      backupCodes: hashedCodes,
      createdAt: new Date().toISOString(),
      enabledAt: new Date().toISOString(),
    });
  }

  getConfig(userId: string): MfaUserConfig | undefined {
    return this.configs.get(userId);
  }

  savePendingSetup(userId: string, secret: string, backupCodes: { hash: string; used: boolean }[]): MfaUserConfig {
    const existing = this.configs.get(userId);
    const config: MfaUserConfig = {
      userId,
      secret,
      isEnabled: false,
      backupCodes,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    this.configs.set(userId, config);
    return config;
  }

  verifyAndEnable(userId: string, token: string): { success: boolean; error?: string } {
    const config = this.configs.get(userId);
    if (!config) {
      return { success: false, error: "No pending MFA setup found for user." };
    }

    const isValid = verifyTotpToken(config.secret, token);
    if (!isValid) {
      return { success: false, error: "Invalid TOTP verification code. Please check your authenticator app." };
    }

    config.isEnabled = true;
    config.enabledAt = new Date().toISOString();
    config.lastUsedAt = new Date().toISOString();
    return { success: true };
  }

  validateTokenOrBackupCode(
    userId: string,
    codeOrBackup: string
  ): { valid: boolean; isBackupCode?: boolean; error?: string } {
    const config = this.configs.get(userId);
    if (!config) {
      return { valid: false, error: "MFA is not configured for this account." };
    }

    if (!config.isEnabled) {
      return { valid: false, error: "MFA is configured but not yet verified and enabled." };
    }

    const cleanInput = codeOrBackup.trim().toUpperCase();

    // 1. Check if it's a 6-digit TOTP token
    if (/^\d{6}$/.test(cleanInput)) {
      const valid = verifyTotpToken(config.secret, cleanInput);
      if (valid) {
        config.lastUsedAt = new Date().toISOString();
        return { valid: true, isBackupCode: false };
      }
    }

    // 2. Check if it's an 8-character recovery backup code (e.g., ABCD-1234)
    const formattedBackup = cleanInput.includes("-") ? cleanInput : `${cleanInput.slice(0, 4)}-${cleanInput.slice(4, 8)}`;
    const inputHash = crypto.createHash("sha256").update(formattedBackup).digest("hex");

    const matchedBackup = config.backupCodes.find((b) => b.hash === inputHash);
    if (matchedBackup) {
      if (matchedBackup.used) {
        return { valid: false, error: "This backup code has already been consumed and cannot be reused." };
      }
      // Consume and burn the backup code
      matchedBackup.used = true;
      config.lastUsedAt = new Date().toISOString();
      return { valid: true, isBackupCode: true };
    }

    return { valid: false, error: "Invalid TOTP code or recovery backup code." };
  }

  disable(userId: string): boolean {
    const config = this.configs.get(userId);
    if (config) {
      config.isEnabled = false;
      return true;
    }
    return false;
  }
}

export const mfaStore = new MfaStore();
