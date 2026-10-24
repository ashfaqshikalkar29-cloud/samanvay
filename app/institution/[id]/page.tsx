"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDateTime } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";

function RiskBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const styles = {
    Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Medium: "border-amber-200 bg-amber-50 text-amber-700",
    High: "border-red-200 bg-red-50 text-red-700",
  };
  return <Badge variant="outline" className={styles[level]}>{level} Risk</Badge>;
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const { complaints, audit, role, getInstitution } = useApp();

  const inst = getInstitution(id);
  if (!inst) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Institution not found</p>
        <LinkButton href="/" variant="link">Back</LinkButton>
      </div>
    );
  }

  const all = complaints.filter((c) => c.institution_id === id);

  // Non-Admin: mask other bureau descriptions
  const visibleCases = all.map((c) => {
    if (role !== "Admin") {
      const ownBureau = role === "RB Officer" ? "RB" : "PGRC";
      if (c.bureau !== ownBureau) {
        return { ...c, description: "⚠ Description restricted — view from authorised bureau only." };
      }
    }
    return c;
  });

  const active = all.filter((c) => c.status !== "Disposed");
  const overlapped = all.filter((c) => c.is_overlap_flagged).length;
  const overdue = active.filter((c) => getSla(c).state === "Overdue").length;

  const risk: "Low" | "Medium" | "High" =
    overdue > 0 || overlapped >= 2 ? "High" : overlapped > 0 ? "Medium" : "Low";

  // Unified timeline across ALL institution complaints
  const timeline = audit
    .filter((a) => all.some((c) => c.id === a.complaint_id))
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 12);

  return (
    <div className="space-y-5">
      <LinkButton href="/institutions" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
        ← Institutions
      </LinkButton>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">{inst.name}</h1>
          <p className="text-sm text-slate-500">AICTE ID: {inst.aicte_id} · Region: {inst.region}</p>
        </div>
        <RiskBadge level={risk} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total cases", value: all.length },
          { label: "Active", value: active.length },
          { label: "Overlapping", value: overlapped },
          { label: "Overdue", value: overdue },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Cases table */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-blue-950">All Cases</CardTitle></CardHeader>
            <CardContent className="px-0 pb-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-6">ID</TableHead>
                    <TableHead>Bureau</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="pr-6">Overlap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCases.map((c) => {
                    const sla = getSla(c);
                    return (
                      <TableRow key={c.id} className={c.is_overlap_flagged ? "bg-red-50/40" : ""}>
                        <TableCell className="pl-6 font-semibold">
                          <Link href={`/complaint/${c.id}`} className="text-blue-800 hover:underline flex items-center gap-1.5">
                            {c.id}
                            {(!c.description || (role !== "Admin" && c.bureau !== (role === "RB Officer" ? "RB" : "PGRC"))) && (
                              <span title={`Restricted: owned by ${c.bureau}`} className="inline-flex items-center">
                                <Lock className="h-3 w-3 text-slate-400" />
                              </span>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell><BureauBadge bureau={c.bureau} /></TableCell>
                        <TableCell className="text-xs">{c.category}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell><SlaBadge state={sla.state} daysLeft={sla.daysLeft} /></TableCell>
                        <TableCell className="pr-6">
                          {c.is_overlap_flagged && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Flagged
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleCases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">No cases on file.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Unified Timeline */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950">Unified Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-5">
              {timeline.map((a, i) => {
                const engine = a.officer.includes("Engine");
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${engine ? "bg-red-500" : "bg-slate-400"}`} />
                    <p className="text-xs font-semibold text-slate-700">
                      <Link href={`/complaint/${a.complaint_id}`} className="text-blue-700 hover:underline mr-1">{a.complaint_id}</Link>
                      {a.action}
                    </p>
                    <p className="text-[10px] text-slate-400">{fmtDateTime(a.timestamp)} · {a.officer}</p>
                  </li>
                );
              })}
              {timeline.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
