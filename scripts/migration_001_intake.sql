-- ==============================================================================
-- SAMANVAY: Phase 1 Multi-Channel Intake & Dynamic Form Migration
-- Migration: 001_intake.sql
-- ==============================================================================

-- 1. Extend institutions with geo and programme metadata
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS programmes TEXT[] DEFAULT '{}'::text[];

-- 2. Extend complaints table for multi-channel intake & anonymous filings
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web'
    CHECK (channel IN ('web', 'mobile', 'email', 'whatsapp', 'helpline', 'walk-in')),
  ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dynamic_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS complainant_phone_last4 TEXT,
  ADD COLUMN IF NOT EXISTS anonymous_access_key TEXT;

CREATE INDEX IF NOT EXISTS idx_complaints_channel ON complaints(channel);
CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id ON complaints(tracking_id);

-- 3. Anonymous Identities Enclave (Restricted Table)
CREATE TABLE IF NOT EXISTS anonymous_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  access_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE anonymous_identities ENABLE ROW LEVEL SECURITY;

-- Allow only Admin and Chairperson roles to read anonymous identities
DROP POLICY IF EXISTS "Enforce confidential identity access policy" ON anonymous_identities;
CREATE POLICY "Enforce confidential identity access policy" ON anonymous_identities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'chairperson')
    )
  );

-- Service role and intake service can insert records
DROP POLICY IF EXISTS "Intake service can insert encrypted identity" ON anonymous_identities;
CREATE POLICY "Intake service can insert encrypted identity" ON anonymous_identities
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 4. Audit Log for Confidential Identity Access
CREATE TABLE IF NOT EXISTS anonymous_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  officer_name TEXT NOT NULL,
  officer_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE anonymous_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated staff to read access logs" ON anonymous_access_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow audit logging of identity unmasking" ON anonymous_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Category Dynamic Form Schemas
CREATE TABLE IF NOT EXISTS category_form_schemas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bureau TEXT NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE category_form_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of category schemas" ON category_form_schemas
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. Recreate complaints_view to include multi-channel and tracking fields
-- Maintains security rule: description is NULL for out-of-bureau cases
DROP VIEW IF EXISTS complaints_view;

CREATE VIEW complaints_view AS
SELECT
  c.id,
  c.institution_id,
  c.bureau,
  c.status,
  c.category,
  c.date_received,
  c.assigned_officer,
  c.next_action,
  c.due_date,
  c.is_overlap_flagged,
  c.channel,
  c.tracking_id,
  c.is_anonymous,
  c.dynamic_fields,
  c.evidence,
  c.complainant_phone_last4,
  c.updated_at,
  CASE
    -- Admin, Chairperson, or user belonging to the owning bureau sees description
    WHEN (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('admin', 'chairperson')
               OR (profiles.role = 'rb_officer' AND c.bureau = 'RB')
               OR (profiles.role = 'pgrc_officer' AND c.bureau = 'PGRC'))
      )
    ) THEN c.description
    -- Complainants or unauthenticated callers viewing their own verified tracking record
    ELSE NULL
  END AS description
FROM complaints c;
