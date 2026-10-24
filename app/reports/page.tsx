"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { DEMO_TODAY } from "@/lib/mock";
import { fmtDate } from "@/components/ui-bits";

const COLORS = ["#1e3a8a", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { complaints, institutions } = useApp();
  const [bureauFilter, setBureauFilter] = useState<"All" | "RB" | "PGRC">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "In-Process" | "Disposed">("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [overlapOnly, setOverlapOnly] = useState(false);

  const regions = useMemo(() => Array.from(new Set(institutions.map((i) => i.region))).sort(), [institutions]);
  const categories = useMemo(() => Array.from(new Set(complaints.map((c) => c.category))).sort(), [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (bureauFilter !== "All" && c.bureau !== bureauFilter) return false;
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (categoryFilter !== "All" && c.category !== categoryFilter) return false;
      if (regionFilter !== "All") {
        const inst = institutions.find((i) => i.id === c.institution_id);
        if (inst?.region !== regionFilter) return false;
      }
      if (overdueOnly && getSla(c).state !== "Overdue") return false;
      if (overlapOnly && !c.is_overlap_flagged) return false;
      return true;
    });
  }, [complaints, institutions, bureauFilter, statusFilter, regionFilter, categoryFilter, overdueOnly, overlapOnly]);

  // Chart: Status stacked bar by bureau
  const statusByBureau = useMemo(() => {
    const bureaus = ["RB", "PGRC"] as const;
    return bureaus.map((b) => {
      const cases = filtered.filter((c) => c.bureau === b);
      return {
        name: b,
        Pending: cases.filter((c) => c.status === "Pending").length,
        "In-Process": cases.filter((c) => c.status === "In-Process").length,
        Disposed: cases.filter((c) => c.status === "Disposed").length,
      };
    });
  }, [filtered]);

  // Chart: Cases by region
  const byRegion = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of filtered) {
      const inst = institutions.find((i) => i.id === c.institution_id);
      if (inst) map[inst.region] = (map[inst.region] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [filtered, institutions]);

  // Chart: Ageing buckets (days since received, DEMO_TODAY based)
  const ageingBuckets = useMemo(() => {
    const buckets: Record<string, number> = { "0-7d": 0, "8-15d": 0, "16-30d": 0, "31-60d": 0, ">60d": 0 };
    for (const c of filtered) {
      const days = Math.round(
        (Date.parse(DEMO_TODAY + "T00:00:00Z") - Date.parse(c.date_received + "T00:00:00Z")) / 86_400_000
      );
      if (days <= 7) buckets["0-7d"]++;
      else if (days <= 15) buckets["8-15d"]++;
      else if (days <= 30) buckets["16-30d"]++;
      else if (days <= 60) buckets["31-60d"]++;
      else buckets[">60d"]++;
    }
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Chart: Overlap donut
  const overlapDonut = useMemo(() => {
    const flagged = filtered.filter((c) => c.is_overlap_flagged).length;
    return [
      { name: "Overlap flagged", value: flagged },
      { name: "No overlap", value: filtered.length - flagged },
    ];
  }, [filtered]);

  // Avg days to dispose
  const avgDispose = useMemo(() => {
    const disposed = filtered.filter((c) => c.status === "Disposed");
    if (!disposed.length) return "—";
    const total = disposed.reduce((sum, c) => {
      return sum + Math.round(
        (Date.parse(DEMO_TODAY + "T00:00:00Z") - Date.parse(c.date_received + "T00:00:00Z")) / 86_400_000
      );
    }, 0);
    return `${Math.round(total / disposed.length)}d`;
  }, [filtered]);

  // CSV export
  const exportCsv = () => {
    const rows = [
      ["ID", "Bureau", "Institution", "Category", "Status", "Received", "Officer", "Overlap"],
      ...filtered.map((c) => {
        const inst = institutions.find((i) => i.id === c.institution_id)?.name ?? "";
        return [c.id, c.bureau, inst, c.category, c.status, c.date_received, c.assigned_officer, c.is_overlap_flagged ? "Yes" : "No"];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `samanvay-report-${DEMO_TODAY}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-500">Showing {filtered.length} of {complaints.length} cases · Demo date: {fmtDate(DEMO_TODAY)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-[70px] z-30 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Bureau</label>
          <Select value={bureauFilter} onValueChange={(v) => { if (v) setBureauFilter(v as typeof bureauFilter); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["All", "RB", "PGRC"].map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Status</label>
          <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v as typeof statusFilter); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["All", "Pending", "In-Process", "Disposed"].map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Region</label>
          <Select value={regionFilter} onValueChange={(v) => { if (v) setRegionFilter(v); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["All", ...regions].map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Category</label>
          <Select value={categoryFilter} onValueChange={(v) => { if (v) setCategoryFilter(v); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["All", ...categories].map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => setOverdueOnly((o) => !o)}
            className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${overdueOnly ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Overdue only
          </button>
          <button
            onClick={() => setOverlapOnly((o) => !o)}
            className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${overlapOnly ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Overlap only
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total (filtered)" value={filtered.length} />
        <StatTile label="Pending" value={filtered.filter((c) => c.status === "Pending").length} />
        <StatTile label="Disposed" value={filtered.filter((c) => c.status === "Disposed").length} />
        <StatTile label="Avg days to dispose" value={avgDispose} sub="(disposed cases)" />
      </div>

      {/* Charts grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Stacked status by bureau */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950 text-sm">Status by Bureau</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusByBureau} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="In-Process" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Disposed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases by region */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950 text-sm">Cases by Region</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRegion} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={85} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a8a" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: "11px", fill: "#64748b" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ageing buckets */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950 text-sm">Case Ageing (days since received)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageingBuckets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: "11px", fill: "#64748b" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overlap donut */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950 text-sm">Overlap Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={overlapDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {overlapDonut.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#dc2626" : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
