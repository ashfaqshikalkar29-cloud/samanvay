# AICTE Samanvay Security & Privacy Checklist
## Alignment with GIGW 3.0, CERT-In Cyber Security Directions, DPDP Act 2023 & OWASP Top 10

> **Statutory Notice**: This document tracks implementation status of security controls ("Done" vs. "Pending") for the **Samanvay** AICTE Grievance Portal. This checklist reflects internal architectural self-assessments and engineering verification tests. It does **not** constitute a formal legal or regulatory certification of statutory compliance.

---

### 1. Executive Summary & Security Posture

Samanvay enforces a defense-in-depth security model combining cryptographic immutability, role-based boundary enforcement, field-level encryption, multi-factor authentication, and automated audit logging.

| Security Domain | Core Framework / Standard | Implementation Status | Primary Code References |
|---|---|:---:|---|
| **Identity & Authentication** | RFC 6238 TOTP, Base32, MFA Backup Codes | **Done** | `lib/security/totp.ts`, `app/api/auth/mfa/*` |
| **Access Control (RBAC)** | Role-Based Permission Matrix (6 Roles $\times$ 20 Perms) | **Done** | `lib/security/rbac.ts`, `lib/supabase/middleware.ts` |
| **Audit & Non-Repudiation** | SHA-256 Hash-Chained Tamper-Evident Ledger | **Done** | `lib/security/audit-chain.ts`, `app/api/audit/*` |
| **Data Protection & Privacy** | DPDP Act 2023 (AES-256-GCM, PII Masking, Sec 12 Erasure) | **Done** | `lib/security/dpdp.ts`, `app/api/privacy/*` |
| **Digital Signatures** | Information Technology Act 2000 Sec 3A eSign | **Done** | `lib/integrations/esign.ts`, `app/api/esign/*` |
| **Web Security & Headers** | OWASP Top 10, CSP, HSTS, X-Frame-Options | **Done** | `next.config.ts`, `lib/security/env-check.ts` |

---

### 2. CERT-In Cyber Security Directives (2022) Alignment

| Ref | CERT-In Requirement | Status | Technical Implementation in Samanvay |
|---|---|:---:|---|
| **CERT-01** | Mandatory NTP / Synchronized Clock Timestamping | **Done** | Standardized UTC/IST ISO-8601 timestamps enforced across audit blocks, event timelines, and notification logs. |
| **CERT-02** | Maintenance of Logs for at least 180 Days | **Done** | Immutable database schema (`audit_blocks`, `audit_trail`, `system_health_metrics`) backed by SHA-256 hash chaining. |
| **CERT-03** | Multi-Factor Authentication (MFA) for Administrative Staff | **Done** | RFC 6238 Time-based One-Time Password (TOTP) with single-use SHA-256 recovery backup codes for all regulatory staff. |
| **CERT-04** | Vulnerability Remediation & Security Scanning | **Done** | Automated GitHub Actions CI workflow with `npm audit` dependency scanning; zero high/critical vulnerabilities. |
| **CERT-05** | Incident Reporting & Tamper Alerting | **Done** | Cryptographic audit chain verification (`verifyChain()`) detects block manipulation and pinpoints exact compromised index. |
| **CERT-06** | Hardware Security Module (HSM) Integration | *Pending* | Production deployment recommends linking AES-256 keys to AWS CloudHSM / NIC HSM (currently env-backed AES-256-GCM). |

---

### 3. GIGW 3.0 (Guidelines for Indian Government Websites) Alignment

| Ref | GIGW 3.0 Requirement | Status | Technical Implementation in Samanvay |
|---|---|:---:|---|
| **GIGW-01** | Multi-Lingual Support (Hindi & Regional Languages) | **Done** | Full i18n system covering English, Hindi, and 9 Indic languages (Marathi, Tamil, Bengali, Telugu, Gujarati, Kannada, etc.). |
| **GIGW-02** | Accessibility (WCAG 2.1 Level AA) | **Done** | Semantic HTML5, ARIA labels on all interactive controls, high-contrast toggle, keyboard navigation, and plain-language Simple Mode. |
| **GIGW-03** | Zero Hardcoded Demonstration Credentials in Production | **Done** | Environment verification startup check fails fast if default demo secrets are detected in production mode. |
| **GIGW-04** | Plain-Language Citizen Mode | **Done** | Citizen Simple Mode (`lib/simple-mode.tsx`) automatically translates bureaucratic acronyms (e.g. "RB" to "College Approval Office"). |
| **GIGW-05** | Public Transparency without PII Exposure | **Done** | Dedicated unauthenticated public transparency portal (`/public/transparency`) exposing only sanitized aggregates. |
| **GIGW-06** | Mobile Device Optimization & PWA | **Done** | Responsive UI across mobile/desktop, installable PWA manifest (`manifest.json`), and offline service worker (`sw.js`). |

