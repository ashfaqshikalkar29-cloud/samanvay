"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, ArrowRight, CheckCircle2, Clock, FileStack,
  Hourglass, Loader2, Network, ShieldAlert, SlidersHorizontal, Activity,
  Users, RefreshCw, Zap, Database, Check, Sparkles, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, ChannelBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { calculateStageSla, SlaTickResult } from "@/lib/sla-engine";
import { DEMO_TODAY, type Status, type Channel, type Bureau, Complaint } from "@/lib/mock";

export function AdminDashboard() {
  const {
    complaints,
    overlapAlerts,
    overlapThreshold,
    setOverlapThreshold,
    getInstitution,
    watchlistedInstitutes,
    conflicts,
    tasks,
  } = useApp();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status | "Triage">("All");
  const [channelFilter, setChannelFilter] = useState<"All" | Channel>("All");
  const [bureauFilter, setBureauFilter] = useState<"All" | Bureau>("All");
  const [openOnly, setOpenOnly] = useState(true);
  const [showSlider, setShowSlider] = useState(false);
  const [slaTickRunning, setSlaTickRunning] = useState(false);
  const [slaResult, setSlaResult] = useState<SlaTickResult | null>(null);

  // System-wide KPIs
  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === "Pending").length;
    const inProcess = complaints.filter((c) => c.status === "In-Process").length;
    const disposed = complaints.filter((c) => c.status === "Disposed").length;
    const rbCount = complaints.filter((c) => c.bureau === "RB").length;
    const pgrcCount = complaints.filter((c) => c.bureau === "PGRC").length;
    const openAlerts = overlapAlerts.filter((a) => a.status === "Open").length;
    const confirmedDups = overlapAlerts.filter((a) => a.status === "Confirmed Duplicate").length;
    const hoursSaved = confirmedDups * 14; // Est. 14 officer hours saved per deduplication
    const disposalRate = total > 0 ? Math.round((disposed / total) * 100) : 0;

    return {
      total,
      pending,
      inProcess,
      disposed,
      rbCount,
      pgrcCount,
      openAlerts,
      confirmedDups,
      hoursSaved,
      disposalRate,
    };
  }, [complaints, overlapAlerts]);

  // Intake channel breakdown
  const channelBreakdown = useMemo(() => {
    const channels: Channel[] = ["web", "mobile", "email", "whatsapp", "helpline", "walk-in"];
    const counts: Record<Channel, number> = {
      web: 0,
      mobile: 0,
      email: 0,
      whatsapp: 0,
      helpline: 0,
      "walk-in": 0,
    };
    for (const c of complaints) {
      if (c.channel && counts[c.channel] !== undefined) {
        counts[c.channel]++;
      }
    }
    return channels.map((ch) => ({
      channel: ch,
      count: counts[ch],
      pct: stats.total > 0 ? Math.round((counts[ch] / stats.total) * 100) : 0,
    }));
  }, [complaints, stats.total]);

  // SLA escalations
  const slaMetrics = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let criticalEscalations = 0; // 2x breach
    let l1Escalations = 0;
    let l2Escalations = 0;

    for (const c of complaints) {
      if (c.status !== "Disposed") {
        const stageSla = calculateStageSla(c);
        if (stageSla.tier === "Critical Breach (200%+)") criticalEscalations++;
        else if (stageSla.tier === "Breach (100%)") l2Escalations++;
        else if (stageSla.tier === "Warning (50%)") l1Escalations++;

        if (stageSla.isOverdue) overdue++;
        else if (stageSla.daysRemaining <= 5) dueSoon++;
      }
    }
    return { overdue, dueSoon, criticalEscalations, l1Escalations, l2Escalations };
  }, [complaints]);

  // Trigger SLA Tick via API
  const handleTriggerSlaTick = async () => {
    try {
      setSlaTickRunning(true);
      const res = await fetch("/api/sla/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tick", reference_date: DEMO_TODAY }),
      });
      const data = await res.json();
      if (data.success) {
        setSlaResult(data);
      }
    } catch (e) {
      console.error("Failed to run SLA tick:", e);
    } finally {
      setSlaTickRunning(false);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return complaints
      .filter((c) => {
        if (bureauFilter !== "All" && c.bureau !== bureauFilter) return false;
        if (filter === "All") return true;
        if (filter === "Triage") return c.is_triage === true;
        return c.status === filter;
      })
      .filter((c) => channelFilter === "All" || c.channel === channelFilter)
      .filter((c) => {
        if (!q) return true;
        const inst = getInstitution(c.institution_id)?.name ?? "";
        return [c.id, c.tracking_id || "", c.category, c.channel || "", c.description || "", inst].some((s) =>
          s.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date_received.localeCompare(a.date_received));
  }, [complaints, query, filter, channelFilter, bureauFilter, getInstitution]);

  return (
    <div className="space-y-6">
      {/* Header & Fast Actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Admin Portal
            </span>
            <span className="text-xs font-medium text-slate-500">System Command & Oversight</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-blue-950">AICTE National Grievance Operations</h1>
          <p className="text-sm text-slate-500">
            Unified cross-bureau coordination across Approval Bureau (RB) and Grievance Bureau (PGRC).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerSlaTick}
            disabled={slaTickRunning}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-700 ${slaTickRunning ? "animate-spin" : ""}`} />
            {slaTickRunning ? "Evaluating..." : "Run SLA Tick"}
          </Button>
          <LinkButton href="/clusters" variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center">
            <Network className="mr-1.5 h-3.5 w-3.5 text-blue-700" /> Clusters
          </LinkButton>
          <LinkButton href="/watchlist" variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 flex items-center">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-red-600" /> Watchlist ({watchlistedInstitutes.length})
          </LinkButton>
          <LinkButton href="/walk-in" variant="outline" size="sm" className="border-blue-900 text-blue-900 hover:bg-blue-50">
            + Walk-In Docket
          </LinkButton>
          <LinkButton href="/new" size="sm" className="bg-blue-900 hover:bg-blue-800 text-white">
            + File Grievance
          </LinkButton>
        </div>
      </div>

      {/* SLA Automation Notification Banner */}
      {slaResult && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-700" />
            <span>
              <strong>SLA Tick Completed:</strong> Evaluated {slaResult.evaluatedCount} cases.{" "}
              {slaResult.summary.warning} in 50% warning, {slaResult.summary.breach} breached (L2),{" "}
              <strong className="text-red-700">{slaResult.summary.criticalBreach} critical 2x breach escalated to Chairperson</strong>.
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-800" onClick={() => setSlaResult(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* High-level KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total System Dockets</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">
                {stats.disposed} disposed ({stats.disposalRate}% disposal rate)
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FileStack className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Cross-Bureau Overlap</p>
              <p className="mt-1 text-3xl font-bold text-orange-600">{stats.openAlerts}</p>
              <p className="mt-1 text-xs text-slate-500">
                {stats.confirmedDups} merged · ~{stats.hoursSaved} hrs saved
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <ArrowLeftRight className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Bureau Load Split</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-800">RB: {stats.rbCount}</span>
                <span className="text-slate-400">/</span>
                <span className="text-2xl font-bold text-purple-800">PGRC: {stats.pgrcCount}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Balanced load across {stats.rbCount + stats.pgrcCount} dockets
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Users className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Critical SLA Escalations</p>
              <p className="mt-1 text-3xl font-bold text-red-700">{slaMetrics.criticalEscalations}</p>
              <p className="mt-1 text-xs text-red-600">
                {slaMetrics.l2Escalations} L2 breaches · {slaMetrics.overdue} overdue
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-200 text-red-800">
              <Clock className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bureau Comparison & Intake Channels Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bureau Load Comparison */}
        <Card className="border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-950 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-800" /> Bureau Operations Comparison
            </CardTitle>
            <CardDescription>Live throughput metrics by jurisdiction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900 text-sm">Regulatory Bureau (RB)</span>
                <Badge className="bg-blue-800 text-white text-xs">{stats.rbCount} Cases</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Covers Approval, Faculty Pay/Cadre Norms, Capitation Fees, Infrastructure Norms.
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-200/60">
                <span className="text-slate-500">Active In-Process:</span>
                <span className="font-medium text-slate-800">
                  {complaints.filter((c) => c.bureau === "RB" && c.status === "In-Process").length}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-900 text-sm">Public Grievance Redressal (PGRC)</span>
                <Badge className="bg-purple-800 text-white text-xs">{stats.pgrcCount} Cases</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Covers Anti-Ragging, Certificate Retention, Fee Refunds, Harassment &amp; Student Safety.
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200/60">
                <span className="text-slate-500">Active In-Process:</span>
                <span className="font-medium text-slate-800">
                  {complaints.filter((c) => c.bureau === "PGRC" && c.status === "In-Process").length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intake Channel Breakdown */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-800" /> Multi-Channel Intake Distribution
              </div>
              <span className="text-xs font-normal text-slate-500">6 Authorized Portals</span>
            </CardTitle>
            <CardDescription>Intake volume and citizen adoption per channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {channelBreakdown.map((item) => (
                <div key={item.channel} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <ChannelBadge channel={item.channel} />
                    <span className="text-xs font-bold text-slate-800">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-800 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500">{item.pct}% of total intake</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overlap Alerts Section */}
      <Card className="border-red-200 bg-red-50/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" /> Cross-Bureau Overlap Alerts
              </CardTitle>
              <CardDescription className="text-red-700/80">
                Flagged automatically across Approval Bureau and Grievance Bureau
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={openOnly ? "default" : "outline"}
                className={openOnly ? "bg-red-700 hover:bg-red-600 text-white text-xs" : "text-xs"}
                onClick={() => setOpenOnly((o) => !o)}
              >
                {openOnly ? "Open only" : "All alerts"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => setShowSlider((s) => !s)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Threshold: {Math.round(overlapThreshold * 100)}%
              </Button>
            </div>
          </div>
          {showSlider && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-600 w-20">Similarity</span>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                value={Math.round(overlapThreshold * 100)}
                onChange={(e) => setOverlapThreshold(Number(e.target.value) / 100)}
                className="flex-1 accent-red-600"
              />
              <span className="text-xs font-semibold text-slate-700 w-10">{Math.round(overlapThreshold * 100)}%</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {overlapAlerts.slice(0, 4).map((alert) => {
            const [idA, idB] = alert.complaint_ids;
            const ca = complaints.find((x) => x.id === idA);
            const cb = complaints.find((x) => x.id === idB);
            if (!ca || !cb) return null;
            const [a, b] = ca.bureau === "RB" ? [ca, cb] : [cb, ca];
            const instA = getInstitution(a.institution_id)?.name;
            const instB = getInstitution(b.institution_id)?.name;
            return (
              <div key={alert.id} className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  {[a, b].map((c, i) => (
                    <div key={c.id} className="flex flex-1 items-center gap-2">
                      {i === 1 && <ArrowLeftRight className="mx-1 h-4 w-4 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/complaint/${c.id}`} className="text-sm font-semibold text-blue-800 hover:underline">
                            {c.id}
                          </Link>
                          <BureauBadge bureau={c.bureau} />
                        </div>
                        <p className="truncate text-xs text-slate-500">{c.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-600 truncate">{instA}</div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    {alert.reason} ({Math.round(alert.score * 100)}%)
                  </span>
                  <LinkButton href={`/compare/${a.id}/${b.id}`} variant="ghost" size="sm" className="h-7 text-blue-800 text-xs">
                    Review Pair <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </LinkButton>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Main Unified Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-blue-950">Master Grievance Registry</CardTitle>
            <CardDescription>{rows.length} of {complaints.length} records displayed</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Pending", "In-Process", "Disposed", "Triage"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className={filter === s ? "bg-blue-900 text-white" : "border-slate-200 text-slate-700"}
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
                placeholder="Search by ID, Tracking No, category, institute..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value as any)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700"
            >
              <option value="All">All Bureaus</option>
              <option value="RB">Approval Bureau (RB)</option>
              <option value="PGRC">Grievance Bureau (PGRC)</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700"
            >
              <option value="All">All Channels</option>
              <option value="web">Web</option>
              <option value="mobile">Mobile App</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="helpline">Helpline</option>
              <option value="walk-in">Walk-in</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[110px]">Case ID</TableHead>
                  <TableHead className="w-[100px]">Bureau</TableHead>
                  <TableHead className="w-[90px]">Channel</TableHead>
                  <TableHead className="w-[180px]">Category &amp; Stage</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead className="w-[110px]">Received</TableHead>
                  <TableHead className="w-[120px]">SLA Status</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      No matching complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.slice(0, 20).map((c) => {
                    const sla = getSla(c);
                    const currentStage = (c.dynamic_fields?._current_stage as string) || (c.status === "Pending" ? "Scrutiny" : c.status === "In-Process" ? "Show-Cause" : "Disposed");
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
                        <TableCell><BureauBadge bureau={c.bureau} /></TableCell>
                        <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 text-xs">{c.category}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Stage: {currentStage}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-800 font-medium truncate max-w-[220px]">
                            {inst?.name || c.institution_id}
                          </div>
                          <div className="text-[11px] text-slate-500">{inst?.region || "Region N/A"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{fmtDate(c.date_received)}</TableCell>
                        <TableCell><SlaBadge state={sla.state} daysLeft={sla.daysLeft} /></TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-right">
                          <LinkButton href={`/complaint/${c.id}`} variant="ghost" size="sm" className="h-7 text-xs text-blue-800">
                            Open
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {rows.length > 20 && (
            <p className="text-xs text-center text-slate-500">
              Showing top 20 of {rows.length} complaints. Filter query or select categories to narrow results.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
