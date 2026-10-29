"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BureauBadge, LinkButton, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import type { ComplaintCluster } from "@/lib/clustering";

const SEVERITY_BADGES: Record<ComplaintCluster["severity"], string> = {
  Critical: "border-red-300 bg-red-100 text-red-800 font-extrabold",
  High: "border-orange-200 bg-orange-100 text-orange-800 font-bold",
  Medium: "border-blue-200 bg-blue-50 text-blue-800 font-medium",
  Low: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function ClustersPage() {
  const { clusters, complaints, getInstitution, role } = useApp();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  const filteredClusters = clusters.filter((cl) => {
    if (categoryFilter !== "All" && cl.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (severityFilter !== "All" && cl.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
    return true;
  });

  const totalComplaintsInClusters = clusters.reduce((acc, c) => acc + c.complaint_count, 0);
  const criticalCount = clusters.filter((c) => c.severity === "Critical").length;
  const uniqueInstitutes = new Set(clusters.flatMap((c) => c.institutions.map((i) => i.id))).size;

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
            <span>Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-900" /> Systemic Issue Clusters (2.2)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unsupervised agglomerative clustering grouping correlated grievances across institutions, issue categories, and semantic vector similarity.
          </p>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Systemic Clusters</p>
          <p className="mt-1 text-2xl font-bold text-blue-950">{clusters.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Grievances Grouped</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{totalComplaintsInClusters}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Institutions Impacted</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{uniqueInstitutes}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">Critical Severity</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{criticalCount}</p>
        </div>
      </div>

      {/* Filter Strip */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter Clusters:
            </span>

            <Select value={categoryFilter} onValueChange={(v) => { if (v) setCategoryFilter(v); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="fees">Fee Regulation</SelectItem>
                <SelectItem value="approval">Approval Norms</SelectItem>
                <SelectItem value="faculty">Faculty & Pay Scale</SelectItem>
                <SelectItem value="ragging">Ragging / Safety</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="scholarship">Scholarships</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => { if (v) setSeverityFilter(v as any); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Severities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
              </SelectContent>
            </Select>

            {(categoryFilter !== "All" || severityFilter !== "All") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500"
                onClick={() => {
                  setCategoryFilter("All");
                  setSeverityFilter("All");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <span className="text-slate-400 text-xs">
            Showing {filteredClusters.length} of {clusters.length} systemic clusters
          </span>
        </CardContent>
      </Card>

      {/* Clusters List */}
      <div className="space-y-4">
        {filteredClusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            No clusters match the selected criteria.
          </div>
        ) : (
          filteredClusters.map((cluster) => {
            const isExpanded = selectedClusterId === cluster.id;
            const clusterComplaints = complaints.filter((c) => cluster.complaint_ids.includes(c.id));

            return (
              <Card
                key={cluster.id}
                className={`border transition-all shadow-xs ${
                  isExpanded ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CardHeader className="p-5 pb-3 cursor-pointer" onClick={() => setSelectedClusterId(isExpanded ? null : cluster.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-2.5 py-0.5 text-xs border ${SEVERITY_BADGES[cluster.severity]}`}>
                          {cluster.severity} Severity
                        </span>
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                          {cluster.category}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {cluster.id}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 pt-1 leading-snug">
                        {cluster.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 border border-blue-200">
                          {cluster.complaint_count} correlated cases
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {cluster.bureaus_involved.join(" & ")} Bureaus
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {cluster.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-3">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{cluster.institutions.length} Institution{cluster.institutions.length === 1 ? "" : "s"}: {cluster.institutions.map((i) => i.name).slice(0, 2).join(", ")}{cluster.institutions.length > 2 ? ` (+${cluster.institutions.length - 2} more)` : ""}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Span: {fmtDate(cluster.date_range.start)} – {fmtDate(cluster.date_range.end)}</span>
                    </span>
                  </div>
                </CardHeader>

                {/* Expanded Complaints Table */}
                {isExpanded && (
                  <CardContent className="px-5 pb-5 pt-0 border-t border-slate-100 mt-3 bg-slate-50/50">
                    <div className="py-3">
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900 mb-4 flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>Recommended AICTE Harmonized Action:</strong> {cluster.suggested_action}
                        </div>
                      </div>

                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                        Correlated Grievance Records ({clusterComplaints.length})
                      </h3>

                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                              <th className="px-3.5 py-2.5">Case ID</th>
                              <th className="px-3.5 py-2.5">Institution</th>
                              <th className="px-3.5 py-2.5">Bureau</th>
                              <th className="px-3.5 py-2.5">Status</th>
                              <th className="px-3.5 py-2.5">Received</th>
                              <th className="px-3.5 py-2.5">Assigned Officer</th>
                              <th className="px-3.5 py-2.5">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clusterComplaints.map((c) => {
                              const inst = getInstitution(c.institution_id);
                              return (
                                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3.5 py-3 font-mono font-bold text-blue-900">
                                    <Link href={`/complaint/${c.id}`} className="hover:underline">
                                      {c.id}
                                    </Link>
                                  </td>
                                  <td className="px-3.5 py-3 font-medium text-slate-800">
                                    {inst?.name || c.institution_id}
                                    <span className="block text-[10px] text-slate-400">{inst?.region}</span>
                                  </td>
                                  <td className="px-3.5 py-3"><BureauBadge bureau={c.bureau} /></td>
                                  <td className="px-3.5 py-3"><StatusBadge status={c.status} /></td>
                                  <td className="px-3.5 py-3 text-slate-600">{fmtDate(c.date_received)}</td>
                                  <td className="px-3.5 py-3 text-slate-700">{c.assigned_officer}</td>
                                  <td className="px-3.5 py-3">
                                    <LinkButton
                                      href={`/complaint/${c.id}`}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[11px] px-2"
                                    >
                                      Review Case <ExternalLink className="ml-1 h-2.5 w-2.5" />
                                    </LinkButton>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
