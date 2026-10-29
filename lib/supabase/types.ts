import type { Bureau, Complaint, Institution, AuditEntry, OverlapAlert, Status, Role, Channel, EvidenceFile } from "@/lib/mock";

export type DbRole = "admin" | "rb_officer" | "pgrc_officer" | "chairperson" | "institute" | "complainant";

export type DbProfile = {
  id: string;
  full_name: string;
  role: DbRole;
};

export type DbInstitution = {
  id: string;
  aicte_id: string;
  name: string;
  region: string;
  state?: string;
  district?: string;
  programmes?: string[];
};

export type DbComplaint = {
  id: string;
  tracking_id?: string | null;
  institution_id: string;
  bureau: Bureau;
  status: Status;
  category: string;
  channel?: Channel;
  description: string | null;
  date_received: string;
  assigned_officer: string;
  next_action: string | null;
  due_date: string | null;
  is_overlap_flagged: boolean;
  is_anonymous?: boolean;
  dynamic_fields?: any;
  evidence?: any;
  complainant_phone_last4?: string | null;
  anonymous_access_key?: string | null;
  embedding?: number[] | null;
  master_id?: string | null;
  is_merged?: boolean | null;
  merged_into_id?: string | null;
  merged_complaint_ids?: string[] | null;
  lead_bureau?: Bureau | null;
  routing_confidence?: number | null;
  routing_rationale?: string | null;
  is_triage?: boolean | null;
  decision_type?: string | null;
  updated_at?: string;
};

export type DbAuditEntry = {
  id?: string;
  complaint_id: string;
  action: string;
  timestamp: string;
  officer: string;
  remarks: string | null;
};

export type DbOverlapAlert = {
  id: string;
  complaint_a: string;
  complaint_b: string;
  reason: string;
  score: number;
  same_institution: boolean;
  status: "Open" | "Confirmed Duplicate" | "Dismissed (Distinct)";
  lead_bureau: Bureau | null;
  adjudicated_by: string | null;
  adjudicated_at: string | null;
  note: string | null;
};

export type DbCaseEvent = {
  id?: string;
  complaint_id: string;
  bureau: string;
  event_type: string;
  actor: string;
  title: string;
  description: string | null;
  is_internal: boolean;
  metadata?: any;
  created_at?: string;
};

export type DbInterBureauTask = {
  id: string;
  complaint_id: string;
  from_bureau: Bureau;
  to_bureau: Bureau;
  created_by: string;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  deadline: string;
  priority: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type DbConflictAlert = {
  id: string;
  institution_id: string;
  complaint_a_id: string;
  complaint_b_id: string;
  decision_a: string;
  decision_b: string;
  bureau_a: string;
  bureau_b: string;
  detected_at?: string;
  status: string;
  resolution_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
};

export type DbRoutingFeedback = {
  id?: string;
  complaint_id: string;
  predicted_bureau: string;
  assigned_bureau: string;
  confidence?: number | null;
  overridden_by: string;
  reason?: string | null;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: DbProfile;
        Update: Partial<DbProfile>;
        Relationships: [];
      };
      institutions: {
        Row: DbInstitution;
        Insert: DbInstitution;
        Update: Partial<DbInstitution>;
        Relationships: [];
      };
      complaints: {
        Row: DbComplaint;
        Insert: DbComplaint;
        Update: Partial<DbComplaint>;
        Relationships: [];
      };
      audit_trail: {
        Row: DbAuditEntry;
        Insert: Omit<DbAuditEntry, "id"> & { id?: string };
        Update: Partial<DbAuditEntry>;
        Relationships: [];
      };
      overlap_alerts: {
        Row: DbOverlapAlert;
        Insert: DbOverlapAlert;
        Update: Partial<DbOverlapAlert>;
        Relationships: [];
      };
      case_events: {
        Row: DbCaseEvent;
        Insert: DbCaseEvent;
        Update: Partial<DbCaseEvent>;
        Relationships: [];
      };
      inter_bureau_tasks: {
        Row: DbInterBureauTask;
        Insert: DbInterBureauTask;
        Update: Partial<DbInterBureauTask>;
        Relationships: [];
      };
      conflict_alerts: {
        Row: DbConflictAlert;
        Insert: DbConflictAlert;
        Update: Partial<DbConflictAlert>;
        Relationships: [];
      };
      routing_feedback: {
        Row: DbRoutingFeedback;
        Insert: DbRoutingFeedback;
        Update: Partial<DbRoutingFeedback>;
        Relationships: [];
      };
    };
    Views: {
      complaints_view: {
        Row: DbComplaint;
        Relationships: [];
      };
    };
    Functions: {
      transfer_complaint: {
        Args: {
          p_id: string;
          p_officer: string;
          p_bureau: Bureau;
        };
        Returns: void;
      };
    };
  };
};

/** Mappings between Supabase DB types and App Types */

