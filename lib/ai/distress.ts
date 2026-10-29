import { DistressCategory, DistressScanResult } from "./types";

export interface DistressScannerService {
  scan(text: string): Promise<DistressScanResult>;
}

// Statutory crisis helpline hotlines (AICTE & Government of India)
export const CRISIS_HELPLINES = [
  { name: "Tele-MANAS (Mental Health Helpline)", number: "14416 / 1800 891 4416", available: "24x7 Toll Free" },
  { name: "National Anti-Ragging Helpline", number: "1800-180-5522", available: "24x7 Toll Free" },
  { name: "National Commission for Women (NCW)", number: "7827170170", available: "24x7 Women in Distress" },
  { name: "Emergency Police Assistance", number: "112", available: "24x7 Unified Emergency" },
];

const DISTRESS_PATTERNS: Array<{
  category: DistressCategory;
  weight: number;
  regex: RegExp;
  phrase: string;
}> = [
  // 1. Self-Harm & Suicide Ideation
  { category: "self_harm", weight: 95, regex: /\b(suicide|suicidal|kill myself|end my life|want to die|no reason to live|hanging myself|consume poison|take my own life)\b/i, phrase: "Self-harm / suicide ideation signal" },
  { category: "self_harm", weight: 80, regex: /\b(cannot bear this pain anymore|hopeless|life is over|giving up on life|goodbye forever|extreme mental trauma)\b/i, phrase: "Severe existential despair / depression" },

  // 2. Imminent Threats & Physical Violence
  { category: "threat_violence", weight: 90, regex: /\b(kill you|burn down|beat\s+(?:me\s+|us\s+)?up|murder|break bones|attack with weapons|hire goons|physically eliminate)\b/i, phrase: "Explicit violent threat / physical harm" },
  { category: "threat_violence", weight: 85, regex: /\b(held hostage|locked inside room|false imprisonment|illegal confinement|abducted)\b/i, phrase: "Hostage / unlawful physical detention" },

  // 3. Sexual Harassment & Abuse
  { category: "sexual_harassment", weight: 90, regex: /\b(sexual harassment|molestation|groping|demanded sexual favours|inappropriate touching|rape threat|posh act)\b/i, phrase: "Sexual harassment / POSH violation" },
  { category: "sexual_harassment", weight: 85, regex: /\b(blackmailing with private photos|recording in bathroom|non-consensual video|leaking pictures)\b/i, phrase: "Cyber extortion / voyeurism abuse" },

  // 4. Severe Ragging & Mental Trauma
  { category: "severe_mental_trauma", weight: 85, regex: /\b(stripped naked|forced to drink alcohol|brutal ragging|torture in hostel|severe depression due to ragging|assaulted in (?:college|hostel)|ragged and assaulted)\b/i, phrase: "Severe institutional ragging / acute trauma" },
];

export class HeuristicDistressScanner implements DistressScannerService {
  async scan(text: string): Promise<DistressScanResult> {
    if (!text || text.trim().length === 0) {
      return {
        has_distress: false,
        distress_category: "none",
        distress_score: 0,
        matched_phrases: [],
        immediate_safety_action: "None required.",
        helpline_numbers: CRISIS_HELPLINES,
        safety_officer_notified: false,
      };
    }

    const matches: string[] = [];
    let maxScore = 0;
    let worstCategory: DistressCategory = "none";

    for (const pat of DISTRESS_PATTERNS) {
      if (pat.regex.test(text)) {
        matches.push(pat.phrase);
        if (pat.weight > maxScore) {
          maxScore = pat.weight;
          worstCategory = pat.category;
        }
      }
    }

    const hasDistress = maxScore >= 70;
    let action = "Standard grievance triage protocol.";

    if (worstCategory === "self_harm") {
      action = "EMERGENCY PROTOCOL: Alert AICTE Safety Cell, contact institution counselor & tele-MANAS crisis team immediately. Do not issue automated emails.";
    } else if (worstCategory === "threat_violence") {
      action = "SECURITY ALERT: Notify District Magistrate & local police liaison office. Restrict public disclosure.";
    } else if (worstCategory === "sexual_harassment") {
      action = "STATUTORY ACTION: Trigger ICC / POSH inquiry panel and seal relevant communications. Provide confidential counseling.";
    } else if (worstCategory === "severe_mental_trauma") {
      action = "ANTI-RAGGING INTERVENTION: Direct AICTE Regional Officer to dispatch surprise fact-finding team within 12 hours.";
    }

    return {
      has_distress: hasDistress,
      distress_category: worstCategory,
      distress_score: maxScore,
      matched_phrases: Array.from(new Set(matches)),
      immediate_safety_action: action,
      helpline_numbers: CRISIS_HELPLINES,
      safety_officer_notified: hasDistress,
      notified_at: hasDistress ? new Date().toISOString() : undefined,
    };
  }
}

export const defaultDistressScanner = new HeuristicDistressScanner();
