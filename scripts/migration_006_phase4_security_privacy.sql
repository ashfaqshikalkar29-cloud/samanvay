-- ==============================================================================
-- SAMANVAY AICTE GRIEVANCE REDRESSAL PLATFORM
-- MIGRATION 006: PHASE 4 - SECURITY, PRIVACY & COMPLIANCE (DOMAIN E)
-- ==============================================================================

-- 1. TOTP Multi-Factor Authentication Store
CREATE TABLE IF NOT EXISTS public.totp_secrets (
  user_id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- 2. MFA Emergency Backup Recovery Codes (Hashed with SHA-256)
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.totp_secrets(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_lookup ON public.mfa_backup_codes(user_id, code_hash) WHERE is_used = FALSE;

-- 3. Cryptographic Hash-Chained Audit Trail (Tamper-Evident Ledger)
CREATE TABLE IF NOT EXISTS public.hash_chained_audit_log (
  block_index BIGINT PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  complaint_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_json JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details_json JSONB NOT NULL,
  details_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  block_hash TEXT NOT NULL UNIQUE,
  signature TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_complaint_id ON public.hash_chained_audit_log(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_previous_hash ON public.hash_chained_audit_log(previous_hash);

-- 4. DPDP Statutory PII Unmasking Audit Logs
CREATE TABLE IF NOT EXISTS public.pii_unmask_logs (
  log_id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  justification TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unmask_complaint ON public.pii_unmask_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_unmask_actor ON public.pii_unmask_logs(actor_id);

-- 5. DPDP Section 12 Right-To-Be-Forgotten Erasure Records
CREATE TABLE IF NOT EXISTS public.data_erasure_requests (
  request_id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erasure_complaint ON public.data_erasure_requests(complaint_id);

-- 6. Genesis Block Seeding if table is empty
INSERT INTO public.hash_chained_audit_log (
  block_index,
  entry_id,
  complaint_id,
  action,
  actor_json,
  timestamp,
  details_json,
  details_hash,
  previous_hash,
  block_hash,
  signature
)
SELECT
  0,
  'audit-block-genesis-0000',
  'SYSTEM',
  'GENESIS_INITIALIZATION',
  '{"id": "aicte-system", "name": "AICTE Central Authority System", "role": "Admin", "bureau": "Central"}'::jsonb,
  '2026-01-01 00:00:00+00',
  '{"system": "Samanvay AICTE Grievance Portal", "protocol": "Cryptographic Hash-Chained Audit Trail v1.0"}'::jsonb,
  '879984920252b4122d64f0b9fef86603debe9d6e49e290f6ff6bc7b0e14a1a68',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
  'simulated-hmac-sha256-genesis-signature'
WHERE NOT EXISTS (SELECT 1 FROM public.hash_chained_audit_log WHERE block_index = 0);

-- Enable RLS
ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hash_chained_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pii_unmask_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_erasure_requests ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service full access on totp_secrets" ON public.totp_secrets FOR ALL USING (true);
CREATE POLICY "Service full access on mfa_backup_codes" ON public.mfa_backup_codes FOR ALL USING (true);
CREATE POLICY "Service full access on hash_chained_audit_log" ON public.hash_chained_audit_log FOR ALL USING (true);
CREATE POLICY "Service full access on pii_unmask_logs" ON public.pii_unmask_logs FOR ALL USING (true);
CREATE POLICY "Service full access on data_erasure_requests" ON public.data_erasure_requests FOR ALL USING (true);
