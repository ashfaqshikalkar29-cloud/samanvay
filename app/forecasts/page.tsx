"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Flame,
  LineChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, LinkButton, fmtDate } from "@/components/ui-bits";
import { PredictiveAnalyticsPayload } from "@/lib/ai/types";
import { DEMO_TODAY } from "@/lib/mock";

export default function ForecastsPage() {
  const [data, setData] = useState<PredictiveAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(8);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecasts?horizon=${horizon}`);
      const json = await res.json();
      if (res.ok && json.analytics) {
        setData(json.analytics);
      }
    } catch (err) {
      console.error("Forecasts fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [horizon]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </LinkButton>
          <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
            <LineChart className="h-6 w-6 text-blue-700" /> Predictive Analytics & AI Forecasting
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical volume projection, SLA breach probability modeling, and early-warning institutional hotspot tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <span className="text-slate-500 font-medium px-2">Horizon:</span>
            {[4, 8, 12].map((w) => (
              <button
                key={w}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  horizon === w ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setHorizon(w)}
              >
                {w} Weeks
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={fetchForecasts} disabled={loading} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="text-center space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-900 mx-auto" />
            <p className="text-xs text-slate-500">Computing time-series models & SLA breach probabilities...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-white shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Projected Peak Inflow</p>
                  <p className="text-2xl font-black text-blue-950 mt-1">
                    {Math.max(...data.weekly_forecasts.map((w) => w.projected_volume))} / wk
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Forecasted in Week 4</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-white shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">High SLA Breach Risks</p>
                  <p className="text-2xl font-black text-amber-950 mt-1">
                    {data.high_risk_breaches.filter((b) => b.breach_probability >= 70).length} Cases
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">&gt;70% slippage probability</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50/60 to-white shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Emerging Hotspots</p>
                  <p className="text-2xl font-black text-red-950 mt-1">{data.emerging_hotspots.length} Institutes</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Accelerating complaint velocity</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Flame className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Weekly Volume Forecasting */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-950 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-700" /> {horizon}-Week Grievance Volume Projection
              </CardTitle>
              <CardDescription className="text-xs">
                Time-series forecasting model with academic seasonal surge factors (Mid-semester fee & winter admission cycles)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* SVG Trendline Chart */}
              <div className="py-4">
                <div className="h-44 w-full flex items-end gap-3 px-2 border-b border-l border-slate-200 pb-2">
                  {data.weekly_forecasts.map((pt, idx) => {
                    const heightPct = Math.min(100, (pt.projected_volume / 25) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap">
                          <span>{pt.projected_volume} complaints (±4)</span>
                          <span className="text-[9px] text-slate-300">{pt.seasonal_factor}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-900">{pt.projected_volume}</span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-blue-900 to-indigo-500 group-hover:brightness-110 transition-all"
                        />
                        <span className="text-[10px] text-slate-500 font-mono mt-1">
                          Wk {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table of Forecast Weeks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                {data.weekly_forecasts.map((pt, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Week {idx + 1} ({fmtDate(pt.week_start)})</span>
                      <span className="text-blue-900">{pt.projected_volume} cases</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate" title={pt.seasonal_factor}>
                      {pt.seasonal_factor}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: High-Risk SLA Breach Cases */}
          <Card className="border-amber-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-950 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> High-Probability SLA Breach Risk Dockets
              </CardTitle>
              <CardDescription className="text-xs">
                Cases flagged with imminent timeline breach risks based on case age, bureau response latency, and complexity
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-6">Docket ID</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Bureau</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SLA Due Date</TableHead>
                    <TableHead>Breach Probability</TableHead>
                    <TableHead className="pr-6">Key Risk Drivers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.high_risk_breaches.map((item) => (
                    <TableRow key={item.complaint_id}>
                      <TableCell className="pl-6 font-semibold">
                        <Link href={`/complaint/${item.complaint_id}`} className="text-blue-800 hover:underline">
                          {item.complaint_id}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium text-xs">
                        {item.institution_name}
                      </TableCell>
                      <TableCell>
                        <BureauBadge bureau={item.bureau} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{item.category}</TableCell>
                      <TableCell className="text-xs font-mono">{fmtDate(item.sla_due_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              style={{ width: `${item.breach_probability}%` }}
                              className={`h-full ${
                                item.breach_probability >= 80 ? "bg-red-600" : "bg-amber-500"
                              }`}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800">{item.breach_probability}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-xs text-slate-500">
                        {item.risk_factors.join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 3: Emerging Hotspots */}
          <Card className="border-red-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-950 flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-600" /> Emerging Institutional Hotspots
              </CardTitle>
              <CardDescription className="text-xs">
                Institutions showing atypical grievance acceleration patterns requiring proactive supervisory inquiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.emerging_hotspots.map((hs) => (
                  <div key={hs.institution_id} className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/institution/${hs.institution_id}`} className="font-bold text-blue-900 text-xs hover:underline">
                        {hs.name}
                      </Link>
                      <span className="rounded bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-bold">
                        Score: {hs.hotspot_score}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-red-100">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Recent Dockets</p>
                        <p className="font-bold text-slate-900">{hs.recent_complaints_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Velocity Surge</p>
                        <p className="font-bold text-red-600">+{hs.growth_rate_pct}%</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 uppercase">Dominant Norm Issue</p>
                        <p className="font-semibold text-slate-800">{hs.dominant_category}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
