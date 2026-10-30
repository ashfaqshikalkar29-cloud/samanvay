"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Tag, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultPIIService } from "@/lib/ai/pii";
import { Role } from "@/lib/mock";
import { DpdpUnmaskModal } from "@/components/security/dpdp-unmask-modal";

export function PIITextViewer({
  rawText,
  role,
  isAssignedOfficer = false,
  complaintId = "COMP-2026-0001",
}: {
  rawText: string;
  role: Role;
  isAssignedOfficer?: boolean;
  complaintId?: string;
}) {
  const isPrivileged = role === "Admin" || role === "Chairperson" || isAssignedOfficer;
  const [showOriginal, setShowOriginal] = useState(false);
  const [unmaskModalOpen, setUnmaskModalOpen] = useState(false);

  // Compute redacted and extracted entities
  const redaction = defaultPIIService.redact(rawText, role, isPrivileged && showOriginal);
  const entities = defaultPIIService.extractEntities(rawText);

  const handleToggle = () => {
    if (showOriginal) {
      setShowOriginal(false);
    } else {
      // Require DPDP statutory justification modal
      setUnmaskModalOpen(true);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Statutory DPDP 2023 PII Protection</span>
          {redaction.redaction_count > 0 && !showOriginal && (
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
              {redaction.redaction_count} PII Fields Masked
            </span>
          )}
        </div>

        {isPrivileged ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
            onClick={handleToggle}
          >
            {showOriginal ? (
              <>
                <EyeOff className="h-3 w-3 text-red-600" /> Mask PII (Public Mode)
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 text-blue-600" /> Statutory Reveal PII
              </>
            )}
          </Button>
        ) : (
          <span className="text-[10px] text-slate-400 italic">
            PII masked per DPDP Act 2023 & AICTE Regulations
          </span>
        )}
      </div>

      {/* Main Text Content */}
      <div className="rounded-lg bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800 border border-slate-200">
        <p className="whitespace-pre-wrap">{redaction.redacted_text}</p>
      </div>

      {/* Extracted Entity Tags */}
      {(entities.monetary_amounts.length > 0 || entities.aadhaar_pan.length > 0 || entities.phones.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Extracted Entities:
          </span>
          {entities.monetary_amounts.map((a, i) => (
            <span key={i} className="rounded bg-emerald-50 px-1.5 py-0.2 text-emerald-800 border border-emerald-200 font-mono">
              Amount: {a}
            </span>
          ))}
          {entities.phones.map((p, i) => (
            <span key={i} className="rounded bg-blue-50 px-1.5 py-0.2 text-blue-800 border border-blue-200 font-mono">
              Phone: {showOriginal ? p : `****${p.slice(-4)}`}
            </span>
          ))}
          {entities.aadhaar_pan.map((ap, i) => (
            <span key={i} className="rounded bg-purple-50 px-1.5 py-0.2 text-purple-800 border border-purple-200 font-mono">
              ID: {showOriginal ? ap : `****${ap.slice(-4)}`}
            </span>
          ))}
        </div>
      )}

      {/* Statutory DPDP Unmasking Modal */}
      {unmaskModalOpen && (
        <DpdpUnmaskModal
          complaintId={complaintId}
          userRole={role}
          onSuccess={() => {
            setShowOriginal(true);
            setUnmaskModalOpen(false);
          }}
          onClose={() => setUnmaskModalOpen(false)}
        />
      )}
    </div>
  );
}
