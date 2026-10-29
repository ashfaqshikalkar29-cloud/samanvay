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
import { CaseEvent, SEED_CASE_EVENTS } from "@/lib/timeline";
import { InterBureauTask, SEED_INTER_BUREAU_TASKS } from "@/lib/tasks";
import { ConflictAlert, SEED_CONFLICT_ALERTS, detectConflicts } from "@/lib/conflicts";
import { RoutingFeedbackRecord } from "@/lib/classifier";
import { FraudEvaluation, AICorrectionLog } from "@/lib/ai/types";
import { defaultFraudEngine } from "@/lib/ai/fraud";

export interface UpdatePatch {
  category?: string;
  status?: Complaint["status"];
  assigned_officer?: string;
  remark?: string;
  next_action?: string;
  ai_predictions?: any;
  ai_summary?: any;
  has_distress?: boolean;
  distress_details?: any;
  fraud_score?: number;
  fraud_evaluation?: any;
  urgency?: "low" | "medium" | "high" | "critical";
  legal_risk?: boolean;
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

  // Phase 2 Intelligence Methods
  getEvents(complaintId: string): Promise<CaseEvent[]>;
  addEvent(event: CaseEvent): Promise<void>;
  getTasks(filter?: { bureau?: Bureau; complaintId?: string }): Promise<InterBureauTask[]>;
  createTask(task: InterBureauTask): Promise<void>;
  updateTaskStatus(taskId: string, status: InterBureauTask["status"], officer?: string): Promise<void>;
  getConflicts(): Promise<ConflictAlert[]>;
  resolveConflict(conflictId: string, resolution: { notes: string; resolved_by: string }): Promise<void>;
  mergeComplaints(masterId: string, childIds: string[], leadBureau: Bureau, officer: string): Promise<boolean>;
  unmergeComplaint(childId: string, officer: string): Promise<boolean>;
  recordRoutingFeedback(feedback: RoutingFeedbackRecord): Promise<void>;

  // Phase 3 AI & Automation Methods
  getSuspiciousComplaints(): Promise<FraudEvaluation[]>;
  reviewFraudCase(complaintId: string, decision: "cleared_legitimate" | "confirmed_spam", officer: string): Promise<void>;
  recordAICorrection(correction: AICorrectionLog): Promise<void>;
}

// ── In-Memory Repository (with localStorage persistence) ────────────────────

const LS_COMPLAINTS = "sam_complaints";
const LS_AUDIT = "sam_audit";
const LS_ALERTS = "sam_alerts";
const LS_DISMISSED = "sam_dismissed";
const LS_EVENTS = "sam_case_events";
const LS_TASKS = "sam_inter_tasks";
const LS_CONFLICTS = "sam_conflicts";
const LS_FEEDBACK = "sam_routing_feedback";
const LS_FRAUD = "sam_fraud_evaluations";
const LS_CORRECTIONS = "sam_ai_corrections";

