/**
 * Samanvay AICTE Grievance Portal
 * API Key Authentication & Rate Limiting for Versioned External API (/api/v1)
 */

import crypto from "crypto";

export interface ApiKeyRecord {
  keyId: string;
  name: string; // e.g. "Maharashtra DTE Integration Client"
  keyHash: string;
  prefix: string; // e.g. "aicte_v1_live_..."
  tenant: string; // e.g. "DTE_MAHARASHTRA"
  rateLimitPerMin: number;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

class ApiKeyManager {
  private keys = new Map<string, ApiKeyRecord>();
  private requestCounts = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    // Seed sample integration keys
    this.seedApiKey("Maharashtra DTE Nodal Client", "DTE_MAHARASHTRA", "aicte_v1_live_mah_881920491024");
    this.seedApiKey("Tamil Nadu DTE Portal", "DTE_TAMILNADU", "aicte_v1_live_tn_194018294018");
    this.seedApiKey("Central PMO Public Wing Client", "PMO_WING", "aicte_v1_live_pmo_994018294101");
  }

  private seedApiKey(name: string, tenant: string, plainKey: string) {
    const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");
    const keyId = `key-${tenant.toLowerCase()}`;
    this.keys.set(keyHash, {
      keyId,
      name,
      keyHash,
      prefix: plainKey.slice(0, 16),
      tenant,
      rateLimitPerMin: 120,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Validate API Key and check rate limiting
   */
  validateKey(plainKey: string): { valid: boolean; tenant?: string; error?: string; status?: number } {
    if (!plainKey || !plainKey.startsWith("aicte_v1_")) {
      return { valid: false, error: "Invalid API Key format. Must begin with 'aicte_v1_'.", status: 401 };
    }

    const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");
    const record = this.keys.get(keyHash);

    if (!record || !record.isActive) {
      return { valid: false, error: "API Key unauthorized or revoked.", status: 401 };
    }

    // Rate Limiting Check
    const now = Date.now();
    const rate = this.requestCounts.get(record.keyId);

    if (rate && rate.resetAt > now) {
      if (rate.count >= record.rateLimitPerMin) {
        return {
          valid: false,
          error: `API Rate limit exceeded: Maximum ${record.rateLimitPerMin} requests per minute.`,
          status: 429,
        };
      }
      rate.count++;
    } else {
      this.requestCounts.set(record.keyId, { count: 1, resetAt: now + 60000 });
    }

    record.lastUsedAt = new Date().toISOString();
    return { valid: true, tenant: record.tenant };
  }
}

export const apiKeyManager = new ApiKeyManager();
