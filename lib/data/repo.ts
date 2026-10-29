import {
  seedComplaints,
  institutions as mockInstitutions,
  buildSeedAudit,
  type Complaint,
  type Institution,
  type AuditEntry,
  type OverlapAlert,
  type Bureau,
} from "@/lib/mock";
import { detectOverlaps, OVERLAP_CONFIG } from "@/lib/overlap";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  mapDbComplaintToApp,
  mapAppComplaintToDb,
  mapDbAuditToApp,
  mapDbAlertToApp,
  type DbComplaint,
  type DbAuditEntry,
  type DbOverlapAlert,
} from "@/lib/supabase/types";
import { getSla } from "@/lib/sla";

export interface UpdatePatch {
  status?: Complaint["status"];
  assigned_officer?: string;
  remark?: string;
  next_action?: string;
}

export interface AdjudicationPatch {
  alertId: string; // "idA|idB" or UUID
  decision: "Confirmed Duplicate" | "Dismissed (Distinct)";
  lead_bureau?: Bureau;
  note: string;
  adjudicated_by: string;
}

export interface LoadAllResult {
  institutions: Institution[];
  complaints: Complaint[];
  audit: AuditEntry[];
  alerts: OverlapAlert[];
}

export interface Repo {
  readonly mode: "memory" | "supabase";
  loadAll(): Promise<LoadAllResult>;
  updateComplaint(id: string, patch: UpdatePatch): Promise<boolean>;
  transferComplaint(id: string, officer: string, bureau: Bureau): Promise<boolean>;
  addAudit(entry: AuditEntry): Promise<void>;
  syncAlerts(detectedAlerts: OverlapAlert[], activeComplaintIds: string[]): Promise<void>;
  adjudicateAlert(patch: AdjudicationPatch): Promise<void>;
  insertComplaint(complaint: Complaint): Promise<boolean>;
  setFlaggedState(complaintId: string, flagged: boolean): Promise<void>;
}

// ── In-Memory Repository (with localStorage persistence) ────────────────────

const LS_COMPLAINTS = "sam_complaints";
const LS_AUDIT = "sam_audit";
const LS_ALERTS = "sam_alerts";
const LS_DISMISSED = "sam_dismissed";

const ENGINE = "Samanvay Overlap Engine";
const ENGINE_TS = "2026-10-24T05:30:00.000Z";

function alertId(a: string, b: string) {
  return [a, b].sort().join("|");
}

function buildInitialAlerts(complaints: Complaint[]): OverlapAlert[] {
  const seen = new Set<string>();
  const alerts: OverlapAlert[] = [];
  for (const c of complaints) {
    for (const l of c.overlap_links) {
      const id = alertId(c.id, l.complaint_id);
      if (seen.has(id)) continue;
      seen.add(id);
      const [idA, idB] = id.split("|") as [string, string];
      alerts.push({
        id,
        complaint_ids: [idA, idB],
        reason: l.reason,
        score: l.score,
        same_institution: l.same_institution,
        status: "Open",
      });
    }
  }
  return alerts;
}

function engineEntries(prev: Complaint[], next: Complaint[], ts: string): AuditEntry[] {
  const out: AuditEntry[] = [];
  for (const n of next) {
    const was = prev.find((p) => p.id === n.id)?.is_overlap_flagged ?? false;
    if (n.is_overlap_flagged && !was) {
      out.push({
        complaint_id: n.id,
        action: "Overlap Flagged",
        timestamp: ts,
        officer: ENGINE,
        remarks: `Linked with ${n.overlap_links.map((l) => l.complaint_id).join(", ")} (${n.overlap_links[0].reason}).`,
      });
    } else if (!n.is_overlap_flagged && was) {
      out.push({
        complaint_id: n.id,
        action: "Overlap Cleared",
        timestamp: ts,
        officer: ENGINE,
        remarks: "No active similar case in another bureau.",
      });
    }
  }
  return out;
}

class MemoryRepo implements Repo {
  readonly mode = "memory" as const;

  private complaints: Complaint[] = [];
  private audit: AuditEntry[] = [];
  private alerts: OverlapAlert[] = [];
  private dismissedPairs: Set<string> = new Set();
  private initialized = false;

