export interface OtpRecord {
  code: string;
  expiresAt: number; // timestamp ms
  attempts: number;
}

export interface NotificationProvider {
  sendSms(phone: string, message: string): Promise<boolean>;
  sendEmail(email: string, subject: string, message: string): Promise<boolean>;
}

// Dev mock provider that logs to console
export class MockNotificationProvider implements NotificationProvider {
  async sendSms(phone: string, message: string): Promise<boolean> {
    console.log(`[SMS-MOCK] To: ${phone} | Content: ${message}`);
    return true;
  }

  async sendEmail(email: string, subject: string, message: string): Promise<boolean> {
    console.log(`[EMAIL-MOCK] To: ${email} | Subject: ${subject} | Content: ${message}`);
    return true;
  }
}

export const notificationService = new MockNotificationProvider();

// In-memory OTP cache with TTL and rate limiting
class OtpStore {
  private store = new Map<string, OtpRecord>();
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  generate(target: string): { code: string; expiresAt: number; error?: string } {
    const now = Date.now();
    const cleanTarget = target.trim().toLowerCase();

    // Rate limiting: max 3 OTP requests per 5 minutes
    const limit = this.rateLimits.get(cleanTarget);
    if (limit && limit.resetAt > now) {
      if (limit.count >= 3) {
        return {
          code: "",
          expiresAt: 0,
          error: "Too many OTP requests. Please wait 5 minutes before trying again.",
        };
      }
      limit.count += 1;
    } else {
      this.rateLimits.set(cleanTarget, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

    // Generate random 6-digit number
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    this.store.set(cleanTarget, {
      code,
      expiresAt,
      attempts: 0,
    });

    return { code, expiresAt };
  }

  verify(target: string, code: string): { valid: boolean; reason?: string } {
    const cleanTarget = target.trim().toLowerCase();
    const record = this.store.get(cleanTarget);

    if (!record) {
      return { valid: false, reason: "No OTP was requested for this destination." };
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(cleanTarget);
      return { valid: false, reason: "OTP has expired. Please request a new code." };
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      this.store.delete(cleanTarget);
      return { valid: false, reason: "Maximum attempts exceeded. Please request a new OTP." };
    }

    if (record.code !== code.trim()) {
      return { valid: false, reason: "Incorrect OTP code. Please check and re-enter." };
    }

    // Success - consume OTP
    this.store.delete(cleanTarget);
    return { valid: true };
  }
}

export const otpStore = new OtpStore();
