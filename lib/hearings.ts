/**
 * Samanvay AICTE Grievance Portal
 * Hearing Scheduler & Conflict Detection Engine (Domain A)
 * Manages statutory hearings, participant calendar conflict detection,
 * automatic video conference provisioning, and formal Minutes of Hearing (MOH) recording.
 */

import { videoHearingAdapter } from "@/lib/integrations/video-hearing";
import { VideoMeetingConfig } from "@/lib/integrations/types";
import { auditChain } from "@/lib/security/audit-chain";

export interface HearingParticipant {
  name: string;
  email: string;
  role: "Complainant" | "Principal / Institute Head" | "AICTE Hearing Officer" | "Ombudsman" | "Subject Expert";
  attendance_status: "Invited" | "Confirmed" | "Attended" | "Absent";
}

export interface HearingRecord {
  id: string;
  complaint_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  mode: "Video" | "Physical" | "Hybrid";
  venue_or_link: string;
  status: "Scheduled" | "In-Progress" | "Adjourned" | "Concluded" | "Cancelled";
  presiding_officer: string;
  participants: HearingParticipant[];
  video_config?: VideoMeetingConfig;
  minutes_of_hearing?: string;
  outcome_order?: string;
  scheduled_at: string;
  concluded_at?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingHearing?: HearingRecord;
  conflictedParticipant?: string;
  reason?: string;
}

class HearingManager {
  private hearings = new Map<string, HearingRecord>();

  constructor() {
    // Seed initial sample hearing
    const sampleId = "HRG-2026-001";
    this.hearings.set(sampleId, {
      id: sampleId,
      complaint_id: "C-1001",
      title: "Statutory Examination of Arbitrary Fee Structure & Refund Dispute",
      date: "2026-11-05",
      start_time: "11:00",
      end_time: "12:00",
      mode: "Video",
      venue_or_link: "https://meet.google.com/aic-tehr-pgr",
      status: "Scheduled",
      presiding_officer: "Dr. Rajesh Verma (Regional Officer)",
      participants: [
        { name: "Ananya Sharma", email: "ananya.sharma@gmail.com", role: "Complainant", attendance_status: "Confirmed" },
        { name: "Dr. S. K. Patil (Principal)", email: "principal@sahyadri.edu", role: "Principal / Institute Head", attendance_status: "Invited" },
        { name: "Prof. N. K. Sharma", email: "ombudsman.wro@aicte-india.org", role: "Ombudsman", attendance_status: "Confirmed" },
      ],
      scheduled_at: "2026-10-28T09:00:00Z",
    });
  }

