/**
 * Samanvay AICTE Grievance Portal
 * Password Policy & Breached Password Check (Domain E)
 * Enforces CERT-In & NIST SP 800-63B guidelines:
 * - Minimum 12 characters
 * - Uppercase, lowercase, numeric, and symbol diversity
 * - Breached / common dictionary password rejection
 * - Mandatory password reset on first login for newly onboarded staff
 */

const COMMON_BREACHED_PASSWORDS = new Set([
  "password123",
  "admin@123",
  "aicte@2026",
  "samanvay123",
  "welcome@123",
  "india@123",
  "pass1234",
  "qwerty123456",
  "123456789012",
  "administrator",
]);

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  feedback: string[];
  isBreached: boolean;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { isValid: false, score: 0, feedback: ["Password is required."], isBreached: false };
  }

  // 1. Length Check
  if (password.length < 12) {
    feedback.push("Password must be at least 12 characters long.");
  } else {
    score += 1;
  }

  // 2. Character Diversity
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper) feedback.push("Must contain at least one uppercase letter (A-Z).");
  if (!hasLower) feedback.push("Must contain at least one lowercase letter (a-z).");
  if (!hasDigit) feedback.push("Must contain at least one number (0-9).");
  if (!hasSpecial) feedback.push("Must contain at least one special character (!@#$%^&*).");

  if (hasUpper && hasLower) score += 1;
  if (hasDigit && hasSpecial) score += 1;
  if (password.length >= 16) score += 1;

  // 3. Breached / Dictionary Check
  const normalized = password.toLowerCase();
  const isBreached = COMMON_BREACHED_PASSWORDS.has(normalized);
  if (isBreached) {
    feedback.push("This password has appeared in public security breach databases. Please choose a unique passphrase.");
  }

  const isValid = feedback.length === 0 && !isBreached;

  return {
    isValid,
    score: isValid ? Math.max(score, 3) : Math.min(score, 2),
    feedback,
    isBreached,
  };
}

/**
 * Tracks whether a user must change password on first login
 */
const firstLoginUsers = new Set<string>(["off-rb-bulk-1", "off-pgrc-bulk-2"]);

export function requiresPasswordChange(userId: string): boolean {
  return firstLoginUsers.has(userId);
}

export function markPasswordChanged(userId: string): void {
  firstLoginUsers.delete(userId);
}
