-- ==============================================================================
-- SAMANVAY: Phase 3 AI & Automation Migration
-- Migration: 003_ai_automation.sql
-- ==============================================================================

-- 1. Extend complaints table for Phase 3 AI, Distress, Priority & Fraud fields
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS legal_risk BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_distress BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS distress_details JSONB,
  ADD COLUMN IF NOT EXISTS ai_predictions JSONB,
  ADD COLUMN IF NOT EXISTS ai_summary JSONB,
  ADD COLUMN IF NOT EXISTS fraud_score NUMERIC(5,2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS fraud_evaluation JSONB;

CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON complaints(urgency);
CREATE INDEX IF NOT EXISTS idx_complaints_has_distress ON complaints(has_distress);
CREATE INDEX IF NOT EXISTS idx_complaints_legal_risk ON complaints(legal_risk);
CREATE INDEX IF NOT EXISTS idx_complaints_fraud_score ON complaints(fraud_score);

-- 2. AI Model Correction Logs (3.1 Continuous Learning & Fine-tuning feedback)
CREATE TABLE IF NOT EXISTS ai_correction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  officer TEXT NOT NULL,
  original_predictions JSONB NOT NULL,
  corrected_category TEXT NOT NULL,
  corrected_urgency TEXT NOT NULL,
  corrected_severity INTEGER NOT NULL CHECK (corrected_severity BETWEEN 1 AND 10),
  corrected_legal_risk BOOLEAN NOT NULL DEFAULT FALSE,
  officer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_corrections_complaint ON ai_correction_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ai_corrections_officer ON ai_correction_logs(officer);

ALTER TABLE ai_correction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers can log AI corrections" ON ai_correction_logs;
CREATE POLICY "Officers can log AI corrections" ON ai_correction_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- 3. RAG Knowledge Chunks & Precedent Orders (3.4 & 3.5)
CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document TEXT NOT NULL, -- e.g. 'AICTE Approval Process Handbook (APH 2024-27)'
  chapter TEXT NOT NULL,
  clause_number TEXT NOT NULL,
  clause_title TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_clause ON rag_knowledge_chunks(clause_number);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

ALTER TABLE rag_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read for statutory regulations" ON rag_knowledge_chunks;
CREATE POLICY "Public read for statutory regulations" ON rag_knowledge_chunks
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE TABLE IF NOT EXISTS rag_precedent_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  final_resolution_summary TEXT NOT NULL,
  order_date DATE NOT NULL,
  lead_bureau TEXT NOT NULL CHECK (lead_bureau IN ('RB', 'PGRC')),
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_precedents_category ON rag_precedent_cases(category);
CREATE INDEX IF NOT EXISTS idx_rag_precedents_embedding ON rag_precedent_cases USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

ALTER TABLE rag_precedent_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read precedents" ON rag_precedent_cases;
CREATE POLICY "Staff can read precedents" ON rag_precedent_cases
  FOR SELECT TO authenticated USING (TRUE);

-- 4. Critical Distress & Safety Alerts (3.3)
CREATE TABLE IF NOT EXISTS distress_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  distress_category TEXT NOT NULL CHECK (distress_category IN ('self_harm', 'threat_violence', 'sexual_harassment', 'severe_mental_trauma')),
  distress_score NUMERIC(5,2) NOT NULL,
  matched_phrases TEXT[] NOT NULL DEFAULT '{}'::text[],
  safety_officer_notified BOOLEAN NOT NULL DEFAULT TRUE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distress_alerts_complaint ON distress_alerts(complaint_id);
ALTER TABLE distress_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can access distress alerts" ON distress_alerts;
CREATE POLICY "Staff can access distress alerts" ON distress_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- 5. Fraud, Spam & Astroturfing Review Queue (3.7)
CREATE TABLE IF NOT EXISTS fraud_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('clean', 'suspicious', 'fraud_spam')),
  bot_probability NUMERIC(4,3) NOT NULL DEFAULT 0.0,
  toxicity_score NUMERIC(4,3) NOT NULL DEFAULT 0.0,
  coordinated_campaign_flag BOOLEAN NOT NULL DEFAULT FALSE,
  signals TEXT[] NOT NULL DEFAULT '{}'::text[],
  submission_source JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'cleared_legitimate', 'confirmed_spam')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_complaint ON fraud_evaluations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_fraud_review_status ON fraud_evaluations(review_status);
CREATE INDEX IF NOT EXISTS idx_fraud_risk_tier ON fraud_evaluations(risk_tier);

ALTER TABLE fraud_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can review fraud cases" ON fraud_evaluations;
CREATE POLICY "Staff can review fraud cases" ON fraud_evaluations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- 6. Indic Auto-Translation Content Cache (3.9)
CREATE TABLE IF NOT EXISTS translation_cache (
  source_hash TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_hash, target_lang)
);

ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open read-write on translation cache" ON translation_cache;
CREATE POLICY "Open read-write on translation cache" ON translation_cache
  FOR ALL TO anon, authenticated USING (TRUE);

-- 7. Update Complaints View with Phase 3 Intelligence & Privacy Masking
DROP VIEW IF EXISTS complaints_view CASCADE;

CREATE OR REPLACE VIEW complaints_view AS
SELECT
  c.id,
  c.institution_id,
  c.bureau,
  c.status,
  c.category,
  c.channel,
  c.tracking_id,
  -- Description privacy masking: full description if user owns bureau or is Admin/Chairperson
  CASE
    WHEN auth.role() = 'service_role' THEN c.description
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin', 'chairperson') OR (p.role = 'rb_officer' AND c.bureau = 'RB') OR (p.role = 'pgrc_officer' AND c.bureau = 'PGRC'))
    ) THEN c.description
    ELSE NULL
  END AS description,
  c.date_received,
  c.assigned_officer,
  c.next_action,
  c.due_date,
  c.is_overlap_flagged,
  c.is_anonymous,
  c.anonymous_access_key,
  c.complainant_phone_last4,
  c.dynamic_fields,
  c.evidence,
  c.master_id,
  c.is_merged,
  c.merged_into_id,
  c.merged_complaint_ids,
  c.lead_bureau,
  c.routing_confidence,
  c.routing_rationale,
  c.is_triage,
  c.urgency,
  c.legal_risk,
  c.has_distress,
  c.distress_details,
  c.ai_predictions,
  c.ai_summary,
  c.fraud_score,
  c.fraud_evaluation,
  c.updated_at
FROM complaints c;

GRANT SELECT ON complaints_view TO authenticated, anon;