---

### 4. DPDP Act 2023 (Digital Personal Data Protection) Alignment

| Ref | DPDP Statutory Requirement | Status | Technical Implementation in Samanvay |
|---|---|:---:|---|
| **DPDP-01** | Lawful Consent & Notice (Section 6) | **Done** | Explicit consent checkboxes on citizen filing (`/new`) and assisted-filing (`/assisted-filing`) with bilingual notices. |
| **DPDP-02** | Data Minimization & Field-Level Encryption (Section 8) | **Done** | Complainant phone, email, name, and ID encrypted at rest using AES-256-GCM (`lib/security/dpdp.ts`). |
| **DPDP-03** | Default PII Masking on Case Views | **Done** | Default view shows masked data (e.g. `A**** S****`, `+91 98*****210`); unmasking requires justification and writes an audit block. |
| **DPDP-04** | Right to Correction and Erasure (Section 12) | **Done** | Complainants can trigger Right-to-be-Forgotten data erasure (`/api/privacy/erase`), sanitizing PII while preserving legal case statistics. |
| **DPDP-05** | Purpose Limitation & Data Retention Rules | **Done** | Resolved cases automatically archive after retention period; scheduled purge scripts available. |
| **DPDP-06** | Independent Data Protection Officer (DPO) Portal | *Pending* | Standalone external DPO portal scheduled for Phase 7 (currently managed through Admin role audit controls). |

---

### 5. OWASP Top 10 (2021/2025) Mitigation Controls

| Vulnerability | Threat Description | Samanvay Defensive Mitigation |
|---|---|---|
| **A01: Broken Access Control** | Privilege escalation across user roles | Server-side authorization (`authorizePermission`) on all API endpoints; Next.js middleware guards. |
| **A02: Cryptographic Failures** | Weak ciphers or cleartext PII storage | AES-256-GCM field encryption, SHA-256 hash-chaining, strict TLS HSTS (2-year preload), OWASP headers. |
| **A03: Injection** | SQL injection or XSS payload delivery | Parameterized Supabase client queries, strict React JSX auto-escaping, sanitized DOM inputs. |
| **A04: Insecure Design** | Uncoordinated dual-bureau investigations | Intelligent vector overlap detection (`lib/embeddings.ts`) catches duplicate complaints before conflicting orders are issued. |
| **A05: Security Misconfiguration** | Default credentials or debug endpoints | Strict environment validation (`lib/security/env-check.ts`), CSP headers blocking unauthorized script execution. |
| **A06: Vulnerable Components** | Outdated or exploitable npm packages | Pinned dependencies in `package-lock.json`, automated GitHub Actions CI vulnerability scanning. |
| **A07: Identification & Auth Failures** | Brute force or credential stuffing | TOTP 2FA, single-use recovery code burn-on-use, API key rate-limiting (120 req/min). |
| **A08: Software & Data Integrity Failures** | Unverifiable case files or tampering | SHA-256 hash-chained audit blocks with `verifyChain()` tamper detection, National eSign digital seals. |
| **A09: Security Logging Failures** | Untracked officer actions or deletions | Append-only audit log; unmasking, reassignments, extensions, and approvals logged immutably. |
| **A10: Server-Side Request Forgery (SSRF)** | Malicious URLs in external webhooks | Whitelisted destination domains for e-Office and webhook dispatch; internal IPs blocked. |

---

### 6. Automated Security Verification Suite

Run the full security test suite locally via:
```bash
# Execute RBAC, TOTP, Audit Chain & DPDP tests (48 assertions)
npx tsx scripts/test-phase4-security.ts

# Execute Admin, Platform & Access Governance tests (12 assertions)
npx tsx scripts/test-phase6-admin-platform.ts
```
Expected result: **60 / 60 passed (100% success)**.
