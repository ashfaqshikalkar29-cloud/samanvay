-- ==============================================================================
-- SAMANVAY: Phase 1 Extended Workflows, Multi-Tier SLA & Smart Assignment
-- Migration: 004_phase1_workflows_sla.sql
-- ==============================================================================

-- 1. Extend complaints table for workflow stage & SLA pause states
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS current_workflow_stage TEXT DEFAULT 'Scrutiny',
  ADD COLUMN IF NOT EXISTS stage_started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_paused_awaiting_info BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS total_paused_duration_ms BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_complaints_workflow_stage ON complaints(current_workflow_stage);
CREATE INDEX IF NOT EXISTS idx_complaints_is_paused ON complaints(is_paused_awaiting_info);

-- 2. Configurable Category Workflow Definitions Table
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id TEXT PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  bureau TEXT NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
  description TEXT,
  stages JSONB NOT NULL,
  initial_stage TEXT NOT NULL,
  transitions JSONB NOT NULL,
  default_sla_days JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_category ON workflow_definitions(category);
CREATE INDEX IF NOT EXISTS idx_workflow_bureau ON workflow_definitions(bureau);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active workflows" ON workflow_definitions;
CREATE POLICY "Public can view active workflows" ON workflow_definitions
  FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage workflows" ON workflow_definitions;
CREATE POLICY "Admins can manage workflows" ON workflow_definitions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'chairperson')
    )
  );

-- 3. Workflow Stage History & Transition Audit Trail
CREATE TABLE IF NOT EXISTS workflow_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  transitioned_by TEXT NOT NULL,
  role TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stage_hist_complaint ON workflow_stage_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_stage_hist_transitioned_at ON workflow_stage_history(transitioned_at);

ALTER TABLE workflow_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers can read and write stage history" ON workflow_stage_history;
CREATE POLICY "Officers can read and write stage history" ON workflow_stage_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'rb_officer', 'pgrc_officer', 'chairperson', 'institute')
    )
  );

-- 4. Officer Workload & Roster Table
CREATE TABLE IF NOT EXISTS officer_workloads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bureau TEXT NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
  designation TEXT NOT NULL,
  email TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  on_leave BOOLEAN NOT NULL DEFAULT FALSE,
  leave_from DATE,
  leave_until DATE,
  leave_reason TEXT,
  delegate_officer_id TEXT REFERENCES officer_workloads(id),
  active_cases_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_officer_bureau ON officer_workloads(bureau);
CREATE INDEX IF NOT EXISTS idx_officer_on_leave ON officer_workloads(on_leave);

ALTER TABLE officer_workloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers can view roster" ON officer_workloads;
CREATE POLICY "Officers can view roster" ON officer_workloads
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 5. Multi-Tier SLA Escalation Rules Table
CREATE TABLE IF NOT EXISTS sla_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  stage TEXT NOT NULL,
  sla_days NUMERIC(5,1) NOT NULL,
  warning_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 50.0,
  breach_l1_pct NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  breach_l2_chairperson_pct NUMERIC(5,2) NOT NULL DEFAULT 200.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_rules_cat_stage ON sla_escalation_rules(category, stage);

ALTER TABLE sla_escalation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read SLA escalation rules" ON sla_escalation_rules;
CREATE POLICY "Read SLA escalation rules" ON sla_escalation_rules
  FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

