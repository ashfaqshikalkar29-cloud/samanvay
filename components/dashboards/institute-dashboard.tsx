"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Building,
  Upload, FileCheck, Send, AlertCircle, FileText, Check, ShieldCheck,
  Calendar, FileSpreadsheet, Hourglass, HelpCircle, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BureauBadge, ChannelBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { calculateStageSla } from "@/lib/sla-engine";
import { DEMO_TODAY, Status } from "@/lib/mock";

export function InstituteDashboard() {
  const { complaints, institutions, getInstitution } = useApp();
  const [selectedInstId, setSelectedInstId] = useState<string>("inst-1");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Status>("All");

  // Compliance proof form state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetCaseId, setTargetCaseId] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [complianceSubmitted, setComplianceSubmitted] = useState(false);

  // Deadline Extension Request Modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extDays, setExtDays] = useState(7);
  const [extReason, setExtReason] = useState("");
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);
  const [extSubmitted, setExtSubmitted] = useState(false);

  const currentInstitution = useMemo(() => {
    return institutions.find((i) => i.id === selectedInstId) || institutions[0];
  }, [institutions, selectedInstId]);

  // Strictly scoped complaints for this institute ONLY
  const instComplaints = useMemo(() => {
    return complaints.filter((c) => c.institution_id === selectedInstId);
  }, [complaints, selectedInstId]);

  // Metrics
  const stats = useMemo(() => {
    const total = instComplaints.length;
    const pending = instComplaints.filter((c) => c.status === "Pending").length;
    const inProcess = instComplaints.filter((c) => c.status === "In-Process").length;
    const disposed = instComplaints.filter((c) => c.status === "Disposed").length;
    const showCauseNotices = instComplaints.filter(
      (c) => c.dynamic_fields?._current_stage === "Show-Cause" || c.status === "In-Process"
    );
    const complianceRate = total > 0 ? Math.round((disposed / total) * 100) : 100;
    const repeatOffenseFlag = total >= 4 ? "Elevated Monitoring" : "Normal Tier";

    return { total, pending, inProcess, disposed, showCauseNotices, complianceRate, repeatOffenseFlag };
  }, [instComplaints]);

  const handleUploadCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !targetCaseId) return;
    setIsSubmittingProof(true);
    try {
      const res = await fetch("/api/complaints/additional-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: targetCaseId,
          additional_text: `[INSTITUTION FORMAL COMPLIANCE REPLY] ${replyText}`,
          actor: `Nodal Officer (${currentInstitution?.name})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComplianceSubmitted(true);
        setTimeout(() => {
          setShowUploadModal(false);
          setReplyText("");
          setComplianceSubmitted(false);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extReason.trim() || extReason.trim().length < 5 || !targetCaseId) return;
    setIsSubmittingExt(true);
    try {
      const res = await fetch("/api/complaints/extension-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: targetCaseId,
          requested_days: extDays,
          justification: extReason,
          actor: `Nodal Officer (${currentInstitution?.name})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExtSubmitted(true);
        setTimeout(() => {
          setShowExtensionModal(false);
          setExtReason("");
          setExtSubmitted(false);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingExt(false);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instComplaints
      .filter((c) => filter === "All" || c.status === filter)
      .filter((c) => {
        if (!q) return true;
        return [c.id, c.tracking_id || "", c.category, c.description || ""].some((s) =>
          s.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date_received.localeCompare(a.date_received));
  }, [instComplaints, query, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Institutional Portal
            </span>
            <span className="text-xs font-medium text-slate-500">AICTE Nodal Officer Dashboard</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-blue-950">
            {currentInstitution ? currentInstitution.name : "Institution Compliance Portal"}
          </h1>
          <p className="text-sm text-slate-500">
            AICTE Institute ID: <span className="font-mono font-semibold text-slate-700">{currentInstitution?.aicte_id}</span> · Region: <span className="font-medium text-slate-700">{currentInstitution?.region}</span>
          </p>
        </div>

        {/* Demo institution switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Viewing as:</span>
          <select
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800"
          >
            {institutions.slice(0, 6).map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name.slice(0, 40)}... ({inst.aicte_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compliance Scorecard Card */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-900 to-blue-950 text-white">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Institutional Quality &amp; Compliance Scorecard
              </span>
              <h2 className="text-xl font-bold mt-0.5">{currentInstitution?.name}</h2>
              <p className="text-xs text-slate-300">
                Statutory standing under Approval Process Handbook Regulations
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="bg-white/10 rounded-lg p-3 text-center min-w-[110px]">
                <p className="text-[10px] text-slate-300 uppercase">Compliance Index</p>
                <p className="text-xl font-bold text-emerald-400">{stats.complianceRate}%</p>
                <p className="text-[10px] text-slate-400">On-time resolutions</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 text-center min-w-[110px]">
                <p className="text-[10px] text-slate-300 uppercase">Avg Response Time</p>
                <p className="text-xl font-bold text-blue-300">6.4 Days</p>
                <p className="text-[10px] text-slate-400">Benchmark &lt; 15d</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 text-center min-w-[110px]">
                <p className="text-[10px] text-slate-300 uppercase">Recidivism Status</p>
                <p className={`text-xl font-bold ${stats.repeatOffenseFlag.includes("Elevated") ? "text-amber-400" : "text-emerald-400"}`}>
                  {stats.repeatOffenseFlag}
                </p>
                <p className="text-[10px] text-slate-400">Watchlist score</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show-Cause Notice Alert Banner */}
      {stats.showCauseNotices.length > 0 && (
        <Card className="border-amber-400 bg-amber-50/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-700" />
                Statutory Show-Cause Action Required ({stats.showCauseNotices.length} Notice Active)
              </CardTitle>
              <Badge className="bg-amber-600 text-white text-xs">Action Required</Badge>
            </div>
            <CardDescription className="text-amber-800/80">
              AICTE requires your institution to submit formal replies and compliance affidavits to avoid penal action under APH regulations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.showCauseNotices.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg p-3 border border-amber-200">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{c.id}</span>
                      <BureauBadge bureau={c.bureau} />
                      <span className="text-xs text-slate-600 font-medium">{c.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.next_action}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-7"
                      onClick={() => {
                        setTargetCaseId(c.id);
                        setShowExtensionModal(true);
                      }}
                    >
                      Request Extension
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs h-7 gap-1"
                      onClick={() => {
                        setTargetCaseId(c.id);
                        setShowUploadModal(true);
                      }}
                    >
                      <Upload className="h-3 w-3" /> Submit Compliance Proof
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Proof Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" /> Submit Institutional Reply &amp; Proof
              </h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowUploadModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleUploadCompliance} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Target Grievance Docket</label>
                <Input value={targetCaseId} readOnly className="mt-1 bg-slate-50 font-mono text-xs" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Formal Explanation / Action Taken</label>
                <Textarea
                  rows={4}
                  placeholder="Detail institutional response, refund transaction reference numbers, or faculty recruitment orders..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Attach Supporting Evidence (PDF/Receipts)</label>
                <input
                  type="file"
                  multiple
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                />
              </div>

              {complianceSubmitted ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 text-emerald-600" /> Compliance affidavit submitted and queued for officer verification.
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingProof} className="bg-emerald-800 hover:bg-emerald-700 text-white">
                    {isSubmittingProof ? "Submitting..." : "Submit Formal Response"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Deadline Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-900" /> Request Statutory Extension
              </h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowExtensionModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleRequestExtension} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Docket Reference</label>
                <Input value={targetCaseId} readOnly className="mt-1 bg-slate-50 font-mono text-xs" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Days Requested</label>
                <select
                  value={extDays}
                  onChange={(e) => setExtDays(Number(e.target.value))}
                  className="mt-1 w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700"
                >
                  <option value={7}>7 Additional Days</option>
                  <option value={10}>10 Additional Days</option>
                  <option value={14}>14 Additional Days (Maximum)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Justification (Audited by Bureau)</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Governing Council meeting scheduled for Nov 2; Bank audit report awaiting signature..."
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              {extSubmitted ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 text-emerald-600" /> Extension request submitted to Bureau Head for review.
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowExtensionModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingExt} className="bg-blue-900 hover:bg-blue-800 text-white">
                    {isSubmittingExt ? "Submitting..." : "Submit Extension Request"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Institute Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Institution Dockets</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">All-time grievances received</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
              <Building className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Under Inquiry</p>
              <p className="mt-1 text-3xl font-bold text-amber-800">{stats.inProcess}</p>
              <p className="mt-1 text-xs text-slate-500">Show-cause &amp; committee reviews</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Clock className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Compliant / Disposed</p>
              <p className="mt-1 text-3xl font-bold text-emerald-800">{stats.disposed}</p>
              <p className="mt-1 text-xs text-slate-500">Disposal orders issued</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <FileCheck className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Compliance Index</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">{stats.complianceRate}%</p>
              <p className="mt-1 text-xs text-slate-500">Institutional resolution score</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-blue-950">Active Institutional Grievances</CardTitle>
            <CardDescription>
              Showing {rows.length} complaints on record for {currentInstitution?.name}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Pending", "In-Process", "Disposed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className={filter === s ? "bg-emerald-800 text-white" : "border-slate-200 text-slate-700"}
                onClick={() => setFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search grievance issues, tracking IDs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[110px]">Docket ID</TableHead>
                  <TableHead className="w-[100px]">Bureau</TableHead>
                  <TableHead className="w-[180px]">Category &amp; Stage</TableHead>
                  <TableHead>Summary / Allegation</TableHead>
                  <TableHead className="w-[110px]">Filed Date</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No complaints found for this institution.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => {
                    const currentStage = (c.dynamic_fields?._current_stage as string) || (c.status === "Pending" ? "Scrutiny" : "Show-Cause");
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <Link href={`/complaint/${c.id}`} className="font-semibold text-blue-900 hover:underline">
                            {c.id}
                          </Link>
                        </TableCell>
                        <TableCell><BureauBadge bureau={c.bureau} /></TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 text-xs">{c.category}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Stage: {currentStage}</div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-700 line-clamp-2">{c.description || "No description provided."}</p>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{fmtDate(c.date_received)}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-right">
                          <LinkButton href={`/complaint/${c.id}`} variant="ghost" size="sm" className="h-7 text-xs text-blue-800">
                            View Case
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