  private init() {
    if (this.initialized) return;
    const initialComplaints = detectOverlaps(seedComplaints);
    const initialAudit: AuditEntry[] = [
      ...buildSeedAudit(),
      ...engineEntries(seedComplaints, initialComplaints, ENGINE_TS),
    ];
    const initialAlerts = buildInitialAlerts(initialComplaints);

    if (typeof window !== "undefined") {
      try {
        const sc = localStorage.getItem(LS_COMPLAINTS);
        const sa = localStorage.getItem(LS_AUDIT);
        const sl = localStorage.getItem(LS_ALERTS);
        const sd = localStorage.getItem(LS_DISMISSED);

        const loaded = sc ? (JSON.parse(sc) as Complaint[]) : initialComplaints;
        this.complaints = loaded.map((c) => ({
          ...c,
          channel: c.channel || "web",
          tracking_id: c.tracking_id || `SMV-2026-${c.id.replace(/\D/g, "").padStart(6, "0")}`,
          dynamic_fields: c.dynamic_fields || {},
          evidence: c.evidence || [],
        }));
        this.audit = sa ? JSON.parse(sa) : initialAudit;
        this.alerts = sl ? JSON.parse(sl) : initialAlerts;
        this.dismissedPairs = sd ? new Set(JSON.parse(sd)) : new Set();
      } catch {
        this.complaints = initialComplaints;
        this.audit = initialAudit;
        this.alerts = initialAlerts;
      }
    } else {
      this.complaints = initialComplaints;
      this.audit = initialAudit;
      this.alerts = initialAlerts;
    }
    this.initialized = true;
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS_COMPLAINTS, JSON.stringify(this.complaints));
      localStorage.setItem(LS_AUDIT, JSON.stringify(this.audit));
      localStorage.setItem(LS_ALERTS, JSON.stringify(this.alerts));
      localStorage.setItem(LS_DISMISSED, JSON.stringify([...this.dismissedPairs]));
    } catch {
      // quota or private browsing
    }
  }

  async loadAll(): Promise<LoadAllResult> {
    this.init();
    return {
      institutions: mockInstitutions,
      complaints: [...this.complaints],
      audit: [...this.audit],
      alerts: [...this.alerts],
    };
  }

  async updateComplaint(id: string, patch: UpdatePatch): Promise<boolean> {
    this.init();
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const target = this.complaints[idx];
    this.complaints[idx] = {
      ...target,
      status: patch.status ?? target.status,
      assigned_officer: patch.assigned_officer ?? target.assigned_officer,
      next_action: patch.next_action !== undefined ? patch.next_action : target.next_action,
    };
    this.persist();
    return true;
  }

  async transferComplaint(id: string, officer: string, bureau: Bureau): Promise<boolean> {
    this.init();
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.complaints[idx] = {
      ...this.complaints[idx],
      assigned_officer: officer,
      bureau,
    };
    this.persist();
    return true;
  }

  async addAudit(entry: AuditEntry): Promise<void> {
    this.init();
    this.audit.push(entry);
    this.persist();
  }

  async syncAlerts(detectedAlerts: OverlapAlert[]): Promise<void> {
    this.init();
    const existingMap = new Map(this.alerts.map((a) => [a.id, a]));

    // Upsert detected alerts
    for (const d of detectedAlerts) {
      const existing = existingMap.get(d.id);
      if (!existing) {
        existingMap.set(d.id, { ...d, status: "Open" });
      }
    }

    // Remove open alerts that are no longer detected
    const detectedIds = new Set(detectedAlerts.map((d) => d.id));
    for (const [id, a] of existingMap.entries()) {
      if (a.status === "Open" && !detectedIds.has(id)) {
        existingMap.delete(id);
      }
    }

    this.alerts = Array.from(existingMap.values());
    this.persist();
  }

  async adjudicateAlert(patch: AdjudicationPatch): Promise<void> {
    this.init();
    const [idA, idB] = patch.alertId.split("|");
    const aid = alertId(idA, idB);
    const ts = new Date().toISOString();

    this.alerts = this.alerts.map((a) =>
      a.id === aid
        ? {
            ...a,
            status: patch.decision,
            lead_bureau: patch.lead_bureau,
            adjudicated_by: patch.adjudicated_by,
            adjudicated_at: ts,
            note: patch.note,
          }
        : a
    );

    if (patch.decision === "Dismissed (Distinct)") {
      this.dismissedPairs.add(aid);
    }

    if (patch.decision === "Confirmed Duplicate" && patch.lead_bureau) {
      this.complaints = this.complaints.map((c) => {
        if (c.id === idA || c.id === idB) {
          if (c.bureau !== patch.lead_bureau) {
            return { ...c, next_action: `Hold – lead bureau is ${patch.lead_bureau}` };
          }
        }
        return c;
      });
    }

    this.persist();
  }

  async insertComplaint(complaint: Complaint): Promise<boolean> {
    this.init();
    this.complaints.push(complaint);
    this.persist();
    return true;
  }

  async setFlaggedState(complaintId: string, flagged: boolean): Promise<void> {
    this.init();
    const c = this.complaints.find((x) => x.id === complaintId);
    if (c) {
      c.is_overlap_flagged = flagged;
      this.persist();
    }
  }

  reset(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_COMPLAINTS);
      localStorage.removeItem(LS_AUDIT);
      localStorage.removeItem(LS_ALERTS);
      localStorage.removeItem(LS_DISMISSED);
    }
    this.initialized = false;
    this.init();
  }
}

