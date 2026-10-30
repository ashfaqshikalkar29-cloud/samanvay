"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, FileStack,
  Hourglass, ShieldAlert, GraduationCap, HeartHandshake,
  DollarSign, FileX, PhoneCall, AlertCircle
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

export function PgrcDashboard() {
  const { complaints, getInstitution, actor } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [myCasesOnly, setMyCasesOnly] = useState(false);

  // Scoped strictly to PGRC
  const pgrcComplaints = useMemo(() => {
    return complaints.filter((c) => c.bureau === "PGRC");
  }, [complaints]);

  // Sub-metrics
  const stats = useMemo(() => {
    const total = pgrcComplaints.length;
    const pending = pgrcComplaints.filter((c) => c.status === "Pending").length;
    const inProcess = pgrcComplaints.filter((c) => c.status === "In-Process").length;
    const disposed = pgrcComplaints.filter((c) => c.status === "Disposed").length;

    // Ragging emergencies
    const raggingCases = pgrcComplaints.filter((c) =>
      c.category.toLowerCase().includes("ragging") ||
      c.description?.toLowerCase().includes("ragging") ||
      c.has_distress === true
    );

    // Fee refund disputes
    const feeRefunds = pgrcComplaints.filter((c) =>
      c.description?.toLowerCase().includes("refund") ||
      c.category.toLowerCase().includes("fee") ||
      c.category.toLowerCase().includes("scholarship")
    ).length;

    // Certificates withheld
    const certificatesWithheld = pgrcComplaints.filter((c) =>
      c.description?.toLowerCase().includes("certificate") ||
      c.description?.toLowerCase().includes("marksheet") ||
      c.description?.toLowerCase().includes("migration")
    ).length;

    return {
      total,
      pending,
      inProcess,
      disposed,
      raggingCount: raggingCases.length,
      raggingCases,
      feeRefunds,
      certificatesWithheld,
    };
  }, [pgrcComplaints]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pgrcComplaints
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
  }, [pgrcComplaints, query, filter, categoryFilter, myCasesOnly, actor, getInstitution]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Grievance Redressal (PGRC)
            </span>
            <span className="text-xs font-medium text-slate-500">Student &amp; Faculty Welfare Bureau</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-blue-950">Student Welfare &amp; Ombudsman Desk</h1>
          <p className="text-sm text-slate-500">
            Adjudicating student grievances, anti-ragging complaints, fee refunds, and certificate retention.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={myCasesOnly ? "default" : "outline"}
            onClick={() => setMyCasesOnly((v) => !v)}
            className={myCasesOnly ? "bg-purple-800 text-white" : "border-slate-300"}
          >
            {myCasesOnly ? "Showing My Assigned Cases" : "Filter: My Cases Only"}
          </Button>
          <LinkButton href="/walk-in" variant="outline" size="sm" className="border-purple-800 text-purple-800">
            + Student Walk-In Entry
          </LinkButton>
        </div>
      </div>

      {/* Emergency Anti-Ragging Urgent Widget */}
      {stats.raggingCount > 0 && (
        <Card className="border-red-500 bg-red-600 text-white shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-yellow-300 animate-pulse" />
                EMERGENCY: Anti-Ragging &amp; Critical Student Distress Action Desk
              </CardTitle>
              <Badge className="bg-yellow-400 text-red-950 font-bold text-xs uppercase tracking-wider">
                24h Mandatory SLA
              </Badge>
            </div>
            <CardDescription className="text-red-100">
              Immediate statutory intervention required under AICTE Prevention of Ragging Regulations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.raggingCases.slice(0, 3).map((c) => {
                const inst = getInstitution(c.institution_id);
                return (
                  <div key={c.id} className="rounded-lg bg-red-700/80 p-3.5 border border-red-400 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/complaint/${c.id}`} className="font-bold underline text-white text-sm">
                        {c.id} ({c.tracking_id || "Urgent"})
                      </Link>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono">
                        Received {fmtDate(c.date_received)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-yellow-200 truncate">{inst?.name || c.institution_id}</p>
                    <p className="text-xs text-red-100 line-clamp-2">{c.description}</p>
                    <div className="pt-2 border-t border-red-500/80 flex items-center justify-between">
                      <span className="text-[11px] text-red-200">Officer: {c.assigned_officer}</span>
                      <LinkButton href={`/complaint/${c.id}`} size="sm" className="bg-yellow-400 hover:bg-yellow-300 text-red-950 font-semibold h-6 text-xs">
                        Emergency Review →
                      </LinkButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top PGRC KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Student Grievances</p>
              <p className="mt-1 text-3xl font-bold text-purple-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.inProcess} in formal inquiry</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <GraduationCap className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-800">Fee Refund Disputes</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">{stats.feeRefunds}</p>
              <p className="mt-1 text-xs text-emerald-700">Withdrawal refund compliance</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-800">Certificates Withheld</p>
              <p className="mt-1 text-3xl font-bold text-amber-900">{stats.certificatesWithheld}</p>
              <p className="mt-1 text-xs text-amber-700">Sec 10 document retention orders</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <FileX className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Ombudsman Referrals</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.disposed}</p>
              <p className="mt-1 text-xs text-slate-500">Resolved &amp; redressal orders</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <HeartHandshake className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main PGRC Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-purple-950">Student Grievance Redressal Queue</CardTitle>
            <CardDescription>{filtered.length} active grievances under PGRC jurisdiction</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Pending", "In-Process", "Disposed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className={filter === s ? "bg-purple-800 text-white" : "border-slate-200 text-slate-700"}
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
                placeholder="Search PGRC grievances by student name, ID, institute..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700"
            >
              <option value="All">All Grievance Categories</option>
              <option value="Student Services">Student Services</option>
              <option value="Ragging & Campus Safety">Ragging &amp; Campus Safety</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Hostel & Amenities">Hostel &amp; Amenities</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[110px]">Docket ID</TableHead>
                  <TableHead className="w-[90px]">Channel</TableHead>
                  <TableHead className="w-[180px]">Category &amp; Stage</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="w-[140px]">Ombudsman / Officer</TableHead>
                  <TableHead className="w-[110px]">SLA Timer</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      No matching PGRC grievances found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 15).map((c) => {
                    const sla = getSla(c);
                    const currentStage = (c.dynamic_fields?._current_stage as string) || (c.status === "Pending" ? "Scrutiny" : "Hearing");
                    const inst = getInstitution(c.institution_id);
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <Link href={`/complaint/${c.id}`} className="font-semibold text-purple-900 hover:underline">
                            {c.id}
                          </Link>
                          {c.has_distress && (
                            <span className="ml-1.5 inline-flex items-center rounded bg-red-100 px-1 py-0.2 text-[10px] font-bold text-red-700">
                              Urgent
                            </span>
                          )}
                        </TableCell>
                        <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 text-xs">{c.category}</div>
                          <div className="text-[11px] text-purple-700 font-mono">Stage: {currentStage}</div>
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
                          <LinkButton href={`/complaint/${c.id}`} variant="ghost" size="sm" className="h-7 text-xs text-purple-900">
                            Redress
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
