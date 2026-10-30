// ==============================================================================
// SAMANVAY: Multi-Tier SLA Timer & Escalation Engine (A. Workflow & SLA)
// Per-stage countdown, pause on info requests, and 50%/100%/200% escalation ladder
// ==============================================================================

import { DEMO_TODAY, Complaint, Bureau } from "./mock";
import { defaultWorkflowEngine } from "./workflow/engine";
import { WorkflowStage } from "./workflow/types";

export type SlaTier =
  | "On track"
  | "Warning (50%)"
  | "Breach (100%)"
  | "Critical Breach (200%+)"
  | "Disposed / Closed";

export interface StageSlaInfo {
  complaint_id: string;
  stage: WorkflowStage;
  stageLimitDays: number;
  activeDaysElapsed: number;
  daysRemaining: number;
  percentConsumed: number;
  isPaused: boolean;
  pausedAt?: string;
  totalPausedHours: number;
  pauseReason?: string;
  tier: SlaTier;
  escalationLevel: 0 | 1 | 2 | 3; // 0=none, 1=Section Head (50%), 2=Bureau Head (100%), 3=Chairperson (200%)
  escalationAuthority: string;
  targetDueDate: string; // YYYY-MM-DD
  breachDate?: string;
  isOverdue: boolean;
}

export interface SlaTickResult {
  evaluatedCount: number;
  escalatedToSectionHead: string[];
  escalatedToBureauHead: string[];
  escalatedToChairperson: string[];
  pausedCount: number;
  summary: {
    onTrack: number;
    warning: number;
    breach: number;
    criticalBreach: number;
    closed: number;
  };
}

/**
 * Computes per-stage SLA metrics taking into account pause durations and workflow stages.
 */
export function calculateStageSla(
  c: Complaint,
  referenceDate: string = DEMO_TODAY
): StageSlaInfo {
  const currentStage: WorkflowStage =
    (c.dynamic_fields?._current_stage as WorkflowStage) ||
    (c.status === "Pending" ? "Scrutiny" : c.status === "In-Process" ? "Show-Cause" : "Disposed");

  if (c.status === "Disposed" || currentStage === "Disposed") {
    return {
      complaint_id: c.id,
      stage: "Disposed",
      stageLimitDays: 0,
      activeDaysElapsed: 0,
      daysRemaining: 0,
      percentConsumed: 0,
      isPaused: false,
      totalPausedHours: 0,
      tier: "Disposed / Closed",
      escalationLevel: 0,
      escalationAuthority: "None (Closed)",
      targetDueDate: c.date_received,
      isOverdue: false,
    };
  }

  // 1. Fetch workflow configuration for this category
  const wf = defaultWorkflowEngine.getWorkflowForCategory(c.category);
  const stageLimitDays = wf.defaultSlaDays[currentStage] || 15;

  // 2. Determine when current stage began
  const stageStartedAtStr = c.dynamic_fields?._stage_started_at || c.date_received;
  const stageStartMs = Date.parse(
    stageStartedAtStr.includes("T") ? stageStartedAtStr : `${stageStartedAtStr}T00:00:00Z`
  );
  const refMs = Date.parse(
    referenceDate.includes("T") ? referenceDate : `${referenceDate}T00:00:00Z`
  );

  // 3. Compute paused duration
  const isPaused = Boolean(c.dynamic_fields?.is_paused_awaiting_info);
  const pauseReason = c.dynamic_fields?.pause_reason || undefined;
  const pausedAt = c.dynamic_fields?.paused_at || undefined;
  let accumulatedPauseMs = Number(c.dynamic_fields?.total_paused_duration_ms || 0);

  if (isPaused && pausedAt) {
    const pausedAtMs = Date.parse(pausedAt);
    const activePauseMs = Math.max(0, refMs - pausedAtMs);
    accumulatedPauseMs += activePauseMs;
  }

  const totalPausedHours = Math.round(accumulatedPauseMs / 3_600_000);

  // 4. Compute active elapsed days (excluding pause)
  const grossElapsedMs = Math.max(0, refMs - stageStartMs);
  const netElapsedMs = Math.max(0, grossElapsedMs - accumulatedPauseMs);
  const activeDaysElapsed = Math.round((netElapsedMs / 86_400_000) * 10) / 10;

  // 5. Compute days remaining and percentage consumed
  const daysRemaining = Math.round((stageLimitDays - activeDaysElapsed) * 10) / 10;
  const percentConsumed = Math.round((activeDaysElapsed / Math.max(1, stageLimitDays)) * 100);

  // 6. Target Due Date
  const dueMs = stageStartMs + accumulatedPauseMs + stageLimitDays * 86_400_000;
  const targetDueDate = new Date(dueMs).toISOString().slice(0, 10);

  // 7. Multi-Tier Escalation Ladder
  let tier: SlaTier = "On track";
  let escalationLevel: 0 | 1 | 2 | 3 = 0;
  let escalationAuthority = "Assigned Officer";
  let breachDate: string | undefined = undefined;
  const isOverdue = daysRemaining < 0;

  if (percentConsumed >= 200) {
    tier = "Critical Breach (200%+)";
    escalationLevel = 3;
    escalationAuthority = "Prof. T. G. Sitharam (Chairperson)";
    breachDate = targetDueDate;
  } else if (percentConsumed >= 100) {
    tier = "Breach (100%)";
    escalationLevel = 2;
    escalationAuthority = c.bureau === "RB" ? "Advisor (Approval Bureau)" : "Advisor (PGRC Bureau)";
    breachDate = targetDueDate;
  } else if (percentConsumed >= 50) {
    tier = "Warning (50%)";
    escalationLevel = 1;
    escalationAuthority = "Section Head / Assistant Director";
  }

  return {
    complaint_id: c.id,
    stage: currentStage,
    stageLimitDays,
    activeDaysElapsed,
    daysRemaining,
    percentConsumed,
    isPaused,
    pausedAt,
    totalPausedHours,
    pauseReason,
    tier,
    escalationLevel,
    escalationAuthority,
    targetDueDate,
    breachDate,
    isOverdue,
  };
}

