"use client";

import { FilePlus2 } from "lucide-react";
import { SmartComplaintForm } from "@/components/smart-complaint-form";
import { LinkButton } from "@/components/ui-bits";

export default function NewCasePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600">
          ← Dashboard
        </LinkButton>
        <span className="text-xs text-slate-500">
          AICTE Unified Grievance Intake Portal
        </span>
      </div>

      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white shadow-xs">
            <FilePlus2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-blue-950">File Official AICTE Grievance</h1>
            <p className="text-xs text-slate-500">
              Centralized grievance registration for students, parents, faculty, and stakeholders. Real-time duplicate &amp; overlap checks active.
            </p>
          </div>
        </div>
      </div>

      <SmartComplaintForm forcedChannel="web" officerMode={false} />
    </div>
  );
}