// ── Supabase Repository ────────────────────────────────────────────────────

class SupabaseRepo implements Repo {
  readonly mode = "supabase" as const;

  async loadAll(): Promise<LoadAllResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // 1. Fetch institutions
    const { data: instData, error: instError } = await supabase
      .from("institutions")
      .select("*")
      .order("name");
    if (instError) {
      console.error("Failed to load institutions:", instError);
      throw instError;
    }

    // 2. Fetch complaints through complaints_view (respects RLS masking)
    const { data: compData, error: compError } = await supabase
      .from("complaints_view")
      .select("*")
      .order("date_received", { ascending: false });
    if (compError) {
      console.warn("Notice: Failed to load complaints_view (possibly unauthenticated public tracker or RLS), falling back to memory:", compError.message);
      return memoryRepo.loadAll();
    }

    // 3. Fetch audit trail
    const { data: auditData, error: auditError } = await supabase
      .from("audit_trail")
      .select("*")
      .order("timestamp", { ascending: true });
    if (auditError) {
      console.error("Failed to load audit_trail:", auditError);
      throw auditError;
    }

    // 4. Fetch overlap alerts
    const { data: alertData, error: alertError } = await supabase
      .from("overlap_alerts")
      .select("*");
    if (alertError) {
      console.error("Failed to load overlap_alerts:", alertError);
      throw alertError;
    }

    const institutions: Institution[] = (instData ?? []).map((r) => ({
      id: r.id,
      aicte_id: r.aicte_id,
      name: r.name,
      region: r.region,
    }));

    const complaints: Complaint[] = (compData ?? []).map((r) =>
      mapDbComplaintToApp(r as DbComplaint)
    );

    const audit: AuditEntry[] = (auditData ?? []).map((r) =>
      mapDbAuditToApp(r as DbAuditEntry)
    );

    const alerts: OverlapAlert[] = (alertData ?? []).map((r) =>
      mapDbAlertToApp(r as DbOverlapAlert)
    );

