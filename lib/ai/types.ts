import type { Bureau, Channel } from "@/lib/mock";

// ── 3.1 Auto-Categorisation & Urgency Scoring ─────────────────────────────
export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface AICategorizationPrediction {
  predicted_category: string;
  urgency: UrgencyLevel;
  severity_score: number; // 1 to 10 scale
  legal_risk: boolean;
  legal_risk_rationale?: string;
  confidence: number; // 0.00 to 1.00
  recommended_bureau: Bureau;
  signals_detected: string[];
}

export interface AICorrectionLog {
  id: string;
  complaint_id: string;
  field: "category" | "urgency" | "severity" | "legal_risk" | "bureau";
  original_value: string;
  corrected_value: string;
  officer: string;
  reason: string;
  timestamp: string;
}

// ── 3.2 Case Summarisation ─────────────────────────────────────────────────
export interface AICaseSummary {
  complaint_id: string;
  complaint_summary: string;
  timeline_digest: string[];
  key_parties: string[];
  recommended_first_step: string;
  generated_at: string;
  content_hash: string;
}

// ── 3.3 Distress & Sentiment Detection ────────────────────────────────────
export type DistressCategory = "none" | "self_harm" | "threat_violence" | "sexual_harassment" | "severe_mental_trauma";

export interface DistressScanResult {
  has_distress: boolean;
  distress_category: DistressCategory;
  distress_score: number; // 0 to 100
  matched_phrases: string[];
  immediate_safety_action: string;
  helpline_numbers: Array<{ name: string; number: string; available: string }>;
  safety_officer_notified: boolean;
  notified_at?: string;
}

// ── 3.4 Precedents & RAG Resolution ───────────────────────────────────────
export interface PrecedentCase {
  complaint_id: string;
  title: string;
  category: string;
  institution_type: string;
  summary: string;
  similarity_score: number;
  final_resolution_summary: string;
  order_date: string;
  lead_bureau: Bureau;
}

export interface RulebookClauseCitation {
  source_document: string;
  chapter: string;
  page_number: number;
  clause_number: string;
  clause_title: string;
  clause_text: string;
  relevance_score: number;
}

export interface RAGDraftReply {
  draft_text: string;
  subject_line: string;
  citations: RulebookClauseCitation[];
  similar_precedents: PrecedentCase[];
  recommended_statutory_order: string;
  confidence: number;
}

// ── 3.5 Rulebook Q&A Assistant ────────────────────────────────────────────
export interface RulebookQAResponse {
  query: string;
  answer: string;
  citations: RulebookClauseCitation[];
  is_grounded: boolean;
  disclaimer: string;
}

// ── 3.6 Entity Extraction & PII Redaction ─────────────────────────────────
export interface ExtractedEntities {
  names: string[];
  institutions: string[];
  dates: string[];
  monetary_amounts: string[];
  phones: string[];
  emails: string[];
  aadhaar_pan: string[];
}

export interface RedactionResult {
  original_text: string;
  redacted_text: string;
  entities_found: ExtractedEntities;
  redaction_count: number;
}

// ── 3.7 Fake / Spam / Fraud Detection ─────────────────────────────────────
export type FraudRiskTier = "clean" | "suspicious" | "fraud_spam";

export interface FraudEvaluation {
  complaint_id?: string;
  overall_score: number; // 0 (clean) to 100 (fraudulent)
  risk_tier: FraudRiskTier;
  bot_probability: number;
  toxicity_score: number;
  coordinated_campaign_flag: boolean;
  signals: string[];
  detected_at: string;
  submission_source?: {
    ip_subnet?: string;
    device_hash?: string;
    phone_prefix?: string;
  };
  review_status?: "pending" | "cleared_legitimate" | "confirmed_spam";
  reviewed_by?: string;
  reviewed_at?: string;
}

// ── 3.8 Predictive Analytics ──────────────────────────────────────────────
export interface WeeklyVolumeForecastPoint {
  week_start: string; // YYYY-MM-DD
  projected_volume: number;
  lower_bound: number;
  upper_bound: number;
  seasonal_factor: string;
}

export interface SLABreachRiskItem {
  complaint_id: string;
  institution_name: string;
  category: string;
  bureau: Bureau;
  days_open: number;
  sla_due_date: string;
  breach_probability: number; // 0 to 100
  risk_factors: string[];
}

export interface HotspotInstitute {
  institution_id: string;
  name: string;
  region: string;
  recent_complaints_count: number;
  growth_rate_pct: number;
  dominant_category: string;
  hotspot_score: number;
}

export interface PredictiveAnalyticsPayload {
  forecast_horizon_weeks: number;
  weekly_forecasts: WeeklyVolumeForecastPoint[];
  high_risk_breaches: SLABreachRiskItem[];
  emerging_hotspots: HotspotInstitute[];
  generated_at: string;
}

// ── 3.9 Auto-Translation ──────────────────────────────────────────────────
export type SupportedLanguage = "en" | "hi" | "mr" | "ta" | "bn" | "te";

export interface TranslationResult {
  original_text: string;
  translated_text: string;
  source_language: SupportedLanguage;
  target_language: SupportedLanguage;
  detected_script: string;
  cached: boolean;
}

// ── 3.10 Complainant Chatbot ──────────────────────────────────────────────
export interface ChatbotMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
  quick_replies?: string[];
  action_link?: { label: string; url: string };
  draft_complaint?: {
    category?: string;
    institution?: string;
    description?: string;
    complainant_name?: string;
    phone?: string;
  };
  escalation_triggered?: boolean;
}