export function mapDbRoleToAppRole(role: DbRole): Role {
  switch (role) {
    case "admin":
      return "Admin";
    case "rb_officer":
      return "RB Officer";
    case "pgrc_officer":
      return "PGRC Officer";
    case "chairperson":
      return "Chairperson";
    case "institute":
      return "Institute";
    case "complainant":
      return "Complainant";
    default:
      return "Admin";
  }
}

export function mapAppRoleToDbRole(role: Role): DbRole {
  switch (role) {
    case "Admin":
      return "admin";
    case "RB Officer":
      return "rb_officer";
    case "PGRC Officer":
      return "pgrc_officer";
    case "Chairperson":
      return "chairperson";
    case "Institute":
      return "institute";
    case "Complainant":
      return "complainant";
  }
}

export function mapDbComplaintToApp(row: DbComplaint): Complaint {
  return {
    id: row.id,
    tracking_id: row.tracking_id ?? undefined,
    institution_id: row.institution_id,
    bureau: row.bureau,
    status: row.status,
    category: row.category,
    channel: row.channel ?? "web",
    description: row.description,
    date_received: row.date_received,
    assigned_officer: row.assigned_officer,
    is_overlap_flagged: Boolean(row.is_overlap_flagged),
    overlap_links: [], // re-computed client-side by overlap engine
    next_action: row.next_action ?? "",
    is_anonymous: Boolean(row.is_anonymous),
    dynamic_fields: row.dynamic_fields ?? {},
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    complainant_phone_last4: row.complainant_phone_last4 ?? undefined,
    embedding: row.embedding ?? undefined,
    master_id: row.master_id ?? undefined,
    is_merged: Boolean(row.is_merged),
    merged_into_id: row.merged_into_id ?? undefined,
    merged_complaint_ids: row.merged_complaint_ids ?? undefined,
    lead_bureau: row.lead_bureau ?? undefined,
    routing_confidence: row.routing_confidence ?? undefined,
    routing_rationale: row.routing_rationale ?? undefined,
    is_triage: Boolean(row.is_triage),
    decision_type: row.decision_type ?? undefined,
  };
}

export function mapAppComplaintToDb(c: Complaint, dueDate?: string | null): DbComplaint {
  return {
    id: c.id,
    tracking_id: c.tracking_id ?? null,
    institution_id: c.institution_id,
    bureau: c.bureau,
    status: c.status,
    category: c.category,
    channel: c.channel,
    description: c.description,
    date_received: c.date_received,
    assigned_officer: c.assigned_officer,
    next_action: c.next_action || null,
    due_date: dueDate ?? null,
    is_overlap_flagged: c.is_overlap_flagged,
    is_anonymous: c.is_anonymous ?? false,
    dynamic_fields: c.dynamic_fields ?? {},
    evidence: c.evidence ?? [],
    complainant_phone_last4: c.complainant_phone_last4 ?? null,
    embedding: c.embedding ?? null,
    master_id: c.master_id ?? null,
    is_merged: c.is_merged ?? false,
    merged_into_id: c.merged_into_id ?? null,
    merged_complaint_ids: c.merged_complaint_ids ?? null,
    lead_bureau: c.lead_bureau ?? null,
    routing_confidence: c.routing_confidence ?? null,
    routing_rationale: c.routing_rationale ?? null,
    is_triage: c.is_triage ?? false,
    decision_type: c.decision_type ?? null,
  };
}

export function mapDbAuditToApp(row: DbAuditEntry): AuditEntry {
  return {
    complaint_id: row.complaint_id,
    action: row.action,
    timestamp: row.timestamp,
    officer: row.officer,
    remarks: row.remarks ?? "—",
  };
}

export function mapDbAlertToApp(row: DbOverlapAlert): OverlapAlert {
  const [a, b] = [row.complaint_a, row.complaint_b].sort();
  return {
    id: `${a}|${b}`,
    complaint_ids: [a, b],
    reason: row.reason,
    score: row.score,
    same_institution: row.same_institution,
    status: row.status,
    lead_bureau: row.lead_bureau ?? undefined,
    adjudicated_by: row.adjudicated_by ?? undefined,
    adjudicated_at: row.adjudicated_at ?? undefined,
    note: row.note ?? undefined,
  };
}

export function mapAppAlertToDb(alert: OverlapAlert): DbOverlapAlert {
  const [a, b] = [...alert.complaint_ids].sort();
  return {
    id: alert.id.includes("|") ? crypto.randomUUID() : alert.id,
    complaint_a: a,
    complaint_b: b,
    reason: alert.reason,
    score: alert.score,
    same_institution: alert.same_institution,
    status: alert.status,
    lead_bureau: alert.lead_bureau ?? null,
    adjudicated_by: alert.adjudicated_by ?? null,
    adjudicated_at: alert.adjudicated_at ?? null,
    note: alert.note ?? null,
  };
}
