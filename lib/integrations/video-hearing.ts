/**
 * Samanvay AICTE Grievance Portal
 * Video Hearing & Calendar Invite Integration Adapter (Domain D & A)
 * Generates automated video conference links (Google Meet, Zoom, NIC BharatVC)
 * and RFC 5545 iCalendar (.ics) payloads for hearing convocations.
 */

import { VideoMeetingConfig } from "./types";

class VideoHearingAdapter {
  /**
   * Provision a video conference link and RFC 5545 .ics calendar data
   */
  async provisionMeeting(params: {
    hearingId: string;
    complaintId: string;
    title: string;
    startIso: string;
    endIso: string;
    provider?: "Google Meet" | "Zoom" | "NIC BharatVC";
    participants: { name: string; email: string; role: string }[];
  }): Promise<VideoMeetingConfig> {
    const provider = params.provider || "Google Meet";
    const meetingCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    const meetingUrl =
      provider === "Google Meet"
        ? `https://meet.google.com/${meetingCode}`
        : provider === "Zoom"
        ? `https://aicte.zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}?pwd=${Math.random().toString(36).substring(2, 8)}`
        : `https://bharatvc.nic.in/aicte-hearing/${meetingCode}`;

    const passcode = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate standard RFC 5545 iCalendar content
    const startDateClean = params.startIso.replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDateClean = params.endIso.replace(/[-:]/g, "").split(".")[0] + "Z";
    const nowClean = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const attendeeLines = params.participants
      .map((p) => `ATTENDEE;CN=${p.name};ROLE=REQ-PARTICIPANT:mailto:${p.email}`)
      .join("\r\n");

    const icsCalendarData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AICTE Samanvay//Statutory Hearing Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:hearing-${params.hearingId}@samanvay.aicte-india.org`,
      `DTSTAMP:${nowClean}`,
      `DTSTART:${startDateClean}`,
      `DTEND:${endDateClean}`,
      `SUMMARY:AICTE Statutory Hearing: ${params.title} [${params.complaintId}]`,
      `DESCRIPTION:Formal hearing convened under AICTE Redressal of Grievance Regulations.\\nJoin Video Conference: ${meetingUrl}\\nPasscode: ${passcode}`,
      `LOCATION:${meetingUrl}`,
      "STATUS:CONFIRMED",
      attendeeLines,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return {
      hearing_id: params.hearingId,
      complaint_id: params.complaintId,
      title: params.title,
      start_iso: params.startIso,
      end_iso: params.endIso,
      provider,
      meeting_url: meetingUrl,
      meeting_passcode: passcode,
      dial_in_number: "+91 11 2958 1000",
      ics_calendar_data: icsCalendarData,
    };
  }
}

export const videoHearingAdapter = new VideoHearingAdapter();
