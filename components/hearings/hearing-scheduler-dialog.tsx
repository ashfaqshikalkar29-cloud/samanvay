"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  Users,
  AlertTriangle,
  CheckCircle2,
  Download,
  Building2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HearingRecord, HearingParticipant } from "@/lib/hearings";

export function HearingSchedulerDialog({
  complaintId,
  userRole = "RB Officer",
  onScheduled,
  onClose,
}: {
  complaintId: string;
  userRole?: string;
  onScheduled?: (hearing: HearingRecord) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("Statutory Inquiry & Hearing on Grievance Merits");
  const [date, setDate] = useState("2026-11-08");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [mode, setMode] = useState<"Video" | "Physical" | "Hybrid">("Video");
  const [presidingOfficer, setPresidingOfficer] = useState("Dr. Rajesh Verma (Regional Officer)");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledHearing, setScheduledHearing] = useState<HearingRecord | null>(null);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const participants: HearingParticipant[] = [
      { name: "Complainant Citizen", email: "citizen@example.com", role: "Complainant", attendance_status: "Invited" },
      { name: "Principal / Registrar", email: "principal@institute.edu", role: "Principal / Institute Head", attendance_status: "Invited" },
      { name: "Prof. N. K. Sharma", email: "ombudsman@aicte-india.org", role: "Ombudsman", attendance_status: "Confirmed" },
    ];

    try {
      const res = await fetch("/api/hearings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          complaint_id: complaintId,
          title,
          date,
          start_time: startTime,
          end_time: endTime,
          mode,
          presiding_officer: presidingOfficer,
          participants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to schedule statutory hearing.");
        return;
      }

      setScheduledHearing(data.hearing);
      if (onScheduled) {
        onScheduled(data.hearing);
      }
    } catch (err: any) {
      setError(err.message || "Network error scheduling hearing.");
    } finally {
      setLoading(false);
    }
  };

  const downloadIcs = () => {
    if (!scheduledHearing?.video_config?.ics_calendar_data) return;
    const blob = new Blob([scheduledHearing.video_config.ics_calendar_data], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hearing-${scheduledHearing.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Convene Statutory Grievance Hearing</h2>
              <p className="text-xs text-slate-400">
                AICTE Redressal of Grievance Regulations | Docket: <span className="font-mono text-white">{complaintId}</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
          >
            Cancel
          </Button>
        </div>

        <div className="p-6">
          {scheduledHearing ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Statutory Hearing Successfully Scheduled & Calendar Convocations Dispatched!
                </div>
                <p>
                  Hearing ID: <span className="font-mono font-bold">{scheduledHearing.id}</span> · Presided by {scheduledHearing.presiding_officer}
                </p>
              </div>

              {/* Video Conference Details */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-blue-900" /> Automated Video Hearing Link:
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {scheduledHearing.video_config?.provider || "Google Meet"}
                  </Badge>
                </div>
                <a
                  href={scheduledHearing.venue_or_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-900 font-bold block truncate hover:underline"
                >
                  {scheduledHearing.venue_or_link}
                </a>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>Date: <strong>{scheduledHearing.date}</strong></span>
                  <span>Time: <strong>{scheduledHearing.start_time} - {scheduledHearing.end_time} IST</strong></span>
                  <span>Passcode: <strong className="font-mono">{scheduledHearing.video_config?.meeting_passcode || "123456"}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={downloadIcs}
                  variant="outline"
                  className="flex-1 text-xs h-9 gap-1.5 border-slate-300"
                >
                  <Download className="h-4 w-4 text-slate-600" /> Download .ics Calendar File
                </Button>
                <Button onClick={onClose} className="flex-1 bg-slate-900 text-white text-xs h-9">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSchedule} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Hearing Subject / Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Start Time (IST)</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">End Time (IST)</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Hearing Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-md bg-white px-3 py-1.5"
                  >
                    <option value="Video">Video Conference (Google Meet / Zoom)</option>
                    <option value="Physical">Physical Chamber (Regional Office)</option>
                    <option value="Hybrid">Hybrid Mode</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Presiding Officer</label>
                  <Input
                    value={presidingOfficer}
                    onChange={(e) => setPresidingOfficer(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Conflict Prevention Note */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-900 shrink-0" />
                <span>
                  Automated conflict detection prevents overlapping bookings across all participants and Ombudsman schedules.
                </span>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs h-9"
              >
                {loading ? "Checking Conflicts & Provisioning Meeting..." : "Schedule Hearing & Dispatch Convocations"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
