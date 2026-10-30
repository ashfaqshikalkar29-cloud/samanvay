"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FileText, Plus, Search, CheckCircle2, Clock, ShieldCheck,
  ChevronRight, AlertCircle, HelpCircle, PhoneCall, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BureauBadge, ChannelBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { calculateStageSla } from "@/lib/sla-engine";
import { WorkflowStage } from "@/lib/workflow/types";

const STATUTORY_STAGES: WorkflowStage[] = [
  "Intake",
  "Scrutiny",
  "Show-Cause",
  "Hearing",
  "Compliance",
  "Disposed",
];

export function ComplainantDashboard() {
  const { complaints, getInstitution } = useApp();
  const [searchTrackingId, setSearchTrackingId] = useState("");

  // Complainant view: shows web/mobile submitted dockets or sample citizen dockets
  const myComplaints = useMemo(() => {
    return complaints.filter((c) => c.channel === "web" || c.channel === "mobile" || c.is_anonymous);
  }, [complaints]);

  const filtered = useMemo(() => {
    if (!searchTrackingId.trim()) return myComplaints;
    const q = searchTrackingId.trim().toLowerCase();
    return myComplaints.filter((c) =>
      (c.tracking_id || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [myComplaints, searchTrackingId]);

  return (
    <div className="space-y-6">
      {/* Citizen Welcome & Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100">
              AICTE Samanvay Citizen Portal
            </span>
            <h1 className="text-2xl font-bold">Welcome to AICTE Grievance Redressal</h1>
            <p className="text-sm text-blue-100/90 max-w-xl">
              Track your filed dockets with transparent statutory progress steppers, real-time SLA countdowns, and ombudsman updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <LinkButton href="/new" size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-bold shadow-md">
              <Plus className="mr-1.5 h-5 w-5" /> File New Grievance
            </LinkButton>
          </div>
        </div>
      </div>

      {/* Quick Tracking Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400 shrink-0 ml-1" />
            <Input
              placeholder="Search by Tracking ID (e.g. SMV-2026-001001) or Complaint Number..."
              value={searchTrackingId}
              onChange={(e) => setSearchTrackingId(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-sm"
            />
            {searchTrackingId && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setSearchTrackingId("")}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Citizen Grievance Dockets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-950">My Grievance Dockets</h2>
            <p className="text-xs text-slate-500">
              Showing {filtered.length} grievances filed via Web, Mobile, or Portal
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="mt-2 text-sm font-medium text-slate-700">No grievances found matching your search.</p>
            <LinkButton href="/new" size="sm" className="mt-3 bg-blue-900 text-white">
              File a Grievance Now
            </LinkButton>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.slice(0, 8).map((c) => {
              const currentStage: WorkflowStage =
                (c.dynamic_fields?._current_stage as WorkflowStage) ||
                (c.status === "Pending" ? "Scrutiny" : c.status === "In-Process" ? "Show-Cause" : "Disposed");
              const currentStageIdx = STATUTORY_STAGES.indexOf(currentStage);
              const inst = getInstitution(c.institution_id);
              const sla = calculateStageSla(c);

              return (
                <Card key={c.id} className="border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    {/* Top Row: IDs, Category, Status */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/complaint/${c.id}`} className="font-bold text-blue-900 text-base hover:underline">
                            {c.id}
                          </Link>
                          {c.tracking_id && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 font-semibold">
                              {c.tracking_id}
                            </span>
                          )}
                          <BureauBadge bureau={c.bureau} />
                          <ChannelBadge channel={c.channel} />
                        </div>
                        <p className="mt-1 text-xs text-slate-600 font-medium">
                          {c.category} · <span className="text-slate-800">{inst?.name || c.institution_id}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <LinkButton href={`/complaint/${c.id}`} variant="outline" size="sm" className="h-8 text-xs border-blue-900 text-blue-900">
                          Track Details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </LinkButton>
                      </div>
                    </div>

                    {/* Middle: Progress Stepper */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Statutory Redressal Progress
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {STATUTORY_STAGES.map((stg, idx) => {
                          const isDone = currentStageIdx > idx || c.status === "Disposed";
                          const isCurrent = currentStageIdx === idx && c.status !== "Disposed";
                          return (
                            <div key={stg} className="text-center space-y-1">
                              <div
                                className={`h-2 rounded-full ${
                                  isDone
                                    ? "bg-emerald-600"
                                    : isCurrent
                                    ? "bg-blue-600 animate-pulse"
                                    : "bg-slate-200"
                                }`}
                              />
                              <p
                                className={`text-[10px] truncate ${
                                  isCurrent
                                    ? "font-bold text-blue-900"
                                    : isDone
                                    ? "font-medium text-emerald-800"
                                    : "text-slate-400"
                                }`}
                              >
                                {stg}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom: Description & SLA expectation */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <p className="text-slate-600 line-clamp-1 max-w-lg">
                        <span className="font-medium text-slate-700">Next Action:</span> {c.next_action}
                      </p>

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-blue-700" />
                        <span>
                          Target Resolution Due: <strong>{sla.targetDueDate}</strong> ({sla.daysRemaining} days left)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Citizen Helplines & Guidance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <PhoneCall className="h-4 w-4" /> 24x7 Anti-Ragging Helpline
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Toll-free national emergency: <strong>1800-180-5522</strong>. Immediate student safety intervention.
          </p>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <HelpCircle className="h-4 w-4" /> Fee Refund Norms
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Full refund minus Rs. 1,000 processing fee within 7 days of cancellation as per AICTE guidelines.
          </p>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <ShieldCheck className="h-4 w-4" /> Original Certificate Retention
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Institutes are strictly prohibited from holding original marksheets or migration certificates.
          </p>
        </Card>
      </div>
    </div>
  );
}
