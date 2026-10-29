-- ==============================================================================
-- SAMANVAY: Phase 2 Cross-Bureau Intelligence & Coordination Migration
-- Migration: 002_intelligence.sql
-- ==============================================================================

-- 1. Enable pgvector extension for semantic text embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Extend complaints table for Phase 2 intelligence, clustering & docket merges
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS embedding vector(384),
  ADD COLUMN IF NOT EXISTS master_id TEXT REFERENCES complaints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_merged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS merged_into_id TEXT,
  ADD COLUMN IF NOT EXISTS merged_complaint_ids TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lead_bureau TEXT CHECK (lead_bureau IN ('RB', 'PGRC')),
  ADD COLUMN IF NOT EXISTS routing_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS routing_rationale TEXT,
  ADD COLUMN IF NOT EXISTS is_triage BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS decision_type TEXT;

-- Vector similarity index (cosine distance)
CREATE INDEX IF NOT EXISTS idx_complaints_embedding 
  ON complaints USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_complaints_master_id ON complaints(master_id);
CREATE INDEX IF NOT EXISTS idx_complaints_is_merged ON complaints(is_merged);
CREATE INDEX IF NOT EXISTS idx_complaints_is_triage ON complaints(is_triage);

-- 3. Unified Cross-Bureau Timeline Events
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  bureau TEXT NOT NULL CHECK (bureau IN ('RB', 'PGRC', 'Joint', 'System', 'Complainant', 'Institute')),
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_events_complaint_id ON case_events(complaint_id);
CREATE INDEX IF NOT EXISTS idx_case_events_bureau ON case_events(bureau);
CREATE INDEX IF NOT EXISTS idx_case_events_created_at ON case_events(created_at);

ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- Staff can view all events (including internal notes)
DROP POLICY IF EXISTS "Staff can read all case events" ON case_events;
CREATE POLICY "Staff can read all case events" ON case_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- Complainants and citizens can only view public events (is_internal = false)
DROP POLICY IF EXISTS "Public can view external case events" ON case_events;
CREATE POLICY "Public can view external case events" ON case_events
  FOR SELECT
  TO anon, authenticated
  USING (is_internal = FALSE);

-- Authenticated staff can insert events
DROP POLICY IF EXISTS "Staff can create case events" ON case_events;
CREATE POLICY "Staff can create case events" ON case_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Inter-Bureau Task Delegation
CREATE TABLE IF NOT EXISTS inter_bureau_tasks (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_bureau TEXT NOT NULL CHECK (from_bureau IN ('RB', 'PGRC')),
  to_bureau TEXT NOT NULL CHECK (to_bureau IN ('RB', 'PGRC')),
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_complaint_id ON inter_bureau_tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_to_bureau ON inter_bureau_tasks(to_bureau);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON inter_bureau_tasks(status);

ALTER TABLE inter_bureau_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage tasks" ON inter_bureau_tasks;
CREATE POLICY "Staff can manage tasks" ON inter_bureau_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- 5. Contradictory Directive Conflict Alerts
CREATE TABLE IF NOT EXISTS conflict_alerts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  complaint_a_id TEXT NOT NULL REFERENCES complaints(id),
  complaint_b_id TEXT NOT NULL REFERENCES complaints(id),
  decision_a TEXT NOT NULL,
  decision_b TEXT NOT NULL,
  bureau_a TEXT NOT NULL,
  bureau_b TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conflicts_inst ON conflict_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflict_alerts(status);

ALTER TABLE conflict_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view and resolve conflicts" ON conflict_alerts;
CREATE POLICY "Staff can view and resolve conflicts" ON conflict_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson')
    )
  );

-- 6. Routing Classifier Override & Feedback Log
CREATE TABLE IF NOT EXISTS routing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  predicted_bureau TEXT NOT NULL,
  assigned_bureau TEXT NOT NULL,
  confidence NUMERIC(4,3),
  overridden_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE routing_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can insert routing feedback" ON routing_feedback;
CREATE POLICY "Staff can insert routing feedback" ON routing_feedback
  FOR ALL
  TO authenticated
  USING (true);

-- 7. Recreate complaints_view with all Phase 1 & Phase 2 intelligence fields
-- Security boundary rule: description is NULL when reading from another bureau
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
  c.updated_at,
  c.channel,
  c.tracking_id,
  c.is_anonymous,
  c.dynamic_fields,
  c.evidence,
  c.complainant_phone_last4,
  -- Phase 2 intelligence columns
  c.master_id,
  c.is_merged,
  c.merged_into_id,
  c.merged_complaint_ids,
  c.lead_bureau,
  c.routing_confidence,
  c.routing_rationale,
  c.is_triage,
  c.decision_type,
  -- Description access control rule
  CASE
    WHEN auth.uid() IS NULL THEN c.description
    WHEN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('admin', 'chairperson')
          OR (p.role = 'rb_officer' AND c.bureau = 'RB')
          OR (p.role = 'pgrc_officer' AND c.bureau = 'PGRC')
        )
    ) THEN c.description
    ELSE NULL
  END AS description
FROM complaints c;

-- 8. Stored Procedure: Merge Complaints RPC
CREATE OR REPLACE FUNCTION merge_complaints_rpc(
  p_master_id TEXT,
  p_child_ids TEXT[],
  p_lead_bureau TEXT,
  p_officer TEXT,
  p_note TEXT
)
RETURNS VOID AS $$
DECLARE
  v_child_id TEXT;
  v_master_status TEXT;
  v_master_next TEXT;
BEGIN
  -- Get master docket status
  SELECT status, next_action INTO v_master_status, v_master_next
  FROM complaints WHERE id = p_master_id;

  -- Update master complaint
  UPDATE complaints
  SET
    lead_bureau = p_lead_bureau,
    merged_complaint_ids = ARRAY(
      SELECT DISTINCT unnest(array_cat(COALESCE(merged_complaint_ids, '{}'::text[]), p_child_ids))
    ),
    updated_at = now()
  WHERE id = p_master_id;

  -- Update each child complaint
  FOREACH v_child_id IN ARRAY p_child_ids LOOP
    UPDATE complaints
    SET
      master_id = p_master_id,
      is_merged = TRUE,
      merged_into_id = p_master_id,
      lead_bureau = p_lead_bureau,
      status = v_master_status,
      next_action = v_master_next,
      updated_at = now()
    WHERE id = v_child_id;

    -- Log child merge event
    INSERT INTO case_events (
      complaint_id, bureau, event_type, actor, title, description, is_internal
    ) VALUES (
      v_child_id,
      p_lead_bureau,
      'merge',
      p_officer,
      'Docket Consolidated under Master Case ' || p_master_id,
      p_note,
      FALSE
    );
  END LOOP;

  -- Log master merge event
  INSERT INTO case_events (
    complaint_id, bureau, event_type, actor, title, description, is_internal, metadata
  ) VALUES (
    p_master_id,
    p_lead_bureau,
    'merge',
    p_officer,
    'Consolidated ' || array_length(p_child_ids, 1) || ' duplicate complaint(s)',
    p_note,
    FALSE,
    jsonb_build_object('child_ids', p_child_ids, 'lead_bureau', p_lead_bureau)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
