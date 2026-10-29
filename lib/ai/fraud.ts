import { FraudEvaluation, FraudRiskTier } from "./types";
import { Complaint } from "@/lib/mock";

// In-memory sliding log of recent submissions for coordinated astroturfing detection
interface SubmissionLog {
  complaint_id: string;
  institution_id: string;
  ip_subnet: string;
  device_hash: string;
  phone: string;
  timestamp: number;
  text_hash: string;
}

const recentSubmissionsLog: SubmissionLog[] = [];

// Toxic / Abusive word patterns
const TOXIC_PATTERNS = [
  /\b(scamster|bastard|cheat institute|thieves|fraudsters|bloody corrupt|chor hai|dalal)\b/i,
];

// Spam / Bot template gibberish
const SPAM_GIBBERISH = [
  /\b(test complaint|asdfgh|qwertyuiop|lorem ipsum|click here for free|seo service|cheap casino)\b/i,
];

export class FraudDetectionEngine {
  evaluate(
    complaintId: string,
    text: string,
    institutionId: string,
    meta: {
      ip?: string;
      userAgent?: string;
      phone?: string;
    } = {}
  ): FraudEvaluation {
    const signals: string[] = [];
    let score = 5; // Base clean prior

    const cleanText = text.trim();
    const now = Date.now();
    const ipSubnet = (meta.ip || "192.168.1.1").split(".").slice(0, 3).join(".");
    const deviceHash = meta.userAgent ? `dev-${meta.userAgent.slice(0, 15)}` : "dev-standard";
    const phone = meta.phone || "unknown";

    // 1. Bot & Gibberish Detection
    if (cleanText.length < 25) {
      score += 35;
      signals.push("Extremely short text (< 25 characters)");
    }

    if (SPAM_GIBBERISH.some((p) => p.test(cleanText))) {
      score += 50;
      signals.push("Spam / automated test filler pattern detected");
    }

    // Repeated characters (e.g. "aaaaaaa", "!!!!!!!")
    if (/(.)\1{6,}/.test(cleanText)) {
      score += 25;
      signals.push("Repetitive character spam detected");
    }

    // 2. Abusive Language
    if (TOXIC_PATTERNS.some((p) => p.test(cleanText))) {
      score += 30;
      signals.push("Abusive / unparliamentary language detected");
    }

    // 3. Coordinated Astroturfing Detection (Multiple complaints from same subnet/device against same institute)
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const recentAgainstSameInst = recentSubmissionsLog.filter(
      (s) => s.institution_id === institutionId && now - s.timestamp < windowMs
    );

    const sameIpSubnetCount = recentAgainstSameInst.filter((s) => s.ip_subnet === ipSubnet).length;
    const sameDeviceCount = recentAgainstSameInst.filter((s) => s.device_hash === deviceHash).length;

    let isCoordinated = false;
    if (sameIpSubnetCount >= 2) {
      score += 45;
      isCoordinated = true;
      signals.push(`Coordinated campaign: ${sameIpSubnetCount + 1} submissions from same IP subnet (${ipSubnet}.*) in 24h`);
    }

    if (sameDeviceCount >= 2) {
      score += 40;
      isCoordinated = true;
      signals.push(`Device fingerprint repetition: Multiple complaints from identical client device`);
    }

    // Record in sliding log
    recentSubmissionsLog.push({
      complaint_id: complaintId,
      institution_id: institutionId,
      ip_subnet: ipSubnet,
      device_hash: deviceHash,
      phone,
      timestamp: now,
      text_hash: cleanText.slice(0, 30),
    });

    // Cap score at 100
    const finalScore = Math.min(100, score);

    let tier: FraudRiskTier = "clean";
    if (finalScore >= 70) {
      tier = "fraud_spam";
    } else if (finalScore >= 45) {
      tier = "suspicious";
    }

    return {
      complaint_id: complaintId,
      overall_score: finalScore,
      risk_tier: tier,
      bot_probability: Math.min(1, finalScore / 100),
      toxicity_score: signals.some((s) => s.includes("Abusive")) ? 80 : 10,
      coordinated_campaign_flag: isCoordinated,
      signals,
      detected_at: new Date().toISOString(),
      submission_source: {
        ip_subnet: `${ipSubnet}.*`,
        device_hash: deviceHash,
        phone_prefix: phone.slice(0, 5),
      },
      review_status: "pending",
    };
  }

  // Pre-seed some realistic suspicious items for demonstration
  getSeedSuspiciousCases(): FraudEvaluation[] {
    return [
      {
        complaint_id: "C-1004",
        overall_score: 78,
        risk_tier: "fraud_spam",
        bot_probability: 0.85,
        toxicity_score: 45,
        coordinated_campaign_flag: true,
        signals: [
          "Coordinated campaign: 4 submissions from same IP subnet (103.224.18.*) in 6h",
          "Boilerplate repeated phrasing across 3 applicant names",
        ],
        detected_at: "2026-10-23T11:45:00.000Z",
        submission_source: {
          ip_subnet: "103.224.18.*",
          device_hash: "dev-Chrome-Win",
          phone_prefix: "98200",
        },
        review_status: "pending",
      },
      {
        complaint_id: "C-1002",
        overall_score: 52,
        risk_tier: "suspicious",
        bot_probability: 0.40,
        toxicity_score: 75,
        coordinated_campaign_flag: false,
        signals: [
          "Abusive / unparliamentary language detected in paragraph 2",
          "Rapid submission without document previews verified",
        ],
        detected_at: "2026-10-21T14:15:00.000Z",
        submission_source: {
          ip_subnet: "49.36.120.*",
          device_hash: "dev-Android-Mob",
          phone_prefix: "94211",
        },
        review_status: "pending",
      },
    ];
  }
}

export const defaultFraudEngine = new FraudDetectionEngine();
