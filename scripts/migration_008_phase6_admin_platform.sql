-- ==============================================================================
-- SAMANVAY: Migration 008 - Phase 6 Admin Platform & Accessibility Schema
-- Tables for Feature Flags, System Health, Custom Categories, Assisted Filing & Staff Roster
-- ==============================================================================

-- 1. Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    environment_overrides JSONB DEFAULT '{}'::jsonb,
    allowed_roles TEXT[] DEFAULT '{}',
    allowed_tenants TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255) NOT NULL DEFAULT 'System Administrator'
);

-- Seed Default Feature Flags
INSERT INTO feature_flags (key, name, description, category, is_enabled, allowed_roles, updated_by)
VALUES 
  ('enable_ai_dedup', 'AI Semantic Overlap & De-Duplication', 'Multilingual vector embeddings to detect cross-bureau and intra-bureau duplicate complaints.', 'AI & ML', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson'], 'Central Administrator'),
  ('enable_auto_routing', 'Intelligent Bureau Routing Classifier', 'Automated routing to Approval Bureau (RB) or Grievance Redressal Cell (PGRC) with confidence scores.', 'AI & ML', true, ARRAY['Admin', 'Chairperson'], 'Central Administrator'),
  ('enable_distress_scan', 'Emergency Distress & Sentiment Detection', 'Real-time scanning for self-harm, severe harassment, and immediate campus safety risks.', 'AI & ML', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson', 'Institute', 'Complainant'], 'Central Administrator'),
  ('enable_digilocker_kyc', 'DigiLocker / APAAR KYC Verification', 'Integration with National DigiLocker API for authenticating citizen identity credentials.', 'Integrations', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson', 'Institute', 'Complainant'], 'Central Administrator'),
  ('enable_video_hearings', 'Automated Video Hearings (Meet / Zoom)', 'Provisions virtual hearing rooms and generates RFC 5545 calendar convocations.', 'Workflows', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson'], 'Central Administrator'),
  ('enable_dpdp_encryption', 'DPDP Act 2023 AES-256 Field Encryption', 'End-to-end cryptographic field-level encryption for complainant PII and Right to be Forgotten.', 'Security & DPDP', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson', 'Institute', 'Complainant'], 'Central Administrator'),
  ('enable_simple_mode', 'Citizen Simple Accessibility Mode', 'High-contrast plain-language UI without technical bureaucracy acronyms for rural citizens.', 'Accessibility', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson', 'Institute', 'Complainant'], 'Central Administrator'),
  ('enable_pwa_offline', 'PWA Offline Draft Storage', 'Service worker offline caching enabling grievance filing during connectivity blackouts.', 'Accessibility', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson', 'Institute', 'Complainant'], 'Central Administrator'),
  ('enable_show_cause_pdf', 'Automated Statutory Show-Cause Generator', 'Generates formal show-cause legal notices with deadline countdowns and college reply tracking.', 'Workflows', true, ARRAY['Admin', 'RB Officer', 'PGRC Officer', 'Chairperson'], 'Central Administrator')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. System Health Metrics Probe Logs
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL,
    uptime_seconds NUMERIC(12, 2) NOT NULL,
    memory_rss_mb NUMERIC(10, 2) NOT NULL,
    memory_heap_used_mb NUMERIC(10, 2) NOT NULL,
    vector_latency_ms NUMERIC(8, 2) NOT NULL,
    database_latency_ms NUMERIC(8, 2) NOT NULL,
    worker_heartbeats JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_health_recorded_at ON system_health_metrics(recorded_at DESC);

-- 3. Custom Grievance Categories & Dynamic Fields
CREATE TABLE IF NOT EXISTS custom_grievance_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bureau VARCHAR(16) NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
    default_sla_days INT NOT NULL DEFAULT 15,
    description TEXT,
    custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL DEFAULT 'Central Administrator'
);

-- Seed Initial Categories
INSERT INTO custom_grievance_categories (id, name, bureau, default_sla_days, description, custom_fields)
VALUES
  ('cat-1', 'Fee Regulation & Capitation Refunds', 'RB', 15, 'Unapproved development fees, capitation fees, or denial of tuition refund upon withdrawal.', '[{"name":"Amount Demanded (₹)","type":"number","required":true},{"name":"Date of Seat Cancellation","type":"text","required":true}]'::jsonb),
  ('cat-2', 'Faculty Norms & Salary Disbursal', 'RB', 21, 'Failure to pay 7th CPC salary, cadre ratio deficiencies, or withholding of service books.', '[{"name":"Months of Unpaid Salary","type":"number","required":true},{"name":"Designation / Cadre","type":"select","required":true}]'::jsonb),
  ('cat-3', 'Campus Safety & Anti-Ragging Mandate', 'PGRC', 7, 'Physical or psychological ragging, hostel safety, or non-constitution of Anti-Ragging Committee.', '[{"name":"Incident Location / Hostel Block","type":"text","required":true}]'::jsonb),
  ('cat-4', 'Scholarship & Fellowship Disbursal (NSP/PFMS)', 'PGRC', 15, 'Pragati, Saksham, Swanath, and GATE fellowship non-clearance by College Nodal Officer.', '[{"name":"NSP Application Reference ID","type":"text","required":true}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Assisted-Filing Dockets (CSC / Helpdesk Attribution)
CREATE TABLE IF NOT EXISTS assisted_filing_dockets (
    docket_id VARCHAR(64) PRIMARY KEY,
    filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operator_id VARCHAR(64) NOT NULL,
    operator_name VARCHAR(255) NOT NULL,
    csc_center_code VARCHAR(64) NOT NULL,
    district VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    consent_type VARCHAR(64) NOT NULL,
    complainant_name VARCHAR(255) NOT NULL,
    complainant_mobile VARCHAR(16) NOT NULL,
    complainant_category VARCHAR(64) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    bureau VARCHAR(16) NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
    category VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending'
);

CREATE INDEX IF NOT EXISTS idx_assisted_dockets_filed_at ON assisted_filing_dockets(filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assisted_dockets_operator ON assisted_filing_dockets(operator_id);

-- 5. Staff Users Roster Table
CREATE TABLE IF NOT EXISTS staff_users_roster (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bureau VARCHAR(16) NOT NULL CHECK (bureau IN ('RB', 'PGRC')),
    designation VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    skills TEXT[] DEFAULT '{}',
    assigned_regions TEXT[] DEFAULT '{}',
    on_leave BOOLEAN NOT NULL DEFAULT false,
    leave_until DATE,
    leave_reason TEXT,
    delegate_officer_id VARCHAR(64),
    active_cases_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Staff Roster
INSERT INTO staff_users_roster (id, name, bureau, designation, email, skills, assigned_regions, on_leave, active_cases_count)
VALUES
  ('off-rb-1', 'Dr. A. Kulkarni', 'RB', 'Deputy Director (Approval & Regulations)', 'a.kulkarni@aicte-india.org', ARRAY['Fee Regulation', 'Approval / Affiliation', 'Audit', 'Capitation'], ARRAY['Western', 'Northern'], false, 14),
  ('off-rb-2', 'Mr. S. Verma', 'RB', 'Assistant Director (Regulatory Norms)', 's.verma@aicte-india.org', ARRAY['Faculty Norms', '7th CPC', 'Infrastructure', 'Cadre Ratio'], ARRAY['Southern', 'North-West', 'Central'], false, 12),
  ('off-rb-3', 'Dr. Meera Nambiar', 'RB', 'Legal & Regulatory Advisor', 'm.nambiar@aicte-india.org', ARRAY['Fee Regulation', 'Admission Irregularity', 'Legal Compliance'], ARRAY['Eastern', 'South-Western'], true, 3),
  ('off-pgrc-1', 'Ms. R. Iyer', 'PGRC', 'Senior Grievance Officer (Student Welfare)', 'r.iyer@aicte-india.org', ARRAY['Ragging & Campus Safety', 'Student Services', 'Fee Refund', 'Mental Health'], ARRAY['Southern', 'Western'], false, 16),
  ('off-pgrc-2', 'Mr. P. Nair', 'PGRC', 'Grievance Redressal Officer', 'p.nair@aicte-india.org', ARRAY['Scholarship', 'Student Services', 'Certificate Retention', 'Hostel & Amenities'], ARRAY['Northern', 'Central', 'North-West'], false, 11),
  ('off-pgrc-3', 'Dr. Sunita Rao', 'PGRC', 'Assistant Director (Ombudsperson Liaison)', 's.rao@aicte-india.org', ARRAY['Ragging & Campus Safety', 'Faculty Harassment', 'Hostel & Amenities'], ARRAY['Eastern', 'South-Western'], false, 9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  designation = EXCLUDED.designation;

-- Enable Row Level Security (RLS)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_grievance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assisted_filing_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users_roster ENABLE ROW LEVEL SECURITY;

-- Read policies for staff and public
CREATE POLICY "Public read for feature flags" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Public read for custom categories" ON custom_grievance_categories FOR SELECT USING (true);
CREATE POLICY "Staff read for staff roster" ON staff_users_roster FOR SELECT USING (true);
CREATE POLICY "Assisted dockets insert for authorized operators" ON assisted_filing_dockets FOR INSERT WITH CHECK (true);
CREATE POLICY "Assisted dockets select for staff" ON assisted_filing_dockets FOR SELECT USING (true);