    return { institutions, complaints, audit, alerts };
  }

  async updateComplaint(id: string, patch: UpdatePatch): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const updatePayload: Partial<DbComplaint> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.status) updatePayload.status = patch.status;
    if (patch.assigned_officer) updatePayload.assigned_officer = patch.assigned_officer;
    if (patch.next_action !== undefined) updatePayload.next_action = patch.next_action;

    const { error } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      console.error(`Failed to update complaint ${id}:`, error);
      throw error;
    }
    return true;
  }

  async transferComplaint(id: string, officer: string, bureau: Bureau): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase.rpc("transfer_complaint", {
      p_id: id,
      p_officer: officer,
      p_bureau: bureau,
    });

    if (error) {
      console.error(`RPC transfer_complaint failed for ${id}:`, error);
      throw error;
    }
    return true;
  }

  async addAudit(entry: AuditEntry): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase.from("audit_trail").insert({
      complaint_id: entry.complaint_id,
      action: entry.action,
      timestamp: entry.timestamp,
      officer: entry.officer,
      remarks: entry.remarks,
    });

    if (error) {
      console.warn("Failed to insert audit entry in Supabase, caching in memory:", error.message);
      await memoryRepo.addAudit(entry);
      return;
    }
  }

  async syncAlerts(detectedAlerts: OverlapAlert[]): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data: existingRows, error: fetchError } = await supabase
      .from("overlap_alerts")
      .select("*");
    if (fetchError) {
      console.error("Failed to fetch overlap_alerts for sync:", fetchError);
      return;
    }

    const existingAlerts = existingRows ?? [];
    const existingMap = new Map<string, DbOverlapAlert>();
    for (const row of existingAlerts) {
      const key = [row.complaint_a, row.complaint_b].sort().join("|");
      existingMap.set(key, row);
    }

    const detectedMap = new Map<string, OverlapAlert>();
    for (const d of detectedAlerts) {
      const [a, b] = [...d.complaint_ids].sort();
      detectedMap.set(`${a}|${b}`, d);
    }

    // 1. Insert new open alerts
    const toInsert: DbOverlapAlert[] = [];
    for (const [key, d] of detectedMap.entries()) {
      if (!existingMap.has(key)) {
        const [a, b] = key.split("|");
        toInsert.push({
          id: crypto.randomUUID(),
          complaint_a: a,
          complaint_b: b,
          reason: d.reason,
          score: d.score,
          same_institution: d.same_institution,
          status: "Open",
          lead_bureau: null,
          adjudicated_by: null,
          adjudicated_at: null,
          note: null,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("overlap_alerts")
        .insert(toInsert);
      if (insertError) {
        console.error("Failed to insert new overlap alerts:", insertError);
      }
    }

    // 2. Delete Open alerts that are no longer detected (never delete or overwrite adjudicated alerts)
    const idsToDelete: string[] = [];
    for (const [key, existing] of existingMap.entries()) {
      if (existing.status === "Open" && !detectedMap.has(key)) {
        idsToDelete.push(existing.id);
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("overlap_alerts")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) {
        console.error("Failed to delete cleared overlap alerts:", deleteError);
      }
    }
  }

  async adjudicateAlert(patch: AdjudicationPatch): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const [idA, idB] = patch.alertId.split("|").sort();
    const ts = new Date().toISOString();

    const { error: alertError } = await supabase
      .from("overlap_alerts")
      .update({
        status: patch.decision,
        lead_bureau: patch.lead_bureau ?? null,
        adjudicated_by: patch.adjudicated_by,
        adjudicated_at: ts,
        note: patch.note,
      })
      .eq("complaint_a", idA)
      .eq("complaint_b", idB);

    if (alertError) {
      console.error("Failed to adjudicate alert in Supabase:", alertError);
      throw alertError;
    }

    // If Confirmed Duplicate, set non-lead case on hold
    if (patch.decision === "Confirmed Duplicate" && patch.lead_bureau) {
      // Fetch both complaints to see which one is non-lead
      const { data: cases } = await supabase
        .from("complaints")
        .select("id, bureau")
        .in("id", [idA, idB]);

      if (cases) {
        for (const c of cases) {
          if (c.bureau !== patch.lead_bureau) {
            await supabase
              .from("complaints")
              .update({
                next_action: `Hold – lead bureau is ${patch.lead_bureau}`,
                updated_at: ts,
              })
              .eq("id", c.id);
          }
        }
      }
    }
  }

  async insertComplaint(complaint: Complaint): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const sla = getSla(complaint);
    const dbRow = mapAppComplaintToDb(complaint, sla.due);

    const { error } = await supabase.from("complaints").insert(dbRow);
    if (error) {
      console.warn("Notice: Supabase complaints insert returned code:", error.code, error.message);
      // If error is PGRST204 (column missing before migration 001_intake.sql is run), fallback gracefully:
      if (error.code === "PGRST204") {
        const baseRow: any = {
          id: dbRow.id,
          institution_id: dbRow.institution_id,
          bureau: dbRow.bureau,
          status: dbRow.status,
          category: dbRow.category,
          description: dbRow.description,
          date_received: dbRow.date_received,
          assigned_officer: dbRow.assigned_officer,
          next_action: dbRow.next_action,
          due_date: dbRow.due_date,
          is_overlap_flagged: dbRow.is_overlap_flagged,
          updated_at: dbRow.updated_at,
        };
        const { error: retryErr } = await supabase.from("complaints").insert(baseRow);
        if (retryErr) {
          console.warn("Base Supabase insert also failed, caching in local memory:", retryErr.message);
          await memoryRepo.insertComplaint(complaint);
          return true;
        }
        // Also save full extended complaint to memory for complete UI rendering
        await memoryRepo.insertComplaint(complaint);
        return true;
      }
      // If any other network/RLS issue in unauthenticated intake, save in memory so citizen filing succeeds
      await memoryRepo.insertComplaint(complaint);
      return true;
    }
    return true;
  }

  async setFlaggedState(complaintId: string, flagged: boolean): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase
      .from("complaints")
      .update({ is_overlap_flagged: flagged, updated_at: new Date().toISOString() })
      .eq("id", complaintId);
  }
}

export const memoryRepo = new MemoryRepo();
export const supabaseRepo = new SupabaseRepo();

export function getRepo(): Repo {
  const isSupabaseMode = process.env.NEXT_PUBLIC_DATA_MODE === "supabase";
  if (!isSupabaseMode) {
    return memoryRepo;
  }

  if (!isSupabaseConfigured()) {
    console.warn(
      "NEXT_PUBLIC_DATA_MODE is 'supabase' but NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Falling back to in-memory mode."
    );
    return memoryRepo;
  }

  return supabaseRepo;
}
