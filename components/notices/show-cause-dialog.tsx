"use client";

import { useState } from "react";
import {
  FileWarning,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShowCauseNotice } from "@/lib/notices";

export function ShowCauseDialog({
  complaintId,
  institutionId = "inst-1",
  institutionName = "Sahyadri Institute of Engineering & Technology",
  category = "Fee Regulation",
  defaultAllegation = "Arbitrary collection of unapproved capitation fee and refusal to refund upon withdrawal.",
  userRole = "RB Officer",
  onIssued,
  onClose,
}: {
  complaintId: string;
  institutionId?: string;
  institutionName?: string;
  category?: string;
  defaultAllegation?: string;
  userRole?: string;
  onIssued?: (notice: ShowCauseNotice) => void;
  onClose: () => void;
}) {
  const [allegation, setAllegation] = useState(defaultAllegation);
  const [deadlineDays, setDeadlineDays] = useState(15);
  const [officerName, setOfficerName] = useState("Dr. Rajesh Verma (Regional Officer)");
  const [showPreview, setShowPreview] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedNotice, setIssuedNotice] = useState<ShowCauseNotice | null>(null);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/notices/show-cause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          complaint_id: complaintId,
          institution_id: institutionId,
          institution_name: institutionName,
          category,
          allegation_summary: allegation,
          officer_name: officerName,
          deadline_days: deadlineDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to issue show-cause notice.");
        return;
      }

      setIssuedNotice(data.notice);
      if (onIssued) {
        onIssued(data.notice);
      }
    } catch (err: any) {
      setError(err.message || "Network error issuing notice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <FileWarning className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Issue Statutory Show-Cause Notice</h2>
              <p className="text-xs text-slate-400">
                AICTE Approval Process Handbook Regulations | Docket: <span className="font-mono text-white">{complaintId}</span>
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

        <div className="p-6 overflow-y-auto flex-1">
          {issuedNotice ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Statutory Notice Formally Issued & Dispatched to Institution Docket!
                </div>
                <p>
                  Notice Reference: <span className="font-mono font-bold">{issuedNotice.notice_reference}</span> · Mandatory Compliance Deadline:{" "}
                  <strong className="text-red-700">{issuedNotice.compliance_deadline}</strong> (15 Days)
                </p>
              </div>

              {/* Rendered Text */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {issuedNotice.rendered_text}
              </div>

              <Button onClick={onClose} className="w-full bg-slate-900 text-white text-xs h-9">
                Close & Return
              </Button>
            </div>
          ) : (
            <form onSubmit={handleIssue} className="space-y-4 text-xs">
              <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <strong>Statutory Notice Notice Mandate:</strong>
                <p>
                  Issuing this notice creates a statutory demand on the college under AICTE Approval Process Regulations.
                  Failure to reply within {deadlineDays} days will automatically trigger ex-parte sanctions including 50% intake reduction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Target Institution</label>
                  <Input value={institutionName} readOnly className="text-xs bg-slate-50 h-8 font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">AICTE ID</label>
                  <Input value={institutionId} readOnly className="text-xs bg-slate-50 h-8 font-mono" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Allegation Summary (Specific Statutory Breach)</label>
                <Textarea
                  value={allegation}
                  onChange={(e) => setAllegation(e.target.value)}
                  rows={3}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Compliance Deadline (Days)</label>
                  <Input
                    type="number"
                    min={7}
                    max={30}
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                    required
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Issuing Regulatory Officer</label>
                  <Input
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Generating & Dispatching..." : "Issue & Dispatch Statutory Show-Cause Notice"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
