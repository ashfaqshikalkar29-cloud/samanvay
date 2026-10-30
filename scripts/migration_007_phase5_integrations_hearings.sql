-- ==============================================================================
-- SAMANVAY AICTE GRIEVANCE REDRESSAL PLATFORM
-- MIGRATION 007: PHASE 5 - EXTERNAL INTEGRATIONS, HEARINGS, NOTICES & PENALTIES
-- ==============================================================================

-- 1. Statutory Case Hearings & Convocations
CREATE TABLE IF NOT EXISTS public.case_hearings (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  title TEXT NOT NULL,
  hearing_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'Video',
  venue_or_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  presiding_officer TEXT NOT NULL,
  participants_json JSONB NOT NULL,
  video_config_json JSONB,
  minutes_of_hearing TEXT,
  outcome_order TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hearings_complaint ON public.case_hearings(complaint_id);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON public.case_hearings(hearing_date);

-- 2. Statutory Show-Cause Notices & Institutional Responses
CREATE TABLE IF NOT EXISTS public.show_cause_notices (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  notice_reference TEXT NOT NULL UNIQUE,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  category TEXT NOT NULL,
  allegation_summary TEXT NOT NULL,
  issued_by_officer TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  compliance_deadline DATE NOT NULL,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ISSUED_AWAITING_REPLY',
  rendered_text TEXT NOT NULL,
  institution_reply_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_scn_complaint ON public.show_cause_notices(complaint_id);
CREATE INDEX IF NOT EXISTS idx_scn_institute ON public.show_cause_notices(institution_id);
CREATE INDEX IF NOT EXISTS idx_scn_deadline ON public.show_cause_notices(compliance_deadline);

-- 3. Regulatory Penalties & Sanction Directives
CREATE TABLE IF NOT EXISTS public.regulatory_penalties (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  penalty_type TEXT NOT NULL,
  title TEXT NOT NULL,
  directive_details TEXT NOT NULL,
  monetary_amount NUMERIC,
  compliance_deadline DATE NOT NULL,
  ordered_by TEXT NOT NULL,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PENDING_COMPLIANCE',
  compliance_proof_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_penalties_complaint ON public.regulatory_penalties(complaint_id);
CREATE INDEX IF NOT EXISTS idx_penalties_institute ON public.regulatory_penalties(institution_id);

-- 4. Cross-Regulator Referrals (UGC, BCI, DTE, Police)
CREATE TABLE IF NOT EXISTS public.external_referrals (
  referral_id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  regulator TEXT NOT NULL,
  officer_in_charge TEXT NOT NULL,
  date_referred DATE NOT NULL DEFAULT CURRENT_DATE,
  statutory_clause TEXT NOT NULL,
  expected_reply_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OUTWARD_DISPATCHED',
  official_reference_number TEXT NOT NULL UNIQUE,
  external_reply_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_referrals_complaint ON public.external_referrals(complaint_id);
CREATE INDEX IF NOT EXISTS idx_referrals_regulator ON public.external_referrals(regulator);

-- 5. API Keys Ledger for External System Integrations (/api/v1)
CREATE TABLE IF NOT EXISTS public.api_keys_ledger (
  key_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  tenant TEXT NOT NULL,
  rate_limit_per_min INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 6. Regulatory Knowledge Base Articles
CREATE TABLE IF NOT EXISTS public.knowledge_base_articles (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  aph_clause TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_text TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  statutory_remedy TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.case_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_cause_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access on case_hearings" ON public.case_hearings FOR ALL USING (true);
CREATE POLICY "Service full access on show_cause_notices" ON public.show_cause_notices FOR ALL USING (true);
CREATE POLICY "Service full access on regulatory_penalties" ON public.regulatory_penalties FOR ALL USING (true);
CREATE POLICY "Service full access on external_referrals" ON public.external_referrals FOR ALL USING (true);
CREATE POLICY "Service full access on api_keys_ledger" ON public.api_keys_ledger FOR ALL USING (true);
CREATE POLICY "Public read on knowledge_base_articles" ON public.knowledge_base_articles FOR SELECT USING (true);