export const SEED_FRAUD_EVALUATIONS: FraudEvaluation[] = [
  {
    complaint_id: "C-1016",
    overall_score: 92,
    risk_tier: "fraud_spam",
    bot_probability: 0.95,
    toxicity_score: 0.88,
    coordinated_campaign_flag: true,
    signals: [
      "Spam / automated test filler pattern detected",
      "Toxic / abusive language patterns identified",
      "Excessive repeated characters / gibberish",
      "Coordinated campaign pattern: 4 submissions from same /24 subnet within 24h",
    ],
    detected_at: "2026-10-23T14:22:00Z",
    submission_source: {
      ip_subnet: "192.168.4.x",
      device_hash: "dev-f89a2b",
      phone_prefix: "9999",
    },
    review_status: "pending",
  },
  {
    complaint_id: "C-1002",
    overall_score: 68,
    risk_tier: "suspicious",
    bot_probability: 0.25,
    toxicity_score: 0.72,
    coordinated_campaign_flag: true,
    signals: [
      "High volume burst: 3 similar grievances targeting inst-1 within 48h",
      "Elevated pressure keywords detected",
    ],
    detected_at: "2026-10-10T09:15:00Z",
    submission_source: {
      ip_subnet: "10.0.12.x",
      device_hash: "dev-c14a90",
      phone_prefix: "4421",
    },
    review_status: "pending",
  },
  {
    complaint_id: "C-1007",
    overall_score: 55,
    risk_tier: "suspicious",
    bot_probability: 0.15,
    toxicity_score: 0.40,
    coordinated_campaign_flag: false,
    signals: [
      "Unusual submission channel burst (WhatsApp gateway webhook anomaly)",
    ],
    detected_at: "2026-10-16T11:00:00Z",
    submission_source: {
      ip_subnet: "172.16.8.x",
      device_hash: "dev-e223b1",
      phone_prefix: "5542",
    },
    review_status: "cleared_legitimate",
    reviewed_by: "Ms. R. Iyer",
    reviewed_at: "2026-10-17T10:00:00Z",
  },
];

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
  private events: CaseEvent[] = [];
  private tasks: InterBureauTask[] = [];
  private conflicts: ConflictAlert[] = [];
  private feedbacks: RoutingFeedbackRecord[] = [];
  private fraudEvaluations: FraudEvaluation[] = [];
  private aiCorrections: AICorrectionLog[] = [];
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
        const se = localStorage.getItem(LS_EVENTS);
        const st = localStorage.getItem(LS_TASKS);
        const scf = localStorage.getItem(LS_CONFLICTS);
        const sfb = localStorage.getItem(LS_FEEDBACK);
        const sfr = localStorage.getItem(LS_FRAUD);
        const scr = localStorage.getItem(LS_CORRECTIONS);

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
        this.events = se ? JSON.parse(se) : [...SEED_CASE_EVENTS];
        this.tasks = st ? JSON.parse(st) : [...SEED_INTER_BUREAU_TASKS];
        this.conflicts = scf ? JSON.parse(scf) : [...SEED_CONFLICT_ALERTS];
        this.feedbacks = sfb ? JSON.parse(sfb) : [];
        this.fraudEvaluations = sfr ? JSON.parse(sfr) : [...SEED_FRAUD_EVALUATIONS];
        this.aiCorrections = scr ? JSON.parse(scr) : [];
      } catch {
        this.complaints = initialComplaints;
        this.audit = initialAudit;
        this.alerts = initialAlerts;
        this.events = [...SEED_CASE_EVENTS];
        this.tasks = [...SEED_INTER_BUREAU_TASKS];
        this.conflicts = [...SEED_CONFLICT_ALERTS];
        this.feedbacks = [];
        this.fraudEvaluations = [...SEED_FRAUD_EVALUATIONS];
        this.aiCorrections = [];
      }
    } else {
      this.complaints = initialComplaints;
      this.audit = initialAudit;
      this.alerts = initialAlerts;
      this.events = [...SEED_CASE_EVENTS];
      this.tasks = [...SEED_INTER_BUREAU_TASKS];
      this.conflicts = [...SEED_CONFLICT_ALERTS];
      this.feedbacks = [];
      this.fraudEvaluations = [...SEED_FRAUD_EVALUATIONS];
      this.aiCorrections = [];
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
      localStorage.setItem(LS_EVENTS, JSON.stringify(this.events));
      localStorage.setItem(LS_TASKS, JSON.stringify(this.tasks));
      localStorage.setItem(LS_CONFLICTS, JSON.stringify(this.conflicts));
      localStorage.setItem(LS_FEEDBACK, JSON.stringify(this.feedbacks));
      localStorage.setItem(LS_FRAUD, JSON.stringify(this.fraudEvaluations));
      localStorage.setItem(LS_CORRECTIONS, JSON.stringify(this.aiCorrections));
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
    const newStatus = patch.status ?? target.status;
    const newOfficer = patch.assigned_officer ?? target.assigned_officer;
    const newNextAction = patch.next_action !== undefined ? patch.next_action : target.next_action;

    this.complaints[idx] = {
      ...target,
      category: patch.category !== undefined ? patch.category : target.category,
      status: newStatus,
      assigned_officer: newOfficer,
      next_action: newNextAction,
      ai_predictions: patch.ai_predictions !== undefined ? patch.ai_predictions : target.ai_predictions,
      ai_summary: patch.ai_summary !== undefined ? patch.ai_summary : target.ai_summary,
      has_distress: patch.has_distress !== undefined ? patch.has_distress : target.has_distress,
      distress_details: patch.distress_details !== undefined ? patch.distress_details : target.distress_details,
      fraud_score: patch.fraud_score !== undefined ? patch.fraud_score : target.fraud_score,
      fraud_evaluation: patch.fraud_evaluation !== undefined ? patch.fraud_evaluation : target.fraud_evaluation,
      urgency: patch.urgency !== undefined ? patch.urgency : target.urgency,
      legal_risk: patch.legal_risk !== undefined ? patch.legal_risk : target.legal_risk,
    };

    // Auto-mirror updates to merged child cases
    if (target.merged_complaint_ids && target.merged_complaint_ids.length > 0) {
      for (let j = 0; j < this.complaints.length; j++) {
        if (this.complaints[j].master_id === target.id) {
          this.complaints[j] = {
            ...this.complaints[j],
            status: newStatus,
            next_action: `Mirrored from master ${target.id}: ${newNextAction}`,
          };
        }
      }
    }

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

  async getEvents(complaintId: string): Promise<CaseEvent[]> {
    this.init();
    return this.events
      .filter((e) => e.complaint_id === complaintId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async addEvent(event: CaseEvent): Promise<void> {
    this.init();
    this.events.unshift(event);
    this.persist();
  }

  async getTasks(filter?: { bureau?: Bureau; complaintId?: string }): Promise<InterBureauTask[]> {
    this.init();
    let res = [...this.tasks];
    if (filter?.bureau) {
      res = res.filter((t) => t.to_bureau === filter.bureau || t.from_bureau === filter.bureau);
    }
    if (filter?.complaintId) {
      res = res.filter((t) => t.complaint_id === filter.complaintId);
    }
    return res.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  async createTask(task: InterBureauTask): Promise<void> {
    this.init();
    this.tasks.unshift(task);
    this.events.unshift({
      id: `evt-task-${task.id}`,
      complaint_id: task.complaint_id,
      bureau: task.from_bureau,
      event_type: "task",
      actor: task.created_by,
      title: `Task Delegated to ${task.to_bureau}: ${task.title}`,
      description: `Assigned to ${task.assigned_to}. Deadline: ${task.deadline}. Priority: ${task.priority.toUpperCase()}.`,
      created_at: task.created_at,
    });
    this.persist();
  }

  async updateTaskStatus(taskId: string, status: InterBureauTask["status"], officer = "Officer"): Promise<void> {
    this.init();
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const task = this.tasks[idx];
      const now = new Date().toISOString();
      this.tasks[idx] = {
        ...task,
        status,
        completed_at: status === "completed" ? now : undefined,
        completed_by: status === "completed" ? officer : undefined,
      };

      this.events.unshift({
        id: `evt-task-upd-${Date.now()}`,
        complaint_id: task.complaint_id,
        bureau: task.to_bureau,
        event_type: "task",
        actor: officer,
        title: `Task Status Updated to ${status.toUpperCase()}`,
        description: `Task "${task.title}" marked as ${status} by ${officer}.`,
        created_at: now,
      });

      this.persist();
    }
  }

  async getConflicts(): Promise<ConflictAlert[]> {
    this.init();
    const detected = detectConflicts(this.complaints, (id) => mockInstitutions.find((i) => i.id === id));
    const map = new Map<string, ConflictAlert>();
    for (const c of detected) map.set(c.id, c);
    for (const c of this.conflicts) map.set(c.id, c);
    return Array.from(map.values());
  }

  async resolveConflict(conflictId: string, resolution: { notes: string; resolved_by: string }): Promise<void> {
    this.init();
    const now = new Date().toISOString();
    const idx = this.conflicts.findIndex((c) => c.id === conflictId);
    let alert = idx !== -1 ? this.conflicts[idx] : null;

    if (!alert) {
      const detected = detectConflicts(this.complaints, (id) => mockInstitutions.find((i) => i.id === id));
      alert = detected.find((c) => c.id === conflictId) || null;
      if (alert) this.conflicts.push(alert);
    }

    if (alert) {
      alert.status = "Resolved";
      alert.resolved_by = resolution.resolved_by;
      alert.resolved_at = now;
      alert.resolution_notes = resolution.notes;

      for (const cid of alert.complaint_ids) {
        await this.addAudit({
          complaint_id: cid,
          action: "Conflict Resolved",
          timestamp: now,
          officer: resolution.resolved_by,
          remarks: `Regulatory contradiction resolved. Joint Directive: "${resolution.notes}".`,
        });

        this.events.unshift({
          id: `evt-conf-res-${Date.now()}-${cid}`,
          complaint_id: cid,
          bureau: "System",
          event_type: "conflict",
          actor: resolution.resolved_by,
          title: "Regulatory Contradiction Formally Resolved",
          description: resolution.notes,
          created_at: now,
        });
      }

      this.persist();
    }
  }

  async mergeComplaints(masterId: string, childIds: string[], leadBureau: Bureau, officer: string): Promise<boolean> {
    this.init();
    const masterIdx = this.complaints.findIndex((c) => c.id === masterId);
    if (masterIdx === -1) return false;

    const master = this.complaints[masterIdx];
    const now = new Date().toISOString();

    const existingChildren = master.merged_complaint_ids || [];
    const updatedChildren = Array.from(new Set([...existingChildren, ...childIds]));

    this.complaints[masterIdx] = {
      ...master,
      lead_bureau: leadBureau,
      merged_complaint_ids: updatedChildren,
      next_action: `Lead Bureau (${leadBureau}) proceedings active for ${updatedChildren.length + 1} consolidated cases.`,
    };

    for (const cid of childIds) {
      const cIdx = this.complaints.findIndex((c) => c.id === cid);
      if (cIdx !== -1) {
        this.complaints[cIdx] = {
          ...this.complaints[cIdx],
          master_id: masterId,
          is_merged: true,
          merged_into_id: masterId,
          lead_bureau: leadBureau,
          status: master.status,
          next_action: `Consolidated under Master Case ${masterId} (Lead Bureau: ${leadBureau}). Updates mirrored automatically.`,
        };

        await this.addAudit({
          complaint_id: cid,
          action: "Case Merged as Child",
          timestamp: now,
          officer,
          remarks: `Consolidated into Master Case ${masterId}. Lead Bureau: ${leadBureau}. Complainant record preserved.`,
        });

        this.events.unshift({
          id: `evt-merge-${Date.now()}-${cid}`,
          complaint_id: cid,
          bureau: leadBureau,
          event_type: "merge",
          actor: officer,
          title: `Merged into Master Case ${masterId}`,
          description: `Consolidated under lead bureau ${leadBureau}. Status and proceedings will mirror ${masterId}.`,
          created_at: now,
        });
      }
    }

    await this.addAudit({
      complaint_id: masterId,
      action: "Complaints Merged into Master",
      timestamp: now,
      officer,
      remarks: `Merged ${childIds.length} duplicate complaints (${childIds.join(", ")}) into this master case. Designated Lead Bureau: ${leadBureau}.`,
    });

    this.events.unshift({
      id: `evt-merge-master-${Date.now()}`,
      complaint_id: masterId,
      bureau: leadBureau,
      event_type: "merge",
      actor: officer,
      title: `Consolidated ${childIds.length} Duplicate Cases`,
      description: `Designated Lead Bureau: ${leadBureau}. Child cases: ${childIds.join(", ")}.`,
      created_at: now,
    });

    this.persist();
    return true;
  }

  async unmergeComplaint(childId: string, officer: string): Promise<boolean> {
    this.init();
    const childIdx = this.complaints.findIndex((c) => c.id === childId);
    if (childIdx === -1) return false;

    const child = this.complaints[childIdx];
    const masterId = child.master_id;
    const now = new Date().toISOString();

    this.complaints[childIdx] = {
      ...child,
      master_id: undefined,
      is_merged: false,
      merged_into_id: undefined,
      next_action: "Unmerged from master docket. Resumed independent bureau proceedings.",
    };

    if (masterId) {
      const masterIdx = this.complaints.findIndex((c) => c.id === masterId);
      if (masterIdx !== -1) {
        const master = this.complaints[masterIdx];
        this.complaints[masterIdx] = {
          ...master,
          merged_complaint_ids: (master.merged_complaint_ids || []).filter((id) => id !== childId),
        };
      }
    }

    await this.addAudit({
      complaint_id: childId,
      action: "Case Unmerged",
      timestamp: now,
      officer,
      remarks: `Unmerged from master case ${masterId || "—"}. Restored to independent proceeding.`,
    });

    this.events.unshift({
      id: `evt-unmerge-${Date.now()}-${childId}`,
      complaint_id: childId,
      bureau: child.bureau,
      event_type: "merge",
      actor: officer,
      title: "Case Unmerged from Master",
      description: `Detached from ${masterId}. Case restored to independent standing status.`,
      created_at: now,
    });

    this.persist();
    return true;
  }

  async recordRoutingFeedback(feedback: RoutingFeedbackRecord): Promise<void> {
    this.init();
    this.feedbacks.unshift(feedback);
    this.persist();
  }

  async getSuspiciousComplaints(): Promise<FraudEvaluation[]> {
    this.init();
    return [...this.fraudEvaluations];
  }

  async reviewFraudCase(complaintId: string, decision: "cleared_legitimate" | "confirmed_spam", officer: string): Promise<void> {
    this.init();
    const idx = this.fraudEvaluations.findIndex((f) => f.complaint_id === complaintId);
    if (idx !== -1) {
      this.fraudEvaluations[idx] = {
        ...this.fraudEvaluations[idx],
        review_status: decision,
        reviewed_by: officer,
        reviewed_at: new Date().toISOString(),
      };
    } else {
      this.fraudEvaluations.push({
        complaint_id: complaintId,
        overall_score: decision === "confirmed_spam" ? 95 : 20,
        risk_tier: decision === "confirmed_spam" ? "fraud_spam" : "clean",
        bot_probability: decision === "confirmed_spam" ? 0.9 : 0.1,
        toxicity_score: 0,
        coordinated_campaign_flag: false,
        signals: [decision === "confirmed_spam" ? "Manually confirmed spam / blocked by officer" : "Manually cleared legitimate by officer"],
        detected_at: new Date().toISOString(),
        review_status: decision,
        reviewed_by: officer,
        reviewed_at: new Date().toISOString(),
      });
    }

    // Mirror action onto the complaint record
    const cIdx = this.complaints.findIndex((c) => c.id === complaintId);
    if (cIdx !== -1) {
      if (decision === "confirmed_spam") {
        this.complaints[cIdx] = {
          ...this.complaints[cIdx],
          status: "Disposed",
          next_action: `Case Disposed: Confirmed spam / fraudulent submission by ${officer}`,
        };
      } else {
        this.complaints[cIdx] = {
          ...this.complaints[cIdx],
          next_action: `Cleared legitimate by ${officer}; active in standard queue`,
        };
      }
    }

    this.audit.push({
      complaint_id: complaintId,
      action: "Fraud Review Adjudicated",
      timestamp: new Date().toISOString(),
      officer,
      remarks: `Fraud review completed: ${decision}. Action taken: ${
        decision === "confirmed_spam" ? "Case marked as Disposed (Spam/Fraudulent)" : "Case cleared for standard queue processing"
      }.`,
    });

    this.events.unshift({
      id: `evt-fraud-${complaintId}-${Date.now()}`,
      complaint_id: complaintId,
      bureau: "System",
      event_type: "status_change",
      actor: officer,
      title: decision === "confirmed_spam" ? "Case Disposed as Spam / Fraudulent" : "Grievance Cleared as Legitimate",
      description: `Security review conducted by ${officer}. Verdict: ${decision}.`,
      created_at: new Date().toISOString(),
    });

    this.persist();
  }

  async recordAICorrection(correction: AICorrectionLog): Promise<void> {
    this.init();
    this.aiCorrections.unshift(correction);
    this.persist();
  }

  reset(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_COMPLAINTS);
      localStorage.removeItem(LS_AUDIT);
      localStorage.removeItem(LS_ALERTS);
      localStorage.removeItem(LS_DISMISSED);
      localStorage.removeItem(LS_EVENTS);
      localStorage.removeItem(LS_TASKS);
      localStorage.removeItem(LS_CONFLICTS);
      localStorage.removeItem(LS_FEEDBACK);
      localStorage.removeItem(LS_FRAUD);
      localStorage.removeItem(LS_CORRECTIONS);
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

  async getEvents(complaintId: string): Promise<CaseEvent[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.getEvents(complaintId);
    try {
      const { data, error } = await (supabase as any)
        .from("case_events")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: false });
      if (error || !data || data.length === 0) return memoryRepo.getEvents(complaintId);
      return data as CaseEvent[];
    } catch {
      return memoryRepo.getEvents(complaintId);
    }
  }

  async addEvent(event: CaseEvent): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.addEvent(event);
    try {
      const { error } = await (supabase as any).from("case_events").insert(event);
      if (error) await memoryRepo.addEvent(event);
    } catch {
      await memoryRepo.addEvent(event);
    }
  }

  async getTasks(filter?: { bureau?: Bureau; complaintId?: string }): Promise<InterBureauTask[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.getTasks(filter);
    try {
      let q = (supabase as any).from("inter_bureau_tasks").select("*");
      if (filter?.bureau) q = q.or(`to_bureau.eq.${filter.bureau},from_bureau.eq.${filter.bureau}`);
      if (filter?.complaintId) q = q.eq("complaint_id", filter.complaintId);
      const { data, error } = await q.order("deadline", { ascending: true });
      if (error || !data || data.length === 0) return memoryRepo.getTasks(filter);
      return data as InterBureauTask[];
    } catch {
      return memoryRepo.getTasks(filter);
    }
  }

  async createTask(task: InterBureauTask): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.createTask(task);
    try {
      const { error } = await (supabase as any).from("inter_bureau_tasks").insert(task);
      if (error) await memoryRepo.createTask(task);
    } catch {
      await memoryRepo.createTask(task);
    }
  }

  async updateTaskStatus(taskId: string, status: InterBureauTask["status"], officer = "Officer"): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.updateTaskStatus(taskId, status, officer);
    try {
      const now = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("inter_bureau_tasks")
        .update({
          status,
          completed_at: status === "completed" ? now : null,
          completed_by: status === "completed" ? officer : null,
        })
        .eq("id", taskId);
      if (error) await memoryRepo.updateTaskStatus(taskId, status, officer);
    } catch {
      await memoryRepo.updateTaskStatus(taskId, status, officer);
    }
  }

  async getConflicts(): Promise<ConflictAlert[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.getConflicts();
    try {
      const { data, error } = await (supabase as any).from("conflict_alerts").select("*");
      if (error || !data || data.length === 0) return memoryRepo.getConflicts();
      return data as ConflictAlert[];
    } catch {
      return memoryRepo.getConflicts();
    }
  }

  async resolveConflict(conflictId: string, resolution: { notes: string; resolved_by: string }): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.resolveConflict(conflictId, resolution);
    try {
      const { error } = await (supabase as any)
        .from("conflict_alerts")
        .update({
          status: "Resolved",
          resolved_by: resolution.resolved_by,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution.notes,
        })
        .eq("id", conflictId);
      if (error) await memoryRepo.resolveConflict(conflictId, resolution);
    } catch {
      await memoryRepo.resolveConflict(conflictId, resolution);
    }
  }

  async mergeComplaints(masterId: string, childIds: string[], leadBureau: Bureau, officer: string): Promise<boolean> {
    await memoryRepo.mergeComplaints(masterId, childIds, leadBureau, officer);
    return true;
  }

  async unmergeComplaint(childId: string, officer: string): Promise<boolean> {
    await memoryRepo.unmergeComplaint(childId, officer);
    return true;
  }

  async recordRoutingFeedback(feedback: RoutingFeedbackRecord): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return memoryRepo.recordRoutingFeedback(feedback);
    try {
      const { error } = await (supabase as any).from("routing_feedback").insert(feedback);
      if (error) await memoryRepo.recordRoutingFeedback(feedback);
    } catch {
      await memoryRepo.recordRoutingFeedback(feedback);
    }
  }

  async getSuspiciousComplaints(): Promise<FraudEvaluation[]> {
    return memoryRepo.getSuspiciousComplaints();
  }

  async reviewFraudCase(complaintId: string, decision: "cleared_legitimate" | "confirmed_spam", officer: string): Promise<void> {
    return memoryRepo.reviewFraudCase(complaintId, decision, officer);
  }

  async recordAICorrection(correction: AICorrectionLog): Promise<void> {
    return memoryRepo.recordAICorrection(correction);
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
