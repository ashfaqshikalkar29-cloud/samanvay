/**
 * Samanvay AICTE Grievance Portal
 * Production Environment Security & Secret Validator (Domain E)
 * Enforces CERT-In & OWASP rules: Startup check failing on default secrets in production.
 */

const INSECURE_DEFAULT_SECRETS = [
  "samanvay-default-secret-do-not-use-in-production",
  "samanvay-dpdp-aes256-default-key-change-me",
  "samanvay-aicte-tamper-proof-audit-hmac-key-2026",
  "secret",
  "password",
  "123456",
];

export function validateProductionEnvironment(): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return { isValid: true, issues: [] };
  }

  // 1. Audit Signing Secret
  const auditSecret = process.env.AUDIT_SIGNING_SECRET;
  if (!auditSecret || INSECURE_DEFAULT_SECRETS.includes(auditSecret)) {
    issues.push("AUDIT_SIGNING_SECRET is missing or using an insecure default secret.");
  }

  // 2. DPDP AES-256 Key
  const dpdpKey = process.env.DPDP_ENCRYPTION_KEY;
  if (!dpdpKey || INSECURE_DEFAULT_SECRETS.includes(dpdpKey)) {
    issues.push("DPDP_ENCRYPTION_KEY is missing or using an insecure default secret.");
  }

  // 3. Supabase Keys in Supabase Mode
  if (process.env.NEXT_PUBLIC_DATA_MODE === "supabase") {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost")) {
      issues.push("NEXT_PUBLIC_SUPABASE_URL cannot point to localhost in production mode.");
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided in production mode.");
    }
  }

  if (issues.length > 0) {
    const errorMsg = `[FATAL CRITICAL SECURITY FAILURE] Application startup blocked due to insecure configuration:\n - ${issues.join("\n - ")}`;
    console.error(errorMsg);
    // In production, halt boot
    throw new Error(errorMsg);
  }

  return { isValid: true, issues: [] };
}
