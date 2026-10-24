"use client";

import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";

export default function InstitutionsPage() {
  const { institutions, complaints } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-blue-950">Institution Registry</h1>
        <p className="text-sm text-slate-500">{institutions.length} institutions with active records</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {institutions.map((inst) => {
          const cases = complaints.filter((c) => c.institution_id === inst.id);
          const active = cases.filter((c) => c.status !== "Disposed");
          const overlapped = cases.filter((c) => c.is_overlap_flagged).length;
          const overdue = active.filter((c) => getSla(c).state === "Overdue").length;
          const risk: "Low" | "Medium" | "High" =
            overdue > 0 || overlapped >= 2 ? "High" : overlapped > 0 ? "Medium" : "Low";

          const riskStyle = {
            Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
            Medium: "border-amber-200 bg-amber-50 text-amber-700",
            High: "border-red-200 bg-red-50 text-red-700",
          }[risk];

          return (
            <Link key={inst.id} href={`/institution/${inst.id}`}>
              <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <Badge variant="outline" className={riskStyle}>{risk} Risk</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900 leading-tight">{inst.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{inst.aicte_id} · {inst.region}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                    <span>{cases.length} case(s)</span>
                    <span>{active.length} active</span>
                    {overlapped > 0 && (
                      <span className="flex items-center gap-0.5 text-red-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />{overlapped} overlap
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
