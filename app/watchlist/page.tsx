"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  Flame,
  ShieldAlert,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BureauBadge, LinkButton, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { computeWatchlist, DEFAULT_WATCHLIST_CONFIG, MonthlyCount } from "@/lib/watchlist";
import { DEMO_TODAY } from "@/lib/mock";

function Sparkline({ data }: { data: MonthlyCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-8 w-28 bg-slate-50 p-1 rounded border border-slate-100">
      {data.map((d, i) => {
        const heightPct = Math.round((d.count / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div
              className={`w-full rounded-t-xs transition-all ${
                d.count > 1 ? "bg-red-500" : d.count === 1 ? "bg-orange-400" : "bg-slate-200"
              }`}
              style={{ height: `${Math.max(15, heightPct)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute -top-7 hidden group-hover:flex flex-col items-center z-10">
              <span className="rounded bg-slate-900 text-white text-[9px] px-1 py-0.5 whitespace-nowrap shadow-xs">
                {d.month}: {d.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WatchlistPage() {
  const { complaints, institutions, getInstitution } = useApp();

  const [minComplaints, setMinComplaints] = useState<number>(DEFAULT_WATCHLIST_CONFIG.minComplaints);
  const [windowMonths, setWindowMonths] = useState<number>(DEFAULT_WATCHLIST_CONFIG.windowMonths);
  const [expandedInstId, setExpandedInstId] = useState<string | null>(null);

  const watchlisted = useMemo(() => {
    return computeWatchlist(complaints, institutions, { minComplaints, windowMonths }, DEMO_TODAY);
  }, [complaints, institutions, minComplaints, windowMonths]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Link href="/" className="hover:text-blue-900 flex items-center">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
            </Link>
            <span>/</span>
            <span>Oversight</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" /> Repeat-Offender Institution Watchlist (2.8)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated intelligence flagging institutions with persistent grievances across bureaus within configurable lookback windows.
          </p>
        </div>
      </div>

      {/* Configuration Strip */}
      <Card className="border-red-200 bg-red-50/30 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-red-700" />
            <span className="font-bold text-slate-800">Watchlist Auto-Flagging Rules:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-600 font-medium">Flag if ≥</Label>
              <Select value={String(minComplaints)} onValueChange={(v) => { if (v) setMinComplaints(parseInt(v, 10)); }}>
                <SelectTrigger className="h-8 w-[110px] text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Complaints</SelectItem>
                  <SelectItem value="3">3 Complaints</SelectItem>
                  <SelectItem value="4">4 Complaints</SelectItem>
                  <SelectItem value="5">5 Complaints</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-600 font-medium">Within Lookback Window</Label>
              <Select value={String(windowMonths)} onValueChange={(v) => { if (v) setWindowMonths(parseInt(v, 10)); }}>
                <SelectTrigger className="h-8 w-[110px] text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-[11px] text-slate-500">
              Reference Date: <strong>{DEMO_TODAY}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Watchlisted Institutions</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{watchlisted.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Cumulative Cases</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {watchlisted.reduce((acc, w) => acc + w.total_complaints, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Pending Resolution</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {watchlisted.reduce((acc, w) => acc + w.pending_count, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Multi-Bureau Presence</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">
            {watchlisted.filter((w) => w.rb_count > 0 && w.pgrc_count > 0).length}
          </p>
        </div>
      </div>

      {/* Watchlist Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-blue-950 flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-600" /> Watchlisted Repeat Violator Institutions
              </CardTitle>
              <CardDescription className="text-xs">
                Institutions meeting the threshold of {minComplaints}+ grievances within {windowMonths} months
              </CardDescription>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Sorted by Composite Risk Index
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {watchlisted.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No institutions meet the repeat-offender threshold ({minComplaints}+ complaints in {windowMonths} months).
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {watchlisted.map((inst) => {
                const isExpanded = expandedInstId === inst.institution_id;
                const instComplaints = complaints.filter((c) => inst.complaint_ids.includes(c.id));

                return (
                  <div key={inst.institution_id} className="transition-colors hover:bg-slate-50/50">
                    <div
                      className="p-4.5 cursor-pointer flex flex-wrap items-center justify-between gap-4"
                      onClick={() => setExpandedInstId(isExpanded ? null : inst.institution_id)}
                    >
                      <div className="space-y-1 min-w-[280px] flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/institution/${inst.institution_id}`}
                            className="text-sm font-bold text-blue-950 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inst.name}
                          </Link>
                          <span className="rounded font-mono text-[11px] bg-slate-100 px-2 py-0.5 text-slate-600 border border-slate-200">
                            {inst.aicte_id}
                          </span>
                          <span className="rounded-full bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 border border-red-200">
                            Risk Index: {inst.risk_score}/100
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {inst.region} Region {inst.state && `· ${inst.state}`} {inst.district && `(${inst.district})`}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {inst.primary_concerns.map((cat) => (
                            <span key={cat} className="rounded bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 capitalize">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Sparkline & Breakdown */}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                            Monthly Trend (6m)
                          </p>
                          <Sparkline data={inst.monthly_trend} />
                        </div>

                        <div className="text-right">
                          <span className="text-base font-extrabold text-red-700">
                            {inst.total_complaints} Cases
                          </span>
                          <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-indigo-700 font-semibold">{inst.rb_count} RB</span>
                            <span>·</span>
                            <span className="text-teal-700 font-semibold">{inst.pgrc_count} PGRC</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {inst.pending_count} pending resolution
                          </span>
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Case List */}
                    {isExpanded && (
                      <div className="px-6 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Linked Grievance Dockets ({instComplaints.length})
                          </p>
                          <LinkButton
                            href={`/institution/${inst.institution_id}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-blue-800"
                          >
                            Open 360° Institution Profile →
                          </LinkButton>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Case ID</th>
                                <th className="px-3 py-2">Category</th>
                                <th className="px-3 py-2">Bureau</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Received</th>
                                <th className="px-3 py-2">Officer</th>
                                <th className="px-3 py-2">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {instComplaints.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/70">
                                  <td className="px-3 py-2.5 font-mono font-bold text-blue-900">
                                    <Link href={`/complaint/${c.id}`} className="hover:underline">
                                      {c.id}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2.5 capitalize">{c.category}</td>
                                  <td className="px-3 py-2.5"><BureauBadge bureau={c.bureau} /></td>
                                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                                  <td className="px-3 py-2.5 text-slate-600">{fmtDate(c.date_received)}</td>
                                  <td className="px-3 py-2.5 text-slate-700">{c.assigned_officer}</td>
                                  <td className="px-3 py-2.5">
                                    <LinkButton
                                      href={`/complaint/${c.id}`}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[11px] px-2"
                                    >
                                      Inspect <ExternalLink className="ml-1 h-2.5 w-2.5" />
                                    </LinkButton>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