/**
 * Pauses SLA timer when waiting for information from institute or complainant.
 */
export function pauseSla(
  c: Complaint,
  reason: string,
  nowIso: string = new Date().toISOString()
): Partial<Complaint> {
  const dynamic_fields = {
    ...(c.dynamic_fields || {}),
    is_paused_awaiting_info: true,
    paused_at: nowIso,
    pause_reason: reason,
  };
  return { dynamic_fields };
}

/**
 * Resumes SLA timer when required information is submitted.
 */
export function resumeSla(
  c: Complaint,
  nowIso: string = new Date().toISOString()
): Partial<Complaint> {
  const pausedAt = c.dynamic_fields?.paused_at;
  let additionalPausedMs = 0;
  if (pausedAt) {
    additionalPausedMs = Math.max(0, Date.parse(nowIso) - Date.parse(pausedAt));
  }
  const currentTotal = Number(c.dynamic_fields?.total_paused_duration_ms || 0);

  const dynamic_fields = {
    ...(c.dynamic_fields || {}),
    is_paused_awaiting_info: false,
    paused_at: undefined,
    pause_reason: undefined,
    total_paused_duration_ms: currentTotal + additionalPausedMs,
  };
  return { dynamic_fields };
}

/**
 * Executes an automated SLA tick across all active complaints and reports escalations.
 */
export function runSlaTick(
  complaints: Complaint[],
  referenceDate: string = DEMO_TODAY
): SlaTickResult {
  const result: SlaTickResult = {
    evaluatedCount: 0,
    escalatedToSectionHead: [],
    escalatedToBureauHead: [],
    escalatedToChairperson: [],
    pausedCount: 0,
    summary: {
      onTrack: 0,
      warning: 0,
      breach: 0,
      criticalBreach: 0,
      closed: 0,
    },
  };

  for (const c of complaints) {
    result.evaluatedCount++;
    const sla = calculateStageSla(c, referenceDate);

    if (sla.isPaused) {
      result.pausedCount++;
    }

    switch (sla.tier) {
      case "On track":
        result.summary.onTrack++;
        break;
      case "Warning (50%)":
        result.summary.warning++;
        result.escalatedToSectionHead.push(c.id);
        break;
      case "Breach (100%)":
        result.summary.breach++;
        result.escalatedToBureauHead.push(c.id);
        break;
      case "Critical Breach (200%+)":
        result.summary.criticalBreach++;
        result.escalatedToChairperson.push(c.id);
        break;
      case "Disposed / Closed":
        result.summary.closed++;
        break;
    }
  }

  return result;
}
