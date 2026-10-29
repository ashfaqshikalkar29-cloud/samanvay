import { AICategorizationPrediction, UrgencyLevel } from "./types";
import { Bureau } from "@/lib/mock";

export interface CategorizerService {
  predict(text: string, dynamicFields?: Record<string, any>): Promise<AICategorizationPrediction>;
}

// Statutory Norm Keywords & Urgency Weights
const URGENCY_TRIGGERS = {
  critical: [
    "suicide", "self-harm", "sexual harassment", "assault", "violence", "threat",
    "hostage", "life threat", "severe ragging", "anti-ragging", "police", "fir",
    "extortion", "emergency", "fatal", "lockdown", "strike", "court contempt",
  ],
  high: [
    "withholding original documents", "degrees seized", "10th certificate retained",
    "illegal capitation fee", "excess 150000", "admitted beyond intake", "eoa canceled",
    "unapproved course", "fake affiliation", "non-payment salary 6 months", "pay scale fraud",
    "debarred", "mass expulsion", "demanded cash", "blackmail",
  ],
  medium: [
    "refund delayed", "lab equipment non-functional", "fire safety expired", "library books deficit",
    "syllabus incomplete", "exam center distant", "scholarship delay", "bus facility",
    "canteen hygiene", "wifi disconnected", "hostel maintenance", "internal marks discrepancy",
  ],
};

const LEGAL_RISK_TRIGGERS = [
  "high court", "supreme court", "writ petition", "contempt", "fir", "police station",
  "advocate", "legal notice", "statutory violation", "ugc regulations", "aicte act 1987",
  "consumer forum", "human rights commission", "nhrc", "ncw",
];

const CATEGORY_MAP: Record<string, { bureau: Bureau; keywords: string[] }> = {
  ragging: {
    bureau: "PGRC",
    keywords: ["ragging", "senior", "harassment", "abusive", "bullying", "humiliation", "anti-ragging"],
  },
  fees: {
    bureau: "PGRC",
    keywords: ["fee", "refund", "capitation", "tuition", "excessive", "demand draft", "overcharging", "caution deposit"],
  },
  faculty: {
    bureau: "RB",
    keywords: ["faculty", "salary", "pay scale", "6th pay", "7th pay", "phd qualification", "cadre ratio", "professor", "resignation"],
  },
  approval: {
    bureau: "RB",
    keywords: ["approval", "eoa", "intake", "affiliation", "sanctioned seats", "unapproved", "land norms", "aicte approval"],
  },
  scholarship: {
    bureau: "PGRC",
    keywords: ["scholarship", "post matric", "pragati", "saksham", "pmsss", "disbursement", "stipend"],
  },
  exams: {
    bureau: "PGRC",
    keywords: ["exam", "results", "revaluation", "grade card", "admit card", "hall ticket", "evaluation"],
  },
  infrastructure: {
    bureau: "RB",
    keywords: ["infrastructure", "lab", "computer", "fire safety", "building", "classroom", "library", "internet"],
  },
};

export class HeuristicCategorizer implements CategorizerService {
  async predict(text: string, dynamicFields: Record<string, any> = {}): Promise<AICategorizationPrediction> {
    const lower = text.toLowerCase();
    const signals: string[] = [];

    // 1. Detect Category & Bureau
    let bestCat = "fees";
    let maxCatHits = 0;
    let recBureau: Bureau = "PGRC";

    for (const [cat, meta] of Object.entries(CATEGORY_MAP)) {
      let hits = 0;
      for (const kw of meta.keywords) {
        if (lower.includes(kw)) {
          hits += 2;
          signals.push(`Matched ${cat} keyword: "${kw}"`);
        }
      }
      if (hits > maxCatHits) {
        maxCatHits = hits;
        bestCat = cat;
        recBureau = meta.bureau;
      }
    }

    // Dynamic field priors
    if (dynamicFields.raggingSeverity || dynamicFields.seniorInvolved) {
      bestCat = "ragging";
      recBureau = "PGRC";
    } else if (dynamicFields.eoaYear || dynamicFields.excessSeats) {
      bestCat = "approval";
      recBureau = "RB";
    }

    // 2. Detect Urgency
    let urgency: UrgencyLevel = "low";
    let severity = 3;

    if (URGENCY_TRIGGERS.critical.some((kw) => lower.includes(kw))) {
      urgency = "critical";
      severity = 9;
      signals.push("Critical life-safety / threat signal detected");
    } else if (URGENCY_TRIGGERS.high.some((kw) => lower.includes(kw))) {
      urgency = "high";
      severity = 7;
      signals.push("High severity statutory / document retention issue");
    } else if (URGENCY_TRIGGERS.medium.some((kw) => lower.includes(kw))) {
      urgency = "medium";
      severity = 5;
    }

    // 3. Detect Legal Risk
    let legalRisk = false;
    let legalRationale: string | undefined;

    const matchedLegal = LEGAL_RISK_TRIGGERS.filter((kw) => lower.includes(kw));
    if (matchedLegal.length > 0) {
      legalRisk = true;
      legalRationale = `References legal proceedings: ${matchedLegal.join(", ")}`;
      if (severity < 7) severity = 7;
      signals.push("Legal risk flagged");
    }

    // Confidence Calculation
    const confidence = Math.min(
      0.95,
      Math.max(0.65, 0.60 + (maxCatHits * 0.05) + (signals.length * 0.04))
    );

    return {
      predicted_category: bestCat,
      urgency,
      severity_score: severity,
      legal_risk: legalRisk,
      legal_risk_rationale: legalRationale,
      confidence: Math.round(confidence * 100) / 100,
      recommended_bureau: recBureau,
      signals_detected: Array.from(new Set(signals)).slice(0, 5),
    };
  }
}

export const defaultCategorizer = new HeuristicCategorizer();
