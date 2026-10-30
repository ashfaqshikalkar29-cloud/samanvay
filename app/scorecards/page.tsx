"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  CheckCircle2,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndiaHeatmap } from "@/components/heatmap/india-heatmap";

interface InstituteScorecard {
  id: string;
  aicte_id: string;
  name: string;
  region: string;
  state: string;
  total_complaints: number;
  critical_safety_cases: number;
  unresolved_breaches: number;
  active_show_causes: number;
  risk_score: number; // 0..100
  risk_tier: "Critical High Risk" | "Elevated Risk" | "Moderate Risk" | "Compliant";
  trend: "Increasing" | "Stable" | "Decreasing";
}

const INSTITUTIONS_SCORECARD_DATA: InstituteScorecard[] = [
  {
    id: "inst-1",
    aicte_id: "1-10972411",
    name: "Sahyadri Institute of Engineering & Technology",
    region: "Western",
    state: "Maharashtra",
    total_complaints: 18,
    critical_safety_cases: 3,
    unresolved_breaches: 4,
    active_show_causes: 2,
    risk_score: 84,
    risk_tier: "Critical High Risk",
    trend: "Increasing",
  },
  {
    id: "inst-2",
    aicte_id: "1-33274981",
    name: "Modern College of Technology",
    region: "Southern",
    state: "Tamil Nadu",
    total_complaints: 14,
    critical_safety_cases: 2,
    unresolved_breaches: 3,
    active_show_causes: 1,
    risk_score: 72,
    risk_tier: "Elevated Risk",
    trend: "Increasing",
  },
  {
    id: "inst-3",
    aicte_id: "1-49201942",
    name: "National Institute of Management & Science",
    region: "Northern",
    state: "Uttar Pradesh",
    total_complaints: 11,
    critical_safety_cases: 1,
    unresolved_breaches: 2,
    active_show_causes: 1,
    risk_score: 61,
    risk_tier: "Elevated Risk",
    trend: "Stable",
  },
  {
    id: "inst-4",
    aicte_id: "1-55102941",
    name: "Apex Institute of Pharmacy & Research",
    region: "Central",
    state: "Madhya Pradesh",
    total_complaints: 9,
    critical_safety_cases: 0,
    unresolved_breaches: 1,
    active_show_causes: 1,
    risk_score: 48,
    risk_tier: "Moderate Risk",
    trend: "Decreasing",
  },
  {
    id: "inst-5",
    aicte_id: "1-77291048",
    name: "Vivekananda College of Engineering",
    region: "South-West",
    state: "Karnataka",
    total_complaints: 7,
    critical_safety_cases: 0,
    unresolved_breaches: 0,
    active_show_causes: 0,
    risk_score: 22,
    risk_tier: "Compliant",
    trend: "Decreasing",
  },
  {
    id: "inst-6",
    aicte_id: "1-88910245",
    name: "Kolkata Polytechnic Institute",
    region: "Eastern",
    state: "West Bengal",
    total_complaints: 8,
    critical_safety_cases: 1,
    unresolved_breaches: 1,
    active_show_causes: 1,
    risk_score: 54,
    risk_tier: "Elevated Risk",
    trend: "Stable",
  },
];

export default function ScorecardsPage() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"risk_score" | "total_complaints">("risk_score");

  const filtered = useMemo(() => {
    return INSTITUTIONS_SCORECARD_DATA.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.aicte_id.toLowerCase().includes(search.toLowerCase()) ||
        item.state.toLowerCase().includes(search.toLowerCase());

      const matchRegion = regionFilter === "ALL" || item.region === regionFilter;
      const matchTier = tierFilter === "ALL" || item.risk_tier === tierFilter;

      return matchSearch && matchRegion && matchTier;
    }).sort((a, b) => b[sortBy] - a[sortBy]);
  }, [search, regionFilter, tierFilter, sortBy]);

  const getTierBadge = (tier: InstituteScorecard["risk_tier"]) => {
    switch (tier) {
      case "Critical High Risk":
        return <Badge className="bg-red-600 text-white border-red-700">Critical High Risk</Badge>;
      case "Elevated Risk":
        return <Badge className="bg-amber-500 text-slate-900 border-amber-600">Elevated Risk</Badge>;
      case "Moderate Risk":
        return <Badge className="bg-blue-600 text-white border-blue-700">Moderate Risk</Badge>;
      case "Compliant":
        return <Badge className="bg-emerald-600 text-white border-emerald-700">Compliant</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            Domain B · Analytics & Recidivism Oversight
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-900" />
            Institutional Risk Scorecards & Recidivism Index
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Composite 0–100 risk weighting across complaint volumes, emergency safety alerts, SLA breaches, and statutory show-causes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/public/transparency"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Public Transparency Dashboard <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Heatmap Section */}
      <IndiaHeatmap />

      {/* Scorecards Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Institution Name, AICTE ID, or State..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs bg-white h-9"
              />
            </div>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md bg-white px-3 py-2 text-slate-700"
            >
              <option value="ALL">All Regions</option>
              <option value="Western">Western</option>
              <option value="Southern">Southern</option>
              <option value="Northern">Northern</option>
              <option value="Central">Central</option>
              <option value="Eastern">Eastern</option>
              <option value="South-West">South-West</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md bg-white px-3 py-2 text-slate-700"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="Critical High Risk">Critical High Risk (75-100)</option>
              <option value="Elevated Risk">Elevated Risk (50-74)</option>
              <option value="Moderate Risk">Moderate Risk (25-49)</option>
              <option value="Compliant">Compliant (&lt; 25)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Sort by:</span>
            <Button
              size="sm"
              variant={sortBy === "risk_score" ? "default" : "outline"}
              onClick={() => setSortBy("risk_score")}
              className={`h-8 text-xs ${sortBy === "risk_score" ? "bg-blue-900 text-white" : ""}`}
            >
              Risk Score
            </Button>
            <Button
              size="sm"
              variant={sortBy === "total_complaints" ? "default" : "outline"}
              onClick={() => setSortBy("total_complaints")}
              className={`h-8 text-xs ${sortBy === "total_complaints" ? "bg-blue-900 text-white" : ""}`}
            >
              Complaint Count
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-[11px] font-bold text-slate-700 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank / Risk Score</th>
                <th className="py-3 px-4">Institution Name & AICTE ID</th>
                <th className="py-3 px-4">State & Region</th>
                <th className="py-3 px-4 text-center">Grievance Volume</th>
                <th className="py-3 px-4 text-center">Safety Alerts</th>
                <th className="py-3 px-4 text-center">Active Show-Causes</th>
                <th className="py-3 px-4 text-center">Recidivism Trend</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inst, index) => (
                <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold">#{index + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-extrabold px-2 py-0.5 rounded-md ${
                            inst.risk_score >= 75
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : inst.risk_score >= 50
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {inst.risk_score}/100
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{inst.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">ID: {inst.aicte_id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-medium">{inst.state}</div>
                    <div className="text-[10px] text-slate-400">{inst.region} Region</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                    {inst.total_complaints}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {inst.critical_safety_cases > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        <AlertTriangle className="h-3 w-3" /> {inst.critical_safety_cases}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {inst.active_show_causes > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <FileWarning className="h-3 w-3" /> {inst.active_show_causes}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${
                        inst.trend === "Increasing"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : inst.trend === "Stable"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {inst.trend}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/institution/${inst.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:underline"
                    >
                      Dossier <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
