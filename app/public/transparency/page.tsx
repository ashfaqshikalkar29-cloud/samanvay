"use client";

import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  Users,
  Search,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IndiaHeatmap } from "@/components/heatmap/india-heatmap";

export default function PublicTransparencyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Banner */}
      <div className="border-b border-blue-900/20 bg-blue-950 text-white py-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Government of India · Open Data & Public Accountability
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            AICTE Samanvay Public Transparency Portal
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Real-time public transparency on national technical education grievance intake, statutory SLA compliance,
            cross-bureau de-duplication, and institutional accountability. Zero personal identifying data.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/track"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
            >
              <Search className="h-3.5 w-3.5" /> Track Your Grievance
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              File New Grievance
            </Link>
            <Link
              href="/scorecards"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              Institutional Risk Scorecards
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* National Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Grievances Registered
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-slate-900">5,142</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +12% YoY
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Across 210 affiliated institutions nationwide</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Resolution Rate
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-emerald-700">86.4%</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Above Target
                </span>
              </div>
              <p className="text-[11px] text-slate-500">4,442 dockets conclusively resolved</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Average Resolution Turnaround
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-blue-900">11.2 Days</span>
                <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Target: 30D
                </span>
              </div>
              <p className="text-[11px] text-slate-500">62.6% faster than statutory ceiling</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Citizen Satisfaction (CSAT)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold font-mono text-amber-700">4.6 / 5.0</span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  ★★★★★
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Verified from 3,840+ citizen ratings</p>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap Section */}
        <IndiaHeatmap />

        {/* Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-900" />
                Grievance Volume by Statutory Category
              </h3>
              <span className="text-xs text-slate-400">AICTE 2026</span>
            </div>

            <div className="space-y-3">
              {[
                { name: "Fee Regulation & Capitation Refunds", count: 1840, pct: 36, color: "bg-blue-900" },
                { name: "Faculty Norms & Salary Disbursals", count: 1210, pct: 24, color: "bg-indigo-600" },
                { name: "Scholarships (Pragati / Saksham / GATE)", count: 890, pct: 17, color: "bg-emerald-600" },
                { name: "Campus Safety & Anti-Ragging Mandate", count: 540, pct: 10, color: "bg-red-600" },
                { name: "Admission Irregularities & Reservation", count: 410, pct: 8, color: "bg-amber-600" },
                { name: "Infrastructure & Lab Equipment Deficiencies", count: 252, pct: 5, color: "bg-slate-600" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{item.name}</span>
                    <span className="font-mono text-slate-900 font-bold">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-Bureau Synergies & De-duplication Impact */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                AICTE Coordination Synergies
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Unified Portal Impact
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Duplicate Cases Consolidated</span>
                <span className="text-2xl font-bold font-mono text-slate-900">320 Pairs</span>
                <p className="text-[10px] text-slate-500">Cross-bureau overlap detection prevented dual inquiries</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Administrative Cost Saved</span>
                <span className="text-2xl font-bold font-mono text-emerald-700">₹4.20 Crore</span>
                <p className="text-[10px] text-slate-500">Savings from redundant inspection and hearing costs</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Conflicting Orders Prevented</span>
                <span className="text-2xl font-bold font-mono text-blue-900">14 Conflicts</span>
                <p className="text-[10px] text-slate-500">Contradictory bureau directives flagged before issuance</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Avg Student Restitution</span>
                <span className="text-2xl font-bold font-mono text-purple-900">₹48,500</span>
                <p className="text-[10px] text-slate-500">Average fee refunded directly to students within 15 days</p>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
              <span>Public Transparency audited under Right to Information (RTI) Act 2005.</span>
              <span className="font-mono text-[10px] text-blue-950 font-bold">Updated: Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
