"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Eye,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileText,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DpdpUnmaskModal({
  complaintId,
  userRole,
  officerName,
  onSuccess,
  onClose,
}: {
  complaintId: string;
  userRole: string;
  officerName?: string;
  onSuccess?: (identity: any) => void;
  onClose: () => void;
}) {
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unmaskedData, setUnmaskedData] = useState<any>(null);

  const isPermitted = userRole === "Admin" || userRole === "Chairperson";

  const handleUnmask = async () => {
    if (!justification || justification.trim().length < 15) {
      setError("A detailed statutory justification reason (at least 15 characters) is required under the DPDP Act 2023.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/unmask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole,
        },
        body: JSON.stringify({
          complaint_id: complaintId,
          justification: justification.trim(),
          officer_name: officerName || `${userRole} Console Officer`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to unmask personal identity data.");
        return;
      }

      setUnmaskedData(data);
      if (onSuccess) {
        onSuccess(data.identity);
      }
    } catch (err: any) {
      setError(err.message || "Network error submitting unmasking request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Statutory PII Unmasking Authorization</h2>
              <p className="text-xs text-slate-400">DPDP Act 2023 Section 8 & AICTE Whistleblower Protocol</p>
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

        <div className="p-6 space-y-4">
          {!isPermitted ? (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-xs text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Access Prohibited: Insufficient Statutory Authority
              </div>
              <p>
                Only the <strong>AICTE Admin Console</strong> and <strong>Chairperson Office</strong> have
                legal authority to reveal confidential complainant identity. Officers of bureau &apos;{userRole}&apos;
                must request unmasking through official escalation channels.
              </p>
            </div>
          ) : unmaskedData ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Statutory Unmasking Permitted & Cryptographically Logged
                </div>
                <p className="text-[11px] text-emerald-700">
                  Audit Block registered. Unmask Receipt ID: <span className="font-mono">{unmaskedData.unmaskLogId}</span>
                </p>
              </div>

              {/* Revealed PII Card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" /> Decrypted Complainant Identity:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Full Name:</span>
                    <strong className="text-slate-900">{unmaskedData.identity?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone Number:</span>
                    <strong className="font-mono text-slate-900">{unmaskedData.identity?.phone}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Email Address:</span>
                    <strong className="text-slate-900">{unmaskedData.identity?.email}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Statutory Role:</span>
                    <strong className="text-slate-900">Citizen Complainant</strong>
                  </div>
                </div>

                {unmaskedData.identity?.address && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Residential / Campus Address:</span>
                    <span className="text-slate-700">{unmaskedData.identity.address}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded border border-amber-200">
                <strong className="text-amber-800">Legal Mandate:</strong> This information is strictly confidential.
                Unauthorized dissemination violates Section 11 of the DPDP Act 2023 and attracts administrative penalties.
              </div>

              <Button onClick={onClose} className="w-full bg-slate-900 text-white text-xs h-9">
                Close & Return
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <Lock className="h-4 w-4 text-amber-700" />
                  Mandatory Statutory Justification Requirement
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Under the <strong>Digital Personal Data Protection Act 2023</strong>, unmasking complainant identity
                  requires recording an explicit, immutable statutory justification in the cryptographic audit trail.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Statutory Justification Reason (minimum 15 characters):
                </label>
                <Textarea
                  placeholder="e.g. Statutory hearing summons issued for witness testimony per AICTE Approval Regulations 2026..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="h-24 text-xs"
                />
                <span className="text-[10px] text-slate-400">
                  {justification.length}/15 characters minimum
                </span>
              </div>

              {error && (
                <div className="rounded bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <Button
                onClick={handleUnmask}
                disabled={loading || justification.trim().length < 15}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-9 gap-2"
              >
                <Eye className="h-4 w-4" />
                {loading ? "Decrypting & Logging Audit Block..." : "Authorize Unmasking & Record Audit Block"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
