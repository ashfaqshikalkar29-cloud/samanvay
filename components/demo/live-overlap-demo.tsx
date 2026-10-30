"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  GitMerge,
  Layers,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, ChannelBadge, StatusBadge } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { Bureau } from "@/lib/mock";

interface LiveOverlapDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveOverlapDemo({ isOpen, onClose }: LiveOverlapDemoProps) {
  const { complaints, institutions, mergeComplaints, resetDemo } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [leadBureau, setLeadBureau] = useState<Bureau>("RB");
  const [mergeNotes, setMergeNotes] = useState("Consolidated under master case C-1001. Common investigation ordered under Approval Bureau.");
  const [mergedSuccess, setMergedSuccess] = useState(false);

  if (!isOpen) return null;

  // Existing Master Case: C-1001 (RB)
  const masterCase = complaints.find((c) => c.id === "C-1001") || {
    id: "C-1001",
    tracking_id: "SMV-2026-001001",
    category: "Fee Regulation",
    bureau: "RB" as Bureau,
    status: "Pending",
    date_received: "2026-10-02",
    assigned_officer: "Dr. A. Kulkarni",
    institution_id: "inst-1",
    description: "Institute is charging illegal capitation fee of Rs. 1,45,000 in cash above the AICTE approved fee structure for first-year B.Tech students on 2026-09-15.",
  };

  // Simulated New Incoming Complaint: C-9099 (PGRC)
  const simulatedNewCase = {
    id: "C-9099",
    tracking_id: "SMV-2026-009099",
    category: "Fee Regulation",
    bureau: "PGRC" as Bureau,
    status: "Pending",
    date_received: "2026-10-24",
    channel: "whatsapp" as const,
    assigned_officer: "Ms. R. Iyer",
    institution_id: "inst-1",
    description: "College management collected excess capitation fee of Rs. 1,45,000 in cash above AICTE prescribed fees for first year engineering seat admission without receipt.",
  };

