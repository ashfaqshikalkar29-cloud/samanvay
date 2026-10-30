"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Crown,
  Building2, ShieldAlert, Network, AlertOctagon,
  Scale, FileText, ChevronRight, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { calculateStageSla, StageSlaInfo } from "@/lib/sla-engine";
import { DEMO_TODAY, Complaint } from "@/lib/mock";

export function ChairpersonDashboard() {
  const { complaints, getInstitution, watchlistedInstitutes, clusters, overlapAlerts } = useApp();

  // Find all cases with 2x SLA breach (200%+ consumed)
  const criticalBreaches = useMemo(() => {
    const list: { complaint: Complaint; sla: StageSlaInfo }[] = [];
    for (const c of complaints) {
      if (c.status !== "Disposed") {
        const sla = calculateStageSla(c);
        if (sla.tier === "Critical Breach (200%+)") {
          list.push({ complaint: c, sla });
        }
      }
    }
    return list.sort((a, b) => b.sla.percentConsumed - a.sla.percentConsumed);
  }, [complaints]);

  // Executive high-level metrics
  const executiveMetrics = useMemo(() => {
    const total = complaints.length;
    const disposed = complaints.filter((c) => c.status === "Disposed").length;
    const inProcess = complaints.filter((c) => c.status === "In-Process").length;
    const disposalRate = total > 0 ? Math.round((disposed / total) * 100) : 0;
    const watchlistedCount = watchlistedInstitutes.length;
    const clusterCount = clusters.length;

    return { total, disposed, inProcess, disposalRate, watchlistedCount, clusterCount };
  }, [complaints, watchlistedInstitutes, clusters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1">
              <Crown className="h-3 w-3" /> Chairperson Executive Suite
            </span>
            <span className="text-xs font-medium text-slate-500">AICTE Leadership &amp; High Authority Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-blue-950">National Grievance Command &amp; Escalation Desk</h1>
          <p className="text-sm text-slate-500">
            Reviewing executive escalations, 2x statutory SLA breaches, systemic institution clusters, and appellate reviews.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <LinkButton href="/watchlist" variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-red-600" /> Repeat Offender Watchlist ({watchlistedInstitutes.length})
          </LinkButton>
          <LinkButton href="/clusters" variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1">
            <Network className="h-3.5 w-3.5 text-blue-600" /> Systemic Clusters ({clusters.length})
          </LinkButton>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total National Dockets</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{executiveMetrics.total.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">
                {executiveMetrics.disposalRate}% national disposal rate
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <Scale className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-300 bg-red-50/60 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-800">2x SLA Critical Breaches</p>
              <p className="mt-1 text-3xl font-bold text-red-900">{criticalBreaches.length}</p>
              <p className="mt-1 text-xs text-red-700">Escalated directly to Chairperson</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-200 text-red-800">
              <AlertOctagon className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Repeat Offender Institutes</p>
              <p className="mt-1 text-3xl font-bold text-amber-900">{executiveMetrics.watchlistedCount}</p>
              <p className="mt-1 text-xs text-slate-500">High recidivism &amp; multi-bureau violations</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ShieldAlert className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Systemic Grievance Clusters</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">{executiveMetrics.clusterCount}</p>
              <p className="mt-1 text-xs text-slate-500">Coordinated student &amp; faculty issues</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <Network className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 2x SLA Escalation Ladder Section */}
      <Card className="border-red-300 bg-red-50/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-red-950 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-700" />
                Chairperson Critical Escalation Docket (2x SLA Breach)
              </CardTitle>
              <CardDescription className="text-red-800/80">
                Cases exceeding 200% statutory timeline requiring direct executive order or summon
              </CardDescription>
            </div>
            <Badge className="bg-red-700 text-white text-xs font-bold">
              {criticalBreaches.length} Direct Escalations
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {criticalBreaches.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-red-200">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="mt-2 text-sm font-semibold text-slate-800">No 2x SLA Breaches Active</p>
              <p className="text-xs text-slate-500">All open dockets are within 200% of their statutory stage allowance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-red-200 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-red-100/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Case ID</TableHead>
                    <TableHead className="w-[100px]">Bureau</TableHead>
                    <TableHead className="w-[180px]">Category &amp; Stage</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead className="w-[120px]">Assigned Officer</TableHead>
                    <TableHead className="w-[120px]">SLA Consumption</TableHead>
                    <TableHead className="w-[100px] text-right">Executive Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalBreaches.map(({ complaint: c, sla }) => {
                    const inst = getInstitution(c.institution_id);
                    return (
                      <TableRow key={c.id} className="hover:bg-red-50/50">
                        <TableCell>
                          <Link href={`/complaint/${c.id}`} className="font-bold text-red-900 hover:underline">
                            {c.id}
                          </Link>
                        </TableCell>
                        <TableCell><BureauBadge bureau={c.bureau} /></TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 text-xs">{c.category}</div>
                          <div className="text-[11px] text-red-700 font-mono">Stage: {sla.stage}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-800 font-medium truncate max-w-[240px]">
                            {inst?.name || c.institution_id}
                          </div>
                          <div className="text-[11px] text-slate-500">{inst?.region || "Region N/A"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{c.assigned_officer}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                            {sla.percentConsumed}% consumed
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <LinkButton href={`/complaint/${c.id}`} size="sm" className="bg-red-700 hover:bg-red-800 text-white text-xs h-7">
                            Issue Summon →
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repeat Offenders & Systemic Clusters Split */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Repeat Offender Watchlist Card */}
        <Card className="border-amber-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-amber-950 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-700" /> Repeat-Offender Institutions Watchlist
              </CardTitle>
              <LinkButton href="/watchlist" variant="ghost" size="sm" className="h-7 text-xs text-amber-900">
                Full Watchlist →
              </LinkButton>
            </div>
            <CardDescription>Colleges flagged for persistent statutory non-compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchlistedInstitutes.slice(0, 3).map((item) => (
              <div key={item.institution_id} className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs truncate max-w-[280px]">
                    {item.name}
                  </span>
                  <Badge className="bg-red-600 text-white text-[10px]">{item.total_complaints} Complaints</Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span>AICTE ID: {item.aicte_id}</span>
                  <span>Region: {item.region}</span>
                  <span className="text-red-700 font-medium">Recidivism Score: {item.risk_score}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Systemic Clusters Card */}
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-blue-950 flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-700" /> AI Systemic Grievance Clusters
              </CardTitle>
              <LinkButton href="/clusters" variant="ghost" size="sm" className="h-7 text-xs text-blue-900">
                All Clusters →
              </LinkButton>
            </div>
            <CardDescription>Correlated grievances grouped by semantic similarity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clusters.slice(0, 3).map((cluster) => (
              <div key={cluster.id} className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-950 text-xs truncate max-w-[280px]">
                    {cluster.title}
                  </span>
                  <Badge className="bg-blue-800 text-white text-[10px]">{cluster.complaint_ids.length} Linked</Badge>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">{cluster.summary}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-blue-100">
                  <span>Category: {cluster.category}</span>
                  <span>Bureaus: {cluster.bureaus_involved.join(", ")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
