"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, FileStack,
  Hourglass, Building2, BookOpen, DollarSign, Award,
  Send, FileCheck, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, ChannelBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { calculateStageSla } from "@/lib/sla-engine";
import { DEMO_TODAY, Status } from "@/lib/mock";

export function RbDashboard() {
  const { complaints, getInstitution, actor } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [myCasesOnly, setMyCasesOnly] = useState(false);

  // Scoped strictly to Regulatory Bureau (RB)
  const rbComplaints = useMemo(() => {
    return complaints.filter((c) => c.bureau === "RB");
  }, [complaints]);

  // Sub-metrics
  const stats = useMemo(() => {
    const total = rbComplaints.length;
    const pending = rbComplaints.filter((c) => c.status === "Pending").length;
    const inProcess = rbComplaints.filter((c) => c.status === "In-Process").length;
    const disposed = rbComplaints.filter((c) => c.status === "Disposed").length;

    // Category specifics
    const unapproved = rbComplaints.filter((c) =>
      c.category.toLowerCase().includes("approval") || c.description?.toLowerCase().includes("unapproved")
    ).length;
    const facultyNorms = rbComplaints.filter((c) =>
      c.category.toLowerCase().includes("faculty") || c.description?.toLowerCase().includes("salary")
    ).length;
    const feeReg = rbComplaints.filter((c) =>
      c.category.toLowerCase().includes("fee")
    ).length;

    // Show-Cause tracker
    const showCauseCount = rbComplaints.filter((c) =>
      c.dynamic_fields?._current_stage === "Show-Cause" ||
      c.next_action?.toLowerCase().includes("show-cause")
    ).length;

    return { total, pending, inProcess, disposed, unapproved, facultyNorms, feeReg, showCauseCount };
  }, [rbComplaints]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rbComplaints
      .filter((c) => {
        if (myCasesOnly && !c.assigned_officer.toLowerCase().includes(actor.toLowerCase().split(" ")[0])) {
          return false;
        }
        if (filter !== "All" && c.status !== filter) return false;
        if (categoryFilter !== "All" && c.category !== categoryFilter) return false;
        if (!q) return true;
        const inst = getInstitution(c.institution_id)?.name ?? "";
        return [c.id, c.tracking_id || "", c.category, c.description || "", inst].some((s) =>
          s.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date_received.localeCompare(a.date_received));
  }, [rbComplaints, query, filter, categoryFilter, myCasesOnly, actor, getInstitution]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Regulatory Bureau (RB)
            </span>
            <span className="text-xs font-medium text-slate-500">Statutory Norms &amp; Approval Bureau</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-blue-950">Approval &amp; Regulatory Enforcement Docket</h1>
          <p className="text-sm text-slate-500">
            Adjudicating approval norms, 7th CPC faculty cadres, capitation fees, and infrastructure standards.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={myCasesOnly ? "default" : "outline"}
            onClick={() => setMyCasesOnly((v) => !v)}
            className={myCasesOnly ? "bg-blue-800 text-white" : "border-slate-300"}
          >
            {myCasesOnly ? "Showing My Assigned Cases" : "Filter: My Cases Only"}
          </Button>
          <LinkButton href="/walk-in" variant="outline" size="sm" className="border-blue-800 text-blue-800">
            + Officer Walk-In Entry
          </LinkButton>
        </div>
      </div>

      {/* RB Specific Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">RB Active Dockets</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">{stats.inProcess}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.pending} pending initial scrutiny</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <Building2 className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-800">Show-Cause Notices</p>
              <p className="mt-1 text-3xl font-bold text-amber-900">{stats.showCauseCount}</p>
              <p className="mt-1 text-xs text-amber-700">Awaiting institution compliance replies</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Send className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-800">Faculty Norms Violations</p>
              <p className="mt-1 text-3xl font-bold text-red-900">{stats.facultyNorms}</p>
              <p className="mt-1 text-xs text-red-700">Cadre deficit &amp; 7th CPC unpaid salary</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-800">
              <Award className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Unapproved Courses / EoA</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.unapproved}</p>
              <p className="mt-1 text-xs text-slate-500">Illegal intake &amp; unapproved branches</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <BookOpen className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Show-Cause Tracker Panel */}
      <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-amber-950 flex items-center gap-2">
            <Send className="h-4 w-4 text-amber-800" /> Active Statutory Show-Cause Notices
          </CardTitle>
          <CardDescription>
            Notices issued under AICTE Approval Process Handbook (APH) Regulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rbComplaints
              .filter((c) => c.status === "In-Process")
              .slice(0, 3)
              .map((c) => {
                const sla = calculateStageSla(c);
                const inst = getInstitution(c.institution_id);
                return (
                  <div key={c.id} className="rounded-lg border border-amber-200 bg-white p-3.5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Link href={`/complaint/${c.id}`} className="font-semibold text-blue-900 hover:underline text-sm">
                        {c.id}
                      </Link>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Reply Due in {sla.daysRemaining}d
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 truncate">{inst?.name || c.institution_id}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{c.next_action}</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Officer: {c.assigned_officer}</span>
                      <LinkButton href={`/complaint/${c.id}`} variant="ghost" size="sm" className="h-6 text-xs text-blue-800">
                        View Notice →
                      </LinkButton>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Main RB Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-blue-950">Regulatory Bureau Queue</CardTitle>
            <CardDescription>{filtered.length} dockets under RB jurisdiction</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Pending", "In-Process", "Disposed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className={filter === s ? "bg-blue-800 text-white" : "border-slate-200 text-slate-700"}
                onClick={() => setFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Search RB dockets by ID, institute, violation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700"
            >
              <option value="All">All Statutory Categories</option>
              <option value="Fee Regulation">Fee Regulation</option>
              <option value="Faculty Norms">Faculty Norms</option>
              <option value="Approval / Affiliation">Approval / Affiliation</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[110px]">Docket ID</TableHead>
                  <TableHead className="w-[180px]">Category &amp; Stage</TableHead>
                  <TableHead>Institution &amp; Region</TableHead>
                  <TableHead className="w-[140px]">Assigned Officer</TableHead>
                  <TableHead className="w-[110px]">Statutory SLA</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No matching RB complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 15).map((c) => {
                    const sla = getSla(c);
                    const currentStage = (c.dynamic_fields?._current_stage as string) || (c.status === "Pending" ? "Scrutiny" : "Show-Cause");
                    const inst = getInstitution(c.institution_id);
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <Link href={`/complaint/${c.id}`} className="font-semibold text-blue-900 hover:underline">
                            {c.id}
                          </Link>
                          {c.is_overlap_flagged && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-red-100 px-1 py-0.2 text-[10px] font-bold text-red-700">
                              Overlap
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 text-xs">{c.category}</div>
                          <div className="text-[11px] text-blue-700 font-mono">Stage: {currentStage}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-800 font-medium truncate max-w-[240px]">
                            {inst?.name || c.institution_id}
                          </div>
                          <div className="text-[11px] text-slate-500">{inst?.region || "Region N/A"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{c.assigned_officer}</TableCell>
                        <TableCell><SlaBadge state={sla.state} daysLeft={sla.daysLeft} /></TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-right">
                          <LinkButton href={`/complaint/${c.id}`} variant="ghost" size="sm" className="h-7 text-xs text-blue-800">
                            Adjudicate
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
