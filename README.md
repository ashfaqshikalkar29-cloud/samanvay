# Samanvay (समन्वय) — AICTE Integrated Grievance Dashboard

> **Smart India Hackathon (SIH) MVP**  
> Unified Cross-Bureau Grievance Coordination & Adjudication System for AICTE (Approval Bureau / RB & Public Grievance Redressal Cell / PGRC).

---

## 🏛️ System Overview

**Samanvay** bridges the operational coordination gap between AICTE bureaus with:
1. **Institution 360° Profile**: Unified view of all grievances across bureaus for every AICTE-approved institution with fine-grained access control.
2. **Correlation & Overlap Detection**: Automated Jaccard + token overlap engine that links duplicate or related grievances across bureaus with officer adjudication workflows (*Confirm Duplicate* / *Dismiss (Distinct)*).
3. **Accountability & Status Tracking**: Clear bureau ownership, assigned officers, last action timestamp, next action, and strict SLA countdowns with automatic breach/warning alerts.
4. **Bureau Security & Role-Based Access Control**:
   - **Admin**: Full visibility and system oversight across all bureaus.
   - **RB Officer**: Direct access to Approval Bureau matters; cross-bureau counterpart cases marked as *Restricted (owned by PGRC)*.
   - **PGRC Officer**: Direct access to Public Grievance Redressal Cell matters; counterpart cases marked as *Restricted (owned by RB)*.
5. **Cross-Bureau Transfer via RPC**: Secure transaction-based complaint transfers between bureaus.

---

## 🚀 Quick Start (In-Memory / Demo Mode)

By default, Samanvay runs out-of-the-box in **In-Memory mode** with zero database setup required. All sample data is loaded into memory and persisted locally in your browser session.

### Option 1: One-Click Windows Batch Script
Double-click `run.bat` at the repository root, or run:
```cmd
run.bat
```
This automatically boots the server on **http://localhost:2001**.

### Option 2: Command Line
```bash
cd samanvay
npm install
npm run dev -- --port 2001
```

In memory mode:
- A role switcher is available in the top navigation header (**Admin**, **RB Officer**, **PGRC Officer**).
- A "Reset demo data" button allows quick re-initialization of demo state at any time.

---

## ⚡ Connecting to Supabase (Production / Persistent Mode)

Samanvay is fully architected for Supabase with Row Level Security (RLS), custom RPC transfers, authenticated sessions, and live sync.

### 1. Environment Configuration

Copy the example environment file inside the `samanvay/` folder:
```bash
cp .env.local.example .env.local
```

Fill in your project credentials:
```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> **Security Note**: `SUPABASE_SERVICE_ROLE_KEY` is strictly used by the administrative database seed script (`scripts/seed.ts`) and is never bundled into client-side code.

### 2. Supabase Database Schema

Samanvay expects the following schema structure in your Supabase project:

- **Tables (with RLS enabled)**:
  - `profiles` (`id uuid references auth.users`, `full_name text`, `role text check ('admin', 'rb_officer', 'pgrc_officer')`)
  - `institutions` (`id text primary key`, `aicte_id text`, `name text`, `region text`)
  - `complaints` (`id text primary key`, `institution_id text`, `bureau text`, `status text`, `category text`, `description text`, `date_received date`, `assigned_officer text`, `next_action text`, `due_date date`, `is_overlap_flagged boolean`, `updated_at timestamptz`)
  - `audit_trail` (`id uuid primary key default gen_random_uuid()`, `complaint_id text`, `action text`, `timestamp timestamptz`, `officer text`, `remarks text`)
  - `overlap_alerts` (`id uuid primary key default gen_random_uuid()`, `complaint_a text`, `complaint_b text`, `reason text`, `score numeric`, `same_institution boolean`, `status text`, `lead_bureau text`, `adjudicated_by text`, `adjudicated_at timestamptz`, `note text`)

- **Views**:
  - `complaints_view`: Returns all complaints, but masks `description = NULL` for records outside the authenticated user's assigned bureau (admin sees all descriptions).

- **RPC Functions**:
  - `transfer_complaint(p_id text, p_officer text, p_bureau text)`: Elevated function to transfer complaint ownership across bureaus safely.

### 3. Run Database Seed Script

Populate your Supabase instance with institutions, baseline grievances, audit history, and initial overlap detections:
```bash
npm run seed
```

### 4. Demo User Accounts

When testing Supabase authentication, create users in your Supabase Auth dashboard or use the following pre-configured credentials:

| Role | Email | Password | Bureau Access |
|---|---|---|---|
| **Admin** | `admin@samanvay.demo` | `Samanvay@2026` | Full system visibility (RB + PGRC) |
| **RB Officer** | `rb@samanvay.demo` | `Samanvay@2026` | Approval Bureau cases only; PGRC cases restricted |
| **PGRC Officer** | `pgrc@samanvay.demo` | `Samanvay@2026` | PGRC cases only; RB cases restricted |

> **Tip**: The `/login` page provides quick-fill demo buttons to populate these credentials in one click.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16.4.3 (App Router with Turbopack)
- **Styling**: Tailwind CSS v4 & Lucide React Icons
- **UI Components**: shadcn/ui primitives (`Button`, `Card`, `Badge`, `Table`, `Dialog`, etc.)
- **Data Layer**: Clean Repository pattern (`Repo` interface in `lib/data/repo.ts` with `memoryRepo` and `supabaseRepo` implementations)
- **Authentication**: `@supabase/ssr` with session refresh middleware / route guards
- **Overlap Engine**: Client-side Jaccard similarity & keyword correlation engine with deterministic adjudication persistence

---

## 🧪 Verification & Building

To verify TypeScript typing and build for production:
```bash
# Type check
npx tsc --noEmit

# Production build
npm run build
```
Both commands execute with 0 errors.

---

## 🌐 Publishing to GitHub & Hosting on Vercel

### 1. Push to GitHub
The local repository is already initialized and committed on the `main` branch.

To push to your GitHub account:
```bash
npm run github:push <YOUR_GITHUB_REPO_URL> <GITHUB_PAT_OR_PASSWORD>
```
Example:
```bash
npm run github:push https://github.com/username/samanvay.git ghp_yourPersonalAccessToken
```

*(Or if you install standard Git CLI on your system: `git remote add origin <url>` and `git push -u origin main`)*.

### 2. Deploy to Vercel (Automatic CI/CD)
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your **samanvay** GitHub repository and click **"Import"**.
4. In the Project Configuration:
   - Framework Preset: **Next.js** (auto-detected).
   - Root Directory: `./` (or `samanvay` if importing from the workspace root).
5. (Optional) Under **Environment Variables**, add:
   - `NEXT_PUBLIC_DATA_MODE` = `supabase` (or omit for In-Memory demo mode).
   - `NEXT_PUBLIC_SUPABASE_URL` = `<your-url>`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-anon-key>`.
6. Click **Deploy**. Vercel will build and assign a production URL (e.g., `https://samanvay.vercel.app`) with automatic deployments on every `git push`.