  const handleIntakeSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(2);
    }, 800);
  };

  const handleMergeAction = async () => {
    setSubmitting(true);
    try {
      await mergeComplaints(masterCase.id, [simulatedNewCase.id], leadBureau);
      setMergedSuccess(true);
      setTimeout(() => {
        setStep(5);
        setSubmitting(false);
      }, 700);
    } catch {
      setStep(5);
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    resetDemo();
    setStep(1);
    setMergedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-blue-950 font-bold">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-none">Interactive Live Overlap Demo</h2>
              <p className="text-xs text-blue-200 mt-1">
                Real-Time Multi-Bureau Duplicate Detection, Side-by-Side Diff &amp; Lead Case Consolidation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs h-7"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Reset Demo
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50 text-center text-xs">
          {[
            { n: 1, label: "1. Intake Duplicate" },
            { n: 2, label: "2. Real-Time Alert" },
            { n: 3, label: "3. Side-by-Side Diff" },
            { n: 4, label: "4. Merge to Lead" },
            { n: 5, label: "5. Synced Timeline" },
          ].map((s) => (
            <div
              key={s.n}
              className={`p-3 font-semibold border-b-2 transition-colors ${
                step === s.n
                  ? "border-blue-900 text-blue-900 bg-white"
                  : step > s.n
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                  : "border-transparent text-slate-400"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: INTAKE DUPLICATE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950 space-y-1">
                <p className="font-bold text-sm flex items-center gap-1.5 text-blue-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-900 text-white text-[11px]">1</span>
                  Simulating a Citizen WhatsApp Submission
                </p>
                <p className="text-slate-600">
                  An existing grievance docket <strong>(C-1001)</strong> was previously logged under the <strong>Approval Bureau (RB)</strong> for Maharashtra Institute of Technology. A student parent now lodges a grievance via <strong>WhatsApp</strong> on the same issue under the <strong>Public Grievance Cell (PGRC)</strong>.
                </p>
              </div>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-800">Incoming Grievance Submission Payload</CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Channel: WhatsApp Gateway</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700">Target Institution</label>
                    <Input value="Maharashtra Institute of Technology, Pune (AICTE ID: 1-1090123456)" readOnly className="mt-1 bg-slate-50 text-xs font-medium" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Grievance Category</label>
                    <Input value="Fee Regulation (Capitation Fee Violation)" readOnly className="mt-1 bg-slate-50 text-xs font-medium" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Complainant Narrative</label>
                    <Textarea value={simulatedNewCase.description} readOnly rows={3} className="mt-1 bg-slate-50 text-xs leading-relaxed" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button onClick={handleIntakeSubmit} disabled={submitting} className="bg-blue-900 hover:bg-blue-800 text-white">
                  {submitting ? "Analyzing Vector Embeddings..." : "Submit to Intake Gateway →"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: REAL-TIME OVERLAP ALERT */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                    REAL-TIME OVERLAP DETECTED ACROSS BUREAUS
                  </span>
                  <Badge className="bg-red-600 text-white font-mono font-bold">Similarity: 94%</Badge>
                </div>
                <p className="text-red-800 leading-relaxed">
                  The Samanvay Multilingual Vector Embedding Engine compared the new submission against active cases across both <strong>Approval Bureau (RB)</strong> and <strong>Grievance Bureau (PGRC)</strong>. A critical cross-bureau duplicate was flagged in <strong>14 milliseconds</strong>.
                </p>
              </div>

              {/* Alert Comparison Box */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-sm">Existing Docket: C-1001</span>
                    <BureauBadge bureau="RB" />
                  </div>
                  <p className="text-[11px] text-slate-500">Filed: 2026-10-02 · Officer: Dr. A. Kulkarni</p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                    "{masterCase.description}"
                  </p>
                </div>

                <div className="rounded-xl border border-purple-200 bg-white p-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-sm">New Docket: C-9099</span>
                    <BureauBadge bureau="PGRC" />
                  </div>
                  <p className="text-[11px] text-slate-500">Filed: 2026-10-24 · Channel: WhatsApp</p>
                  <p className="text-xs text-slate-700 bg-purple-50/50 p-2.5 rounded border border-purple-100">
                    "{simulatedNewCase.description}"
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  ← Back to Intake
                </Button>
                <Button onClick={() => setStep(3)} className="bg-blue-900 hover:bg-blue-800 text-white">
                  Inspect Side-by-Side Diff (Step 3) →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SIDE-BY-SIDE DIFF */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Semantic Diff &amp; Matching Phrase Analysis</span>
                  <p className="text-slate-500 text-[11px]">Highlighting exact and semantic keyword overlap</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span>Lexical: <strong>91%</strong></span>
                  <span>Semantic Vector: <strong>95%</strong></span>
                  <span className="text-emerald-700 font-bold">Overall Cosine: 94%</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-900 text-xs">Case C-1001 (Approval Bureau - RB)</span>
                    <span className="text-[11px] text-slate-500">Received 22 days ago</span>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-800 space-y-2">
                    <p>
                      Institute is charging <mark className="bg-yellow-200 font-semibold px-1 rounded">illegal capitation fee</mark> of <mark className="bg-yellow-200 font-semibold px-1 rounded">Rs. 1,45,000 in cash</mark> above the AICTE approved fee structure for <mark className="bg-yellow-200 font-semibold px-1 rounded">first-year B.Tech students</mark> on 2026-09-15.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-900 text-xs">Case C-9099 (Grievance Cell - PGRC)</span>
                    <span className="text-[11px] text-slate-500">Received Today (WhatsApp)</span>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-800 space-y-2">
                    <p>
                      College management collected <mark className="bg-yellow-200 font-semibold px-1 rounded">excess capitation fee</mark> of <mark className="bg-yellow-200 font-semibold px-1 rounded">Rs. 1,45,000 in cash</mark> above AICTE prescribed fees for <mark className="bg-yellow-200 font-semibold px-1 rounded">first year engineering seat</mark> admission without receipt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  ← Back to Alert
                </Button>
                <Button onClick={() => setStep(4)} className="bg-orange-600 hover:bg-orange-500 text-white gap-1.5">
                  <GitMerge className="h-4 w-4" /> Adjudicate &amp; Merge Dockets (Step 4) →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: MERGE INTO LEAD BUREAU */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs text-orange-950 space-y-1">
                <p className="font-bold text-sm text-orange-900 flex items-center gap-1.5">
                  <GitMerge className="h-4 w-4 text-orange-700" /> Lead Bureau Selection &amp; Consolidation
                </p>
                <p className="text-slate-600">
                  Consolidating prevents duplicate notices to the institution and duplicate inspection orders. Choose which bureau assumes primary statutory lead.
                </p>
              </div>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Select Lead Bureau</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setLeadBureau("RB")}
                        className={`cursor-pointer rounded-lg p-3 border text-left transition-all ${
                          leadBureau === "RB"
                            ? "border-blue-800 bg-blue-50/80 ring-2 ring-blue-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-900">Approval Bureau (RB)</span>
                          <BureauBadge bureau="RB" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Recommended: Issue show-cause under Chapter VII APH regulations.</p>
                      </div>

                      <div
                        onClick={() => setLeadBureau("PGRC")}
                        className={`cursor-pointer rounded-lg p-3 border text-left transition-all ${
                          leadBureau === "PGRC"
                            ? "border-purple-800 bg-purple-50/80 ring-2 ring-purple-600"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900">Grievance Bureau (PGRC)</span>
                          <BureauBadge bureau="PGRC" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Lead through Ombudsman hearing and individual restitution.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">Consolidation Order Remarks (Audited)</label>
                    <Textarea
                      rows={3}
                      value={mergeNotes}
                      onChange={(e) => setMergeNotes(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                  ← Back to Diff
                </Button>
                <Button onClick={handleMergeAction} disabled={submitting} className="bg-orange-600 hover:bg-orange-500 text-white gap-1.5">
                  {submitting ? "Consolidating Dockets..." : "Confirm Cross-Bureau Merge →"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: SYNCED TIMELINE */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    CROSS-BUREAU MERGE COMPLETED &amp; SYNCHRONIZED
                  </span>
                  <Badge className="bg-emerald-700 text-white font-mono">Consolidated</Badge>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Docket <strong>C-9099</strong> has been consolidated under Lead Case <strong>C-1001</strong> with <strong>Approval Bureau (RB)</strong> as lead authority. Both complainant identities are preserved, but status and inquiry notices now mirror the master docket automatically.
                </p>
              </div>

              {/* Synchronized Timeline Preview */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm text-xs">
                <span className="font-bold text-slate-900 block border-b pb-2">
                  Unified Cross-Bureau Audit &amp; Timeline Ledger
                </span>

                <div className="space-y-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="relative">
                    <span className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-orange-600 ring-4 ring-white" />
                    <p className="font-bold text-slate-900">
                      Cross-Bureau Duplicate Merged into Lead Docket C-1001
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Action by: Dr. A. Kulkarni (RB) · Lead Bureau: {leadBureau} · Timestamp: Just now
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5 bg-slate-50 p-2 rounded border border-slate-200">
                      "{mergeNotes}"
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-white" />
                    <p className="font-bold text-slate-900">
                      Statutory Show-Cause Notice Issued to Maharashtra Institute of Technology
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Stage: Show-Cause · Statutory APH SLA: 15 Days
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="mr-1 h-3 w-3" /> Reset Demo
                </Button>
                <Button onClick={onClose} className="bg-blue-900 hover:bg-blue-800 text-white">
                  Done &amp; Return to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
