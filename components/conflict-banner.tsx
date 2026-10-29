"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Scale, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store";
import type { ConflictAlert } from "@/lib/conflicts";

export function ConflictBanner({
  complaintId,
  institutionId,
}: {
  complaintId: string;
  institutionId: string;
}) {
  const { conflicts, resolveConflict, role } = useApp();
  const [selectedConflict, setSelectedConflict] = useState<ConflictAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Find open conflict alert matching either complaint ID or institution ID
  const activeConflict = conflicts.find(
    (c) =>
      c.status === "Open" &&
      (c.complaint_ids.includes(complaintId) || c.institution_id === institutionId)
  );

  if (!activeConflict && !successMsg) return null;

  const handleResolve = async () => {
    if (!selectedConflict || resolutionNotes.trim().length < 10) return;
    setIsSubmitting(true);
    await resolveConflict(selectedConflict.id, resolutionNotes.trim());
    setIsSubmitting(false);
    setSelectedConflict(null);
    setSuccessMsg("Regulatory contradiction resolved. Joint order recorded in audit logs.");
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <>
      {successMsg && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeConflict && (
        <div className="rounded-lg border-2 border-red-400 bg-red-50/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-full bg-red-200 px-2.5 py-0.5 text-xs font-bold text-red-900">
                    STATUTORY CONFLICT ALERT
                  </span>
                  <span className="text-xs text-red-700 font-medium">
                    Opposing Regulatory Directives on {activeConflict.institution_name}
                  </span>
                </div>
                <p className="text-xs text-red-900 leading-relaxed font-medium">
                  {activeConflict.description}
                </p>
                <p className="text-[11px] text-red-700">
                  Impacted cases: {activeConflict.complaint_ids.join(" & ")} across Regional Bureau & PGRC.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              className="bg-red-700 hover:bg-red-800 text-white text-xs shrink-0"
              onClick={() => {
                setSelectedConflict(activeConflict);
                setResolutionNotes("");
              }}
            >
              <Scale className="mr-1.5 h-3.5 w-3.5" /> Resolve Contradiction
            </Button>
          </div>
        </div>
      )}

      {/* Resolution Dialog */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-red-50/70 px-6 py-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-red-700" />
                <p className="text-base font-semibold text-slate-900">
                  Reconcile Contradictory Regulatory Directives
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Institution: <span className="font-semibold">{selectedConflict.institution_name}</span>
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                <p className="font-semibold">Conflict Summary:</p>
                <p className="mt-1 leading-relaxed">{selectedConflict.description}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resolutionNotes">
                  Harmonized Joint Order / Directive <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g., Joint Standing Committee ordered that EoA extension is conditioned on complete refund of excess capitation fees by 2026-11-15. Admissions frozen until compliance is certified."
                  rows={4}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Minimum 10 characters. This harmonized directive will be appended to the permanent audit trail of both cases.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedConflict(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting || resolutionNotes.trim().length < 10}
                className="bg-red-700 hover:bg-red-800 text-white"
                onClick={handleResolve}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {isSubmitting ? "Recording..." : "Issue Joint Harmonized Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
