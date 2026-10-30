# AICTE Samanvay Disaster Recovery & Business Continuity Runbook (DR-BCP)
## Standard Operating Procedures for High-Availability Grievance Operations

> **Classification**: AICTE Centralised Grievance Infrastructure · Official Engineering Guide

---

### 1. Recovery Objectives (RPO & RTO)

| Metric | Target | Technical Mechanism |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 15 Minutes** | Continuous PostgreSQL WAL archiving + incremental automated snapshots |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** | Containerized stateless Next.js edge nodes + Supabase automated failover |
| **Audit Ledger RPO** | **Zero Data Loss (RPO = 0)** | SHA-256 hash-chained block validation prevents silent corruption |

---

### 2. Scheduled Backup Schedule & Retention Policy

- **Hourly Differential Snapshots**: Hourly backup of active complaint state, audit blocks, and case events. Retained for 7 days.
- **Daily Full Backups**: Full database dump taken daily at 02:00 AM IST. Retained for 90 days.
- **Monthly Regulatory Archive**: Encrypted full database dump retained off-site for 7 years in compliance with AICTE Statutory Archive regulations.

---

### 3. Automated Backup & Restore Verification Script

Run the automated backup and restore drill to verify dump integrity and hash validation:

```bash
# Execute Backup & Restore Verification Drill
npx tsx scripts/backup-restore.ts
```

What the script tests:
1. Generates an encrypted, timestamped database snapshot.
2. Calculates cryptographic SHA-256 checksum of the backup archive.
3. Simulates restoring into a clean test database schema.
4. Validates 100% record parity and audit-chain hash continuity across all restored blocks.

---

### 4. Health Checks & Observability Monitoring

- **Synthetic Health Probe**: `GET /health`
  - Validates database connectivity, vector embedding service latency, memory usage (RSS/heap), and background SLA worker status.
- **Automated Uptime Alerting**:
  - If `/health` probe latency exceeds 500ms or status drops to `DEGRADED`, PagerDuty / SMS alerts notify the Infrastructure Lead.
- **Container Restart Policies**:
  ```yaml
  # Docker / Kubernetes Restart Policy
  restart_policy:
    condition: on-failure
    max_attempts: 3
    window: 120s
  ```

---

### 5. Disaster Recovery Failover Procedure (Step-by-Step)

In the event of a catastrophic primary datacenter outage:

1. **Declare Disaster**: Lead Infrastructure Officer verifies unavailability on primary health probe.
2. **Promote Read-Replica**:
   ```sql
   -- On Secondary PostgreSQL Instance
   SELECT pg_promote();
   ```
3. **Switch DNS / Gateway Routing**:
   - Update Cloudflare / NIC DNS A-records to point to the Disaster Recovery (DR) datacenter IP address.
4. **Run Audit Chain Integrity Check**:
   ```bash
   curl -X POST https://samanvay.aicte-india.org/api/audit/verify
   ```
   Verify that `isValid: true` and zero blocks report tampering.
5. **Resume Background Workers**:
   - Reactivate the SLA countdown scheduled job (`/api/sla/tick`).
6. **Notify Regulators & Complainants**:
   - Issue system notification confirming DR failover completion within the 30-minute RTO window.
