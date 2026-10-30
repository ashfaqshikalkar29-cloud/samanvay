// ==============================================================================
// SAMANVAY: Multi-Language i18n Types (F. Accessibility & Multi-Lingual)
// Support for English, Hindi, and 9 scaffolded Indic languages with RTL readiness
// ==============================================================================

export type SupportedLocale =
  | "en" // English (Official)
  | "hi" // Hindi (Official)
  | "mr" // Marathi
  | "ta" // Tamil
  | "bn" // Bengali
  | "te" // Telugu
  | "gu" // Gujarati
  | "kn" // Kannada
  | "ml" // Malayalam
  | "or" // Odia
  | "pa"; // Punjabi

export interface LanguageMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  isComplete: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr", isComplete: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", isComplete: true },
  { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr", isComplete: false },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr", isComplete: false },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", isComplete: false },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr", isComplete: false },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr", isComplete: false },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr", isComplete: false },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr", isComplete: false },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", direction: "ltr", isComplete: false },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr", isComplete: false },
];

export type TranslationKey =
  | "portal_title"
  | "portal_subtitle"
  | "nav_dashboard"
  | "nav_file_grievance"
  | "nav_walk_in"
  | "nav_track"
  | "nav_clusters"
  | "nav_watchlist"
  | "nav_tour"
  | "nav_reset_demo"
  | "role_admin"
  | "role_rb"
  | "role_pgrc"
  | "role_chairperson"
  | "role_institute"
  | "role_complainant"
  | "status_all"
  | "status_pending"
  | "status_in_process"
  | "status_disposed"
  | "stage_intake"
  | "stage_scrutiny"
  | "stage_show_cause"
  | "stage_hearing"
  | "stage_compliance"
  | "stage_disposed"
  | "kpi_total_cases"
  | "kpi_pending_cases"
  | "kpi_disposed_cases"
  | "kpi_open_alerts"
  | "kpi_overlap_hours"
  | "btn_submit_info"
  | "btn_withdraw"
  | "btn_download_pdf"
  | "btn_request_extension"
  | "btn_submit_proof"
  | "btn_run_sla_tick"
  | "btn_run_nudges"
  | "msg_welcome_citizen"
  | "msg_anti_ragging_helpline";

export type TranslationsRecord = Record<TranslationKey, string>;
