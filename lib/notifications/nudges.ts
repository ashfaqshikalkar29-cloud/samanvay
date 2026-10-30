// ==============================================================================
// SAMANVAY: Proactive Nudge Engine (C. Proactive Nudges & Reminders)
// Evaluates deadlines, triggers automated reminders to institutes & complainants
// ==============================================================================

import { Complaint, DEMO_TODAY, Institution } from "../mock";
import { calculateStageSla } from "../sla-engine";
import { defaultNotificationService } from "./service";
import { NotificationRecord, ProactiveNudge } from "./types";

/**
 * Scans active complaints and determines which proactive reminders are due
 */
export function evaluateAndGenerateNudges(
  complaints: Complaint[],
  institutions: Institution[],
  referenceDate: string = DEMO_TODAY
): ProactiveNudge[] {
  const nudges: ProactiveNudge[] = [];

  for (const c of complaints) {
    if (c.status === "Disposed") continue;

    const sla = calculateStageSla(c, referenceDate);
    const inst = institutions.find((i) => i.id === c.institution_id);
    const trackingId = c.tracking_id || `SMV-2026-${c.id.replace(/\D/g, "").padStart(6, "0")}`;

    // 1. Show-Cause Stage Reminders to Institution (50% and 80% of statutory deadline)
    if (sla.stage === "Show-Cause" && !sla.isPaused) {
      if (sla.percentConsumed >= 80) {
        nudges.push({
          id: `nudge-sc80-${c.id}`,
          complaint_id: c.id,
          tracking_id: trackingId,
          target: "institute",
          type: "show_cause_80",
          trigger_reason: `Show-Cause statutory timer is at ${sla.percentConsumed}% (${sla.daysRemaining} days remaining).`,
          scheduled_at: referenceDate,
          dispatched: false,
          notification_payload: {
            complaint_id: c.id,
            tracking_id: trackingId,
            recipient_role: "institute",
            recipient_name: `Nodal Officer, ${inst?.name || "Institution"}`,
            recipient_contact: "compliance@institution.edu.in",
            channel: "email",
            title: `URGENT (80% SLA): AICTE Show-Cause Reply Due in ${sla.daysRemaining} Days`,
            message: `Docket ${c.id}: You have ${sla.daysRemaining} days remaining to submit a formal response before statutory penal proceedings commence under APH Chapter VII.`,
            priority: "high",
            action_url: `/complaint/${c.id}`,
          },
        });
      } else if (sla.percentConsumed >= 50) {
        nudges.push({
          id: `nudge-sc50-${c.id}`,
          complaint_id: c.id,
          tracking_id: trackingId,
          target: "institute",
          type: "show_cause_50",
          trigger_reason: `Show-Cause statutory timer reached 50% milestone (${sla.daysRemaining} days remaining).`,
          scheduled_at: referenceDate,
          dispatched: false,
          notification_payload: {
            complaint_id: c.id,
            tracking_id: trackingId,
            recipient_role: "institute",
            recipient_name: `Nodal Officer, ${inst?.name || "Institution"}`,
            recipient_contact: "compliance@institution.edu.in",
            channel: "email",
            title: `Statutory Reminder (50% SLA): AICTE Show-Cause Notice for ${c.id}`,
            message: `Kindly note that 50% of the statutory response period for Docket ${c.id} has elapsed. Target deadline: ${sla.targetDueDate}.`,
            priority: "normal",
            action_url: `/complaint/${c.id}`,
          },
        });
      }
    }

    // 2. Nudge to Citizen Complainant when information is awaited (paused docket)
    if (sla.isPaused) {
      nudges.push({
        id: `nudge-info-${c.id}`,
        complaint_id: c.id,
        tracking_id: trackingId,
        target: "complainant",
        type: "info_request",
        trigger_reason: `Grievance paused awaiting clarification or evidence: ${sla.pauseReason || "Documents needed"}`,
        scheduled_at: referenceDate,
        dispatched: false,
        notification_payload: {
          complaint_id: c.id,
          tracking_id: trackingId,
          recipient_role: "complainant",
          recipient_name: "Citizen Complainant",
          recipient_contact: "+91 98123 45678",
          channel: "sms",
          title: `Action Required: Additional Information for ${trackingId}`,
          message: `AICTE Samanvay: Clarification requested for grievance ${trackingId} (${sla.pauseReason || "additional evidence required"}). Please submit at https://samanvay.aicte.gov.in/track/${trackingId}`,
          priority: "high",
          action_url: `/track/${trackingId}`,
        },
      });
    }

    // 3. 100% or 200% SLA Breach Alert to Senior Officer / Chairperson
    if (sla.escalationLevel >= 2) {
      nudges.push({
        id: `nudge-breach-${c.id}`,
        complaint_id: c.id,
        tracking_id: trackingId,
        target: "officer",
        type: "sla_breach_warning",
        trigger_reason: `SLA breach level ${sla.escalationLevel} triggered (${sla.percentConsumed}% consumed)`,
        scheduled_at: referenceDate,
        dispatched: false,
        notification_payload: {
          complaint_id: c.id,
          tracking_id: trackingId,
          recipient_role: sla.escalationLevel === 3 ? "chairperson" : "officer",
          recipient_name: sla.escalationAuthority,
          recipient_contact: "leadership@aicte-india.org",
          channel: "in_app",
          title: `SLA ESCALATION: Docket ${c.id} exceeded statutory limit (${sla.percentConsumed}%)`,
          message: `Case ${c.id} against ${inst?.name || "Institute"} has breached statutory SLA. Immediate executive intervention requested.`,
          priority: sla.escalationLevel === 3 ? "emergency" : "high",
          action_url: `/complaint/${c.id}`,
        },
      });
    }
  }

  return nudges;
}

/**
 * Dispatches all pending proactive nudges through the notification service
 */
export async function dispatchProactiveNudges(
  nudges: ProactiveNudge[]
): Promise<NotificationRecord[]> {
  const dispatchedRecords: NotificationRecord[] = [];

  for (const nudge of nudges) {
    const record = await defaultNotificationService.sendNotification(nudge.notification_payload);
    nudge.dispatched = true;
    dispatchedRecords.push(record);
  }

  return dispatchedRecords;
}