-- 6. Seed Statutory Workflow Definitions
INSERT INTO workflow_definitions (id, category, bureau, description, stages, initial_stage, transitions, default_sla_days, version)
VALUES
(
  'wf-fee-regulation',
  'Fee Regulation',
  'RB',
  'Statutory workflow for capitation fees, unauthorized fees, and refund violations.',
  '["Intake", "Scrutiny", "Show-Cause", "Hearing", "Compliance", "Disposed", "Appeal"]'::jsonb,
  'Scrutiny',
  '[
    {"from": "Intake", "to": "Scrutiny", "allowedRoles": ["Admin", "RB Officer"], "label": "Commence Scrutiny"},
    {"from": "Scrutiny", "to": "Show-Cause", "allowedRoles": ["Admin", "RB Officer"], "label": "Issue Show-Cause Notice"},
    {"from": "Show-Cause", "to": "Hearing", "allowedRoles": ["Admin", "RB Officer"], "label": "Schedule Hearing"},
    {"from": "Show-Cause", "to": "Compliance", "allowedRoles": ["Admin", "RB Officer"], "label": "Direct Compliance"},
    {"from": "Hearing", "to": "Compliance", "allowedRoles": ["Admin", "RB Officer", "Chairperson"], "label": "Record Order"},
    {"from": "Compliance", "to": "Disposed", "allowedRoles": ["Admin", "RB Officer", "Chairperson"], "label": "Dispose Docket"}
  ]'::jsonb,
  '{"Intake": 1, "Scrutiny": 3, "Show-Cause": 15, "Hearing": 7, "Compliance": 14, "Disposed": 0, "Appeal": 21}'::jsonb,
  1
),
(
  'wf-faculty-norms',
  'Faculty Norms',
  'RB',
  'Statutory workflow for teacher-cadre ratios and 7th CPC salary compliance.',
  '["Intake", "Scrutiny", "Show-Cause", "Hearing", "Compliance", "Disposed"]'::jsonb,
  'Scrutiny',
  '[
    {"from": "Intake", "to": "Scrutiny", "allowedRoles": ["Admin", "RB Officer"], "label": "Initiate Faculty Audit"},
    {"from": "Scrutiny", "to": "Show-Cause", "allowedRoles": ["Admin", "RB Officer"], "label": "Issue Pay/Cadre Show-Cause"},
    {"from": "Show-Cause", "to": "Hearing", "allowedRoles": ["Admin", "RB Officer"], "label": "Summon Hearing"},
    {"from": "Hearing", "to": "Compliance", "allowedRoles": ["Admin", "RB Officer", "Chairperson"], "label": "Order Arrears"},
    {"from": "Compliance", "to": "Disposed", "allowedRoles": ["Admin", "RB Officer", "Chairperson"], "label": "Dispose"}
  ]'::jsonb,
  '{"Intake": 1, "Scrutiny": 5, "Show-Cause": 21, "Hearing": 10, "Compliance": 30, "Disposed": 0, "Appeal": 30}'::jsonb,
  1
),
(
  'wf-ragging-campus-safety',
  'Ragging & Campus Safety',
  'PGRC',
  'Emergency statutory workflow for anti-ragging complaints with 24h response.',
  '["Intake", "Scrutiny", "Hearing", "Compliance", "Disposed", "Appeal"]'::jsonb,
  'Scrutiny',
  '[
    {"from": "Intake", "to": "Scrutiny", "allowedRoles": ["Admin", "PGRC Officer"], "label": "EMERGENCY: Immediate Scrutiny"},
    {"from": "Scrutiny", "to": "Hearing", "allowedRoles": ["Admin", "PGRC Officer"], "label": "Emergency Anti-Ragging Hearing"},
    {"from": "Hearing", "to": "Compliance", "allowedRoles": ["Admin", "PGRC Officer", "Chairperson"], "label": "Disciplinary Directives"},
    {"from": "Compliance", "to": "Disposed", "allowedRoles": ["Admin", "PGRC Officer", "Chairperson"], "label": "Safety Clearance Disposed"}
  ]'::jsonb,
  '{"Intake": 0.5, "Scrutiny": 1, "Show-Cause": 3, "Hearing": 2, "Compliance": 5, "Disposed": 0, "Appeal": 10}'::jsonb,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Officer Workload Roster
INSERT INTO officer_workloads (id, name, bureau, designation, email, skills, assigned_regions, on_leave, active_cases_count)
VALUES
('off-rb-1', 'Dr. A. Kulkarni', 'RB', 'Deputy Director (Approval)', 'a.kulkarni@aicte-india.org', '["Fee Regulation", "Approval", "Audit"]'::jsonb, '["Western", "Northern"]'::jsonb, false, 14),
('off-rb-2', 'Mr. S. Verma', 'RB', 'Assistant Director (Regulatory)', 's.verma@aicte-india.org', '["Faculty Norms", "7th CPC", "Cadre"]'::jsonb, '["Southern", "Central"]'::jsonb, false, 12),
('off-pgrc-1', 'Ms. R. Iyer', 'PGRC', 'Senior Grievance Officer', 'r.iyer@aicte-india.org', '["Ragging", "Student Services", "Refunds"]'::jsonb, '["Southern", "Western"]'::jsonb, false, 16),
('off-pgrc-2', 'Mr. P. Nair', 'PGRC', 'Grievance Redressal Officer', 'p.nair@aicte-india.org', '["Scholarship", "Certificate Retention"]'::jsonb, '["Northern", "Central"]'::jsonb, false, 11)
ON CONFLICT (id) DO NOTHING;
