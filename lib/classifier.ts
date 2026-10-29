// ==============================================================================
// SAMANVAY: Bureau Auto-Routing & Classifier Service (2.4)
// Predicts Responsible Bureau (RB vs PGRC) with Confidence Scoring & Triage
// ==============================================================================

import type { Bureau } from "@/lib/mock";

export const CLASSIFIER_CONFIG = {
  autoAssignThreshold: 0.75, // Below 0.75 routes to Triage queue
};

export interface ClassificationResult {
  predicted_bureau: Bureau;
  confidence: number; // 0.0 .. 1.0
  is_triage: boolean;
  rationale: string;
  scores: {
    RB: number;
    PGRC: number;
  };
  matched_indicators: string[];
}

export interface RoutingFeedbackRecord {
  id: string;
  complaint_id: string;
  predicted_bureau: Bureau;
  selected_bureau: Bureau;
  confidence: number;
  officer: string;
  reason?: string;
  timestamp: string;
}

// Normative keyword dictionaries mapped to Bureau mandates
const RB_INDICATORS = [
  "approval", "eoa", "extension of approval", "affiliation", "sanctioned intake",
  "land norm", "built-up area", "inspection", "aph", "approval process handbook",
  "faculty deficiency", "7th cpc", "cadre ratio", "cadre", "principal qualification",
  "bogus faculty", "ghost faculty", "biometric attendance", "fire noc", "building safety",
  "laboratory equipment", "unapproved course", "unauthorized programme", "shifting campus",
  "regional bureau", "regional office"
];

const PGRC_INDICATORS = [
  "fee", "capitation", "tuition fee", "excess fee", "refund", "withholding certificate",
  "original marksheet", "degree certificate", "leaving certificate", "scholarship",
  "pragati", "saksham", "fellowship", "gate stipend", "delayed payment", "stipend",
  "ragging", "harassment", "physical abuse", "anti-ragging committee", "threat",
  "exam malpractice", "hall ticket", "admit card denied", "arbitrary failure",
  "revaluation", "grievance redressal committee", "pgrc", "student victim"
];

export class BureauClassifier {
  private threshold: number;

  constructor(threshold = CLASSIFIER_CONFIG.autoAssignThreshold) {
    this.threshold = threshold;
  }

  classify(category: string, description: string, dynamicFields?: Record<string, any>): ClassificationResult {
    const text = `${category} ${description} ${JSON.stringify(dynamicFields || {})}`.toLowerCase();

    let rbScore = 0;
    let pgrcScore = 0;
    const matched: string[] = [];

    // 1. Primary Category Priors
    if (["approval", "faculty", "infrastructure"].includes(category)) {
      rbScore += 3.5;
    } else if (["fees", "scholarship", "exams", "ragging"].includes(category)) {
      pgrcScore += 3.5;
    }

    // 2. Keyword & Multi-word phrase matching
    for (const phrase of RB_INDICATORS) {
      if (text.includes(phrase)) {
        rbScore += phrase.includes(" ") ? 2.0 : 1.2;
        matched.push(`RB: ${phrase}`);
      }
    }

    for (const phrase of PGRC_INDICATORS) {
      if (text.includes(phrase)) {
        pgrcScore += phrase.includes(" ") ? 2.0 : 1.2;
        matched.push(`PGRC: ${phrase}`);
      }
    }

    // 3. Normalization and confidence computation
    const total = rbScore + pgrcScore;
    if (total === 0) {
      return {
        predicted_bureau: "RB",
        confidence: 0.5,
        is_triage: true,
        rationale: "Ambiguous case content without definitive bureau norm indicators. Routed to Triage.",
        scores: { RB: 0.5, PGRC: 0.5 },
        matched_indicators: [],
      };
    }

    const rbProb = Number((rbScore / total).toFixed(3));
    const pgrcProb = Number((pgrcScore / total).toFixed(3));

    const predicted_bureau: Bureau = rbProb >= pgrcProb ? "RB" : "PGRC";
    const confidence = Math.max(rbProb, pgrcProb);
    const is_triage = confidence < this.threshold;

    let rationale = "";
    if (is_triage) {
      rationale = `Confidence (${Math.round(confidence * 100)}%) below auto-assign threshold (${Math.round(this.threshold * 100)}%). Multi-bureau indicators present: ${matched.slice(0, 3).join(", ")}. Forwarded to Triage Queue for manual officer assignment.`;
    } else {
      rationale = `Strong correlation with ${predicted_bureau} jurisdiction (${Math.round(confidence * 100)}% confidence). Matched parameters: ${matched.slice(0, 4).join(", ")}.`;
    }

    return {
      predicted_bureau,
      confidence,
      is_triage,
      rationale,
      scores: {
        RB: rbProb,
        PGRC: pgrcProb,
      },
      matched_indicators: matched.slice(0, 6),
    };
  }
}

export const defaultClassifier = new BureauClassifier();
