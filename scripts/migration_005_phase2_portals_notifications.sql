-- ==============================================================================
-- SAMANVAY: Phase 2 Complainant & Institute Portals, Multi-Channel Notifications
-- Migration: 005_phase2_portals_notifications.sql
-- ==============================================================================

-- 1. Multi-Channel Notification Audit & Delivery Ledger Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  tracking_id TEXT,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('complainant', 'institute', 'officer', 'chairperson', 'admin')),
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp', 'in_app')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('dispatched', 'delivered', 'failed', 'read')),
  delivery_receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_complaint ON notification_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notification_logs(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notification_logs(created_at);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant notifications" ON notification_logs;
CREATE POLICY "Users can view relevant notifications" ON notification_logs
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 2. Citizen Resolution Feedback & Rating Table (C. Feedback)
CREATE TABLE IF NOT EXISTS citizen_resolution_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_complaint ON citizen_resolution_feedback(complaint_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON citizen_resolution_feedback(rating);

ALTER TABLE citizen_resolution_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit feedback" ON citizen_resolution_feedback;
CREATE POLICY "Public can submit feedback" ON citizen_resolution_feedback
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Officers can view feedback" ON citizen_resolution_feedback;
CREATE POLICY "Officers can view feedback" ON citizen_resolution_feedback
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 3. Institutional Deadline Extension Requests Table (C. Institute Portal)
CREATE TABLE IF NOT EXISTS institutional_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  requested_days INTEGER NOT NULL CHECK (requested_days BETWEEN 1 AND 14),
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT NOT NULL,
  adjudicated_by TEXT,
  adjudicated_at TIMESTAMPTZ,
  officer_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_complaint ON institutional_extension_requests(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ext_status ON institutional_extension_requests(status);

ALTER TABLE institutional_extension_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutes can submit extension requests" ON institutional_extension_requests;
CREATE POLICY "Institutes can submit extension requests" ON institutional_extension_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Officers and Institutes can view extensions" ON institutional_extension_requests;
CREATE POLICY "Officers and Institutes can view extensions" ON institutional_extension_requests
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 4. Initial Seed Notifications
INSERT INTO notification_logs (id, complaint_id, tracking_id, recipient_role, recipient_name, recipient_contact, channel, title, message, priority, status, delivery_receipt)
VALUES
(
  gen_random_uuid(),
  'C-1001',
  'SMV-2026-001001',
  'institute',
  'Principal, MIT Pune',
  'principal@mitpune.edu.in',
  'email',
  'AICTE Statutory Show-Cause Notice: Capitation Fee Allegation',
  'Statutory show-cause notice issued under APH Regulations for Docket C-1001. Formal response required within 15 days.',
  'high',
  'delivered',
  '{"gateway": "NIC-MAIL", "code": 250, "dispatched_at": "2026-10-03T11:00:00Z"}'::jsonb
),
(
  gen_random_uuid(),
  'C-1001',
  'SMV-2026-001001',
  'complainant',
  'Rajesh Sharma',
  '+91 98765 43210',
  'sms',
  'Grievance Acknowledged - AICTE Samanvay',
  'Your grievance SMV-2026-001001 has been registered with AICTE Approval Bureau (RB). Track status at https://samanvay.aicte.gov.in/track/SMV-2026-001001',
  'normal',
  'delivered',
  '{"gateway": "CDAC-GW", "dlt_id": "14071612345678", "dispatched_at": "2026-10-02T14:30:00Z"}'::jsonb
),
(
  gen_random_uuid(),
  'C-1002',
  'SMV-2026-001002',
  'complainant',
  'Citizen Complainant',
  '+91 98123 45678',
  'whatsapp',
  'AICTE Grievance Status Update',
  'Namaste! Your grievance regarding Fee Refund has advanced to Show-Cause Stage. A formal reply has been demanded from the institution.',
  'normal',
  'delivered',
  '{"gateway": "META-WA", "template": "grievance_status_v2", "dispatched_at": "2026-10-10T10:15:00Z"}'::jsonb
);
