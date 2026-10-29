"use client";

import { AlertOctagon, HeartHandshake, PhoneCall, ShieldAlert } from "lucide-react";
import { DistressScanResult } from "@/lib/ai/types";
import { CRISIS_HELPLINES } from "@/lib/ai/distress";

export function DistressBanner({
  distress,
  complaintId,
}: {
  distress?: DistressScanResult | null;
  complaintId: string;
}) {
  if (!distress || !distress.has_distress) return null;

  return (
    <div className="rounded-xl border-2 border-red-500 bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 shadow-lg animate-pulse-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-2 ring-white/30 mt-0.5">
            <AlertOctagon className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-black uppercase tracking-wider text-red-700">
                CRITICAL DISTRESS SIGNAL DETECTED
              </span>
              <span className="text-xs font-mono text-red-100">
                Docket: {complaintId}
              </span>
            </div>
            <p className="text-sm font-semibold text-white leading-snug">
              Category: <span className="underline decoration-white/50">{distress.distress_category.replace(/_/g, " ").toUpperCase()}</span> · Risk Score: {distress.distress_score}/100
            </p>
            <p className="text-xs text-red-100/90 leading-relaxed max-w-3xl">
              {distress.immediate_safety_action}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-black/25 px-3 py-1.5 text-xs font-medium text-white border border-white/20">
          <ShieldAlert className="h-4 w-4 text-amber-300" />
          <span>Human Review Mandatory · Auto-replies Suppressed</span>
        </div>
      </div>

      {/* Immediate Emergency Helplines Strip */}
      <div className="mt-3.5 pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {CRISIS_HELPLINES.map((hl: { name: string; number: string; available: string }) => (
          <div
            key={hl.name}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs backdrop-blur-xs"
          >
            <PhoneCall className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[11px] truncate">{hl.name}</p>
              <p className="text-[10px] text-red-100 font-mono">{hl.number}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
