"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, ArrowRight, CheckCircle2, Clock, FileStack,
  Hourglass, Loader2, Search, ShieldAlert, SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { DEMO_TODAY, type Status } from "@/lib/mock";

function Kpi({
  label, value, hint, icon: Icon, tone,
}: {
  label: string; value: number; hint: string; icon: React.ElementType; tone: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm h-full">
      <CardContent className="flex h-full items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-6 w-6" />
        </span>
      </CardContent>
    </Card>
  );
}

const ALERT_STATUS_STYLES = {
  "Open": "bg-red-100 text-red-700",
  "Confirmed Duplicate": "bg-orange-100 text-orange-700",
  "Dismissed (Distinct)": "bg-slate-100 text-slate-500",
};

export default function DashboardPage() {
  const {
    role,
    visible,
    complaints,
    overlapAlerts,
    overlapThreshold,
    setOverlapThreshold,
    getInstitution,
    loading,
    error,
    retryLoad,
  } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [openOnly, setOpenOnly] = useState(true);
  const [showSlider, setShowSlider] = useState(false);

  const stats = useMemo(
    () => ({
      total: visible.length,
      pending: visible.filter((c) => c.status === "Pending").length,
      inProcess: visible.filter((c) => c.status === "In-Process").length,
      disposed: visible.filter((c) => c.status === "Disposed").length,
      openAlerts: overlapAlerts.filter((a) => {
        const [idA, idB] = a.complaint_ids;
        const visIds = new Set(visible.map((c) => c.id));
        return a.status === "Open" && (visIds.has(idA) || visIds.has(idB));
      }).length,
    }),
    [visible, overlapAlerts]
  );

  const slaStats = useMemo(() => {
    const items = visible.filter((c) => c.status !== "Disposed").map((c) => getSla(c));
    return {
      overdue: items.filter((s) => s.state === "Overdue").length,
      dueSoon: items.filter((s) => s.state === "Due soon").length,
    };
  }, [visible]);

  // Overlap alert cards
  const visibleIds = useMemo(() => new Set(visible.map((c) => c.id)), [visible]);
  const alertsToShow = useMemo(() => {
    return overlapAlerts
      .filter((a) => {
        const [idA, idB] = a.complaint_ids;
        if (!visibleIds.has(idA) && !visibleIds.has(idB)) return false;
        if (openOnly && a.status !== "Open") return false;
        return true;
      });
  }, [overlapAlerts, visibleIds, openOnly]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible
      .filter((c) => filter === "All" || c.status === filter)
      .filter((c) => {
        if (!q) return true;
        const inst = getInstitution(c.institution_id)?.name ?? "";
        return [c.id, c.category, c.description || "", inst].some((s) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date_received.localeCompare(a.date_received));
  }, [visible, query, filter, getInstitution]);

  const scope = role === "Admin" ? "All bureaus" : role === "RB Officer" ? "RB cases only" : "PGRC cases only";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Grievance Command Dashboard</h1>
          <p className="text-sm text-slate-500">
            Unified view across RB and PGRC · <span className="font-medium text-slate-700">{scope}</span>
            {" · "}Demo date: <span className="font-medium text-slate-700">{fmtDate(DEMO_TODAY)}</span>
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center space-y-2">
            <Loader2 className="h-7 w-7 animate-spin text-blue-900 mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading Samanvay records...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-100" onClick={retryLoad}>
            Retry
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <Kpi label="Total Cases" value={stats.total} hint={`${stats.inProcess} in process`} icon={FileStack} tone="bg-blue-100 text-blue-700" />
        <Kpi label="Pending Cases" value={stats.pending} hint="Awaiting first action" icon={Hourglass} tone="bg-amber-100 text-amber-700" />
        <Kpi label="Disposed Cases" value={stats.disposed} hint="Closed with order" icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
        <Card className="border-0 bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg ring-2 ring-red-300/60 h-full">
          <CardContent className="flex h-full items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-100">Open Overlap Alerts</p>
              <p className="mt-1 text-3xl font-bold">{stats.openAlerts}</p>
              <p className="mt-1 text-xs text-red-100">{overlapAlerts.length} total detected</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <ShieldAlert className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* SLA Reminders & Escalations */}
      {(slaStats.overdue > 0 || slaStats.dueSoon > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" /> Reminders &amp; Escalations
            </CardTitle>
            <CardDescription className="text-amber-700/80">
              {slaStats.overdue} case(s) overdue · {slaStats.dueSoon} due within 5 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visible
                .filter((c) => c.status !== "Disposed")
                .map((c) => ({ c, sla: getSla(c) }))
                .filter(({ sla }) => sla.state === "Overdue" || sla.state === "Due soon")
                .sort((a, b) => a.sla.daysLeft - b.sla.daysLeft)
                .map(({ c, sla }) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-white p-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/complaint/${c.id}`} className="text-sm font-semibold text-blue-800 hover:underline">{c.id}</Link>
                        <SlaBadge state={sla.state} daysLeft={sla.daysLeft} />
                      </div>
                      <p className="truncate text-xs text-slate-500">{c.category}</p>
                      {sla.escalationLevel > 0 && (
                        <p className="text-xs font-medium text-red-600">→ Escalate to {sla.escalationAuthority}</p>
                      )}
                    </div>
                    <Link href={`/complaint/${c.id}`}>
                      <Button size="sm" variant="outline" className="ml-2 shrink-0 h-7 text-xs border-amber-200">View</Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overlap alert section */}
      <Card className="border-red-200 bg-red-50/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" /> Overlap Alerts
              </CardTitle>
              <CardDescription className="text-red-700/80">
                Flagged by Samanvay engine · {alertsToShow.length} shown
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
                aria-label="Toggle threshold slider"
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
                type="range" min={10} max={80} step={5}
                value={Math.round(overlapThreshold * 100)}
                onChange={(e) => setOverlapThreshold(Number(e.target.value) / 100)}
                className="flex-1 accent-red-600"
                aria-label="Overlap similarity threshold"
              />
              <span className="text-xs font-semibold text-slate-700 w-10">{Math.round(overlapThreshold * 100)}%</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {alertsToShow.length === 0 && <p className="text-sm text-slate-500">No alerts in your scope. 🎉</p>}
          {alertsToShow.map((alert) => {
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
                          <Link href={`/complaint/${c.id}`} className="text-sm font-semibold text-blue-800 hover:underline whitespace-nowrap">
                            {c.id}
                          </Link>
                          <BureauBadge bureau={c.bureau} />
                        </div>
                        <p className="truncate text-xs text-slate-500">{c.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  {instA === instB ? (
                    <p className="text-xs text-slate-600">{instA}</p>
                  ) : (
                    <p className="text-xs text-slate-600 leading-4">{instA}<br /><span className="text-slate-400">↕</span><br />{instB}</p>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">{alert.reason}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ALERT_STATUS_STYLES[alert.status]}`}>
                      {alert.status}
                    </span>
                  </div>
                  <LinkButton href={`/compare/${a.id}/${b.id}`} variant="ghost" size="sm" className="h-7 text-blue-800 whitespace-nowrap flex items-center">
                    Review pair <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </LinkButton>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-blue-950">Recent Complaints</CardTitle>
            <CardDescription>{rows.length} of {visible.length} shown</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Pending", "In-Process", "Disposed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className={filter === s ? "bg-blue-900 hover:bg-blue-800" : ""}
                onClick={() => setFilter(s)}
              >
                {s}
              </Button>
            ))}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-48 pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6 whitespace-nowrap">ID</TableHead>
                <TableHead className="whitespace-nowrap">Institution</TableHead>
                <TableHead className="whitespace-nowrap">Bureau</TableHead>
                <TableHead className="whitespace-nowrap">Officer</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Last action</TableHead>
                <TableHead className="whitespace-nowrap">Next action</TableHead>
                <TableHead className="whitespace-nowrap">SLA</TableHead>
                <TableHead className="pr-6 text-right whitespace-nowrap">Overlap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const sla = getSla(c);
                const inst = getInstitution(c.institution_id);
                return (
                  <TableRow key={c.id} className={c.is_overlap_flagged ? "bg-red-50/40" : ""}>
                    <TableCell className="pl-6 font-semibold whitespace-nowrap">
                      <Link href={`/complaint/${c.id}`} className="text-blue-800 hover:underline">{c.id}</Link>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <Link href={`/institution/${c.institution_id}`} className="text-xs text-blue-700 hover:underline line-clamp-2">
                        {inst?.name}
                      </Link>
                    </TableCell>
                    <TableCell><BureauBadge bureau={c.bureau} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{c.assigned_officer}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(c.date_received)}</TableCell>
                    <TableCell className="max-w-[160px] text-xs text-slate-600 truncate" title={c.next_action}>
                      {c.next_action || "—"}
                    </TableCell>
                    <TableCell><SlaBadge state={sla.state} daysLeft={sla.daysLeft} /></TableCell>
                    <TableCell className="pr-6 text-right">
                      {c.is_overlap_flagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-slate-500">No complaints match.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