  /**
   * Check whether any proposed participant or presiding officer has a schedule conflict
   */
  checkForConflicts(
    date: string,
    startTime: string,
    endTime: string,
    participants: HearingParticipant[],
    presidingOfficer: string,
    excludeHearingId?: string
  ): ConflictCheckResult {
    const existing = Array.from(this.hearings.values()).filter(
      (h) => h.date === date && h.status !== "Cancelled" && h.id !== excludeHearingId
    );

    const proposedStart = this.timeToMinutes(startTime);
    const proposedEnd = this.timeToMinutes(endTime);

    for (const hearing of existing) {
      const hStart = this.timeToMinutes(hearing.start_time);
      const hEnd = this.timeToMinutes(hearing.end_time);

      // Check time overlap: (StartA < EndB) and (EndA > StartB)
      const timeOverlaps = proposedStart < hEnd && proposedEnd > hStart;

      if (timeOverlaps) {
        // Check presiding officer conflict
        if (hearing.presiding_officer.toLowerCase() === presidingOfficer.toLowerCase()) {
          return {
            hasConflict: true,
            conflictingHearing: hearing,
            conflictedParticipant: presidingOfficer,
            reason: `Presiding Officer '${presidingOfficer}' is already scheduled for Hearing ${hearing.id} (${hearing.start_time} - ${hearing.end_time}).`,
          };
        }

        // Check participant conflict
        for (const p of participants) {
          const matched = hearing.participants.find(
            (hp) => hp.email.toLowerCase() === p.email.toLowerCase() || hp.name.toLowerCase() === p.name.toLowerCase()
          );
          if (matched) {
            return {
              hasConflict: true,
              conflictingHearing: hearing,
              conflictedParticipant: p.name,
              reason: `Participant '${p.name}' is already booked in Hearing ${hearing.id} on ${date} (${hearing.start_time} - ${hearing.end_time}).`,
            };
          }
        }
      }
    }

    return { hasConflict: false };
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, mins] = timeStr.split(":").map(Number);
    return hours * 60 + (mins || 0);
  }

  /**
   * Schedule a new hearing with automated video meeting provisioning and conflict prevention
   */
  async scheduleHearing(params: {
    complaintId: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    mode: "Video" | "Physical" | "Hybrid";
    presidingOfficer: string;
    participants: HearingParticipant[];
  }): Promise<{ hearing: HearingRecord; conflictWarning?: string }> {
    const conflict = this.checkForConflicts(
      params.date,
      params.startTime,
      params.endTime,
      params.participants,
      params.presidingOfficer
    );

    if (conflict.hasConflict) {
      throw new Error(`Hearing Scheduling Conflict: ${conflict.reason}`);
    }

    const hearingId = `HRG-2026-${Date.now().toString().slice(-4)}`;
    let videoConfig: VideoMeetingConfig | undefined = undefined;
    let venueOrLink = "AICTE Regional Headquarters Hearing Chamber";

    if (params.mode === "Video" || params.mode === "Hybrid") {
      const startIso = `${params.date}T${params.startTime}:00.000Z`;
      const endIso = `${params.date}T${params.endTime}:00.000Z`;

      videoConfig = await videoHearingAdapter.provisionMeeting({
        hearingId,
        complaintId: params.complaintId,
        title: params.title,
        startIso,
        endIso,
        provider: "Google Meet",
        participants: params.participants,
      });

      venueOrLink = videoConfig.meeting_url;
    }

    const hearing: HearingRecord = {
      id: hearingId,
      complaint_id: params.complaintId,
      title: params.title,
      date: params.date,
      start_time: params.startTime,
      end_time: params.endTime,
      mode: params.mode,
      venue_or_link: venueOrLink,
      status: "Scheduled",
      presiding_officer: params.presidingOfficer,
      participants: params.participants,
      video_config: videoConfig,
      scheduled_at: new Date().toISOString(),
    };

    this.hearings.set(hearingId, hearing);

    // Cryptographic audit entry
    auditChain.appendBlock(
      params.complaintId,
      "HEARING_CONVENED",
      { id: "officer", name: params.presidingOfficer, role: "RB Officer" },
      { hearingId, date: params.date, time: `${params.startTime}-${params.endTime}`, mode: params.mode, participants: params.participants.length }
    );

    return { hearing };
  }

  /**
   * Record Minutes of Hearing (MOH) and final decision order
   */
  async recordHearingMinutes(
    hearingId: string,
    minutes: string,
    outcomeOrder?: string
  ): Promise<HearingRecord | null> {
    const hearing = this.hearings.get(hearingId);
    if (!hearing) return null;

    hearing.minutes_of_hearing = minutes;
    if (outcomeOrder) {
      hearing.outcome_order = outcomeOrder;
      hearing.status = "Concluded";
      hearing.concluded_at = new Date().toISOString();
    }

    auditChain.appendBlock(
      hearing.complaint_id,
      "HEARING_MINUTES_RECORDED",
      { id: "officer", name: hearing.presiding_officer, role: "RB Officer" },
      { hearingId, status: hearing.status, outcome: outcomeOrder ? "Order Issued" : "MOH Recorded" }
    );

    return hearing;
  }

  getHearingsForComplaint(complaintId: string): HearingRecord[] {
    return Array.from(this.hearings.values()).filter((h) => h.complaint_id === complaintId);
  }

  getAllHearings(): HearingRecord[] {
    return Array.from(this.hearings.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const hearingManager = new HearingManager();
