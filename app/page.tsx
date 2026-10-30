"use client";

import { useApp } from "@/lib/store";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/dashboards/admin-dashboard";
import { RbDashboard } from "@/components/dashboards/rb-dashboard";
import { PgrcDashboard } from "@/components/dashboards/pgrc-dashboard";
import { ChairpersonDashboard } from "@/components/dashboards/chairperson-dashboard";
import { InstituteDashboard } from "@/components/dashboards/institute-dashboard";
import { ComplainantDashboard } from "@/components/dashboards/complainant-dashboard";

export default function DashboardPage() {
  const { role, loading, error, retryLoad } = useApp();

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-900 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Samanvay Enterprise Records...</p>
          <p className="text-xs text-slate-400">Synchronizing cross-bureau workflows and SLA queues</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm text-sm text-red-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
        <Button size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-100" onClick={retryLoad}>
          Retry
        </Button>
      </div>
    );
  }

  // Dynamically render role-specific dashboard based on active role
  switch (role) {
    case "Admin":
      return <AdminDashboard />;
    case "RB Officer":
      return <RbDashboard />;
    case "PGRC Officer":
      return <PgrcDashboard />;
    case "Chairperson":
      return <ChairpersonDashboard />;
    case "Institute":
      return <InstituteDashboard />;
    case "Complainant":
      return <ComplainantDashboard />;
    default:
      return <AdminDashboard />;
  }
}
