/**
 * Samanvay AICTE Grievance Portal
 * Database-Backed Feature Flag Engine (Domain G)
 * Provides dynamic feature flag evaluation with role, environment, and tenant overrides.
 */

import { Role } from "@/lib/mock";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: "AI & ML" | "Integrations" | "Security & DPDP" | "Workflows" | "Accessibility";
  isEnabled: boolean;
  environmentOverrides?: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
  };
  allowedRoles?: Role[];
  allowedTenants?: string[];
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  enable_ai_dedup: {
    key: "enable_ai_dedup",
    name: "AI Semantic Overlap & De-Duplication",
    description: "Multilingual vector embeddings to detect cross-bureau and intra-bureau duplicate complaints.",
    category: "AI & ML",
    isEnabled: true,
    allowedRoles: ["Admin", "RB Officer", "PGRC Officer", "Chairperson"],
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_auto_routing: {
    key: "enable_auto_routing",
    name: "Intelligent Bureau Routing Classifier",
    description: "Automated routing to Approval Bureau (RB) or Grievance Redressal Cell (PGRC) with confidence scores.",
    category: "AI & ML",
    isEnabled: true,
    allowedRoles: ["Admin", "Chairperson"],
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_distress_scan: {
    key: "enable_distress_scan",
    name: "Emergency Distress & Sentiment Detection",
    description: "Real-time scanning for self-harm, severe harassment, and immediate campus safety risks.",
    category: "AI & ML",
    isEnabled: true,
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_digilocker_kyc: {
    key: "enable_digilocker_kyc",
    name: "DigiLocker / APAAR KYC Verification",
    description: "Integration with National DigiLocker API for authenticating citizen identity credentials.",
    category: "Integrations",
    isEnabled: true,
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_video_hearings: {
    key: "enable_video_hearings",
    name: "Automated Video Hearings (Meet / Zoom)",
    description: "Provisions virtual hearing rooms and generates RFC 5545 calendar convocations.",
    category: "Workflows",
    isEnabled: true,
    allowedRoles: ["Admin", "RB Officer", "PGRC Officer", "Chairperson"],
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_dpdp_encryption: {
    key: "enable_dpdp_encryption",
    name: "DPDP Act 2023 AES-256 Field Encryption",
    description: "End-to-end cryptographic field-level encryption for complainant PII and Right to be Forgotten.",
    category: "Security & DPDP",
    isEnabled: true,
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_simple_mode: {
    key: "enable_simple_mode",
    name: "Citizen Simple Accessibility Mode",
    description: "High-contrast plain-language UI without technical bureaucracy acronyms for rural citizens.",
    category: "Accessibility",
    isEnabled: true,
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_pwa_offline: {
    key: "enable_pwa_offline",
    name: "PWA Offline Draft Storage",
    description: "Service worker offline caching enabling grievance filing during connectivity blackouts.",
    category: "Accessibility",
    isEnabled: true,
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
  enable_show_cause_pdf: {
    key: "enable_show_cause_pdf",
    name: "Automated Statutory Show-Cause Generator",
    description: "Generates formal show-cause legal notices with deadline countdowns and college reply tracking.",
    category: "Workflows",
    isEnabled: true,
    allowedRoles: ["Admin", "RB Officer", "PGRC Officer", "Chairperson"],
    updatedAt: "2026-10-30T00:00:00Z",
    updatedBy: "Central Administrator",
  },
};

class FeatureFlagManager {
  private flags = new Map<string, FeatureFlag>();

  constructor() {
    for (const [k, v] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      this.flags.set(k, { ...v });
    }
  }

  /**
   * Evaluate whether a flag is enabled for the current runtime context
   */
  isEnabled(
    flagKey: string,
    context?: { role?: Role; tenant?: string; environment?: "development" | "staging" | "production" }
  ): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    // 1. Base enabled check
    if (!flag.isEnabled) return false;

    // 2. Environment override check
    const env = context?.environment || (process.env.NODE_ENV === "production" ? "production" : "development");
    if (flag.environmentOverrides && flag.environmentOverrides[env] !== undefined) {
      if (!flag.environmentOverrides[env]) return false;
    }

    // 3. Role-based permission check
    if (flag.allowedRoles && flag.allowedRoles.length > 0 && context?.role) {
      if (!flag.allowedRoles.includes(context.role)) {
        return false;
      }
    }

    // 4. Tenant-based check
    if (flag.allowedTenants && flag.allowedTenants.length > 0 && context?.tenant) {
      if (!flag.allowedTenants.includes(context.tenant)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update a feature flag setting
   */
  setFlag(
    flagKey: string,
    updates: Partial<Omit<FeatureFlag, "key">>,
    updatedBy: string
  ): FeatureFlag | null {
    const flag = this.flags.get(flagKey);
    if (!flag) return null;

    const updated: FeatureFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    this.flags.set(flagKey, updated);
    return updated;
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }
}

export const featureFlagManager = new FeatureFlagManager();
