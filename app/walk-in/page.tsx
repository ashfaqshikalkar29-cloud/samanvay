"use client";

import { UserCheck, ShieldCheck } from "lucide-react";
import { SmartComplaintForm } from "@/components/smart-complaint-form";
import { LinkButton } from "@/components/ui-bits";

export default function WalkInIntakePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600">
          ← Dashboard
        </LinkButton>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Officer Docketing Portal
        </span>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-blue-950">Record Walk-in / Helpline Grievance</h1>
            <p className="text-xs text-slate-500">
              For AICTE officers docketing citizen petitions received in person, via national helpline, or through departmental post.
            </p>
          </div>
        </div>
      </div>

      <SmartComplaintForm forcedChannel="walk-in" officerMode={true} />
    </div>
  );
}
