"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  Filter,
  Flame,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  SlidersHorizontal,
  Users2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { FraudEvaluation, FraudRiskTier } from "@/lib/ai/types";
import { fmtDate } from "@/components/ui-bits";

export default function SuspiciousReviewPage() {
  const { suspiciousCases, reviewFraudCase, complaints, role, actor } = useApp();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed_spam" | "cleared_legitimate">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isStaff = role === "Admin" || role === "RB Officer" || role === "PGRC Officer" || role === "Chairperson";

  // Filtered list
  const filteredCases = useMemo(() => {
    return suspiciousCases.filter((item) => {
      // Tab filter
      if (activeTab === "pending" && item.review_status && item.review_status !== "pending") return false;
      if (activeTab === "confirmed_spam" && item.review_status !== "confirmed_spam") return false;
      if (activeTab === "cleared_legitimate" && item.review_status !== "cleared_legitimate") return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const cid = (item.complaint_id || "").toLowerCase();
        const sigs = (item.signals || []).join(" ").toLowerCase();
        const subnet = (item.submission_source?.ip_subnet || "").toLowerCase();
        if (!cid.includes(q) && !sigs.includes(q) && !subnet.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [suspiciousCases, activeTab, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = suspiciousCases.length;
    const pending = suspiciousCases.filter((c) => !c.review_status || c.review_status === "pending").length;
    const confirmedSpam = suspiciousCases.filter((c) => c.review_status === "confirmed_spam").length;
    const coordinated = suspiciousCases.filter((c) => c.coordinated_campaign_flag).length;
    const highBotRisk = suspiciousCases.filter((c) => c.bot_probability > 0.7).length;

    return { total, pending, confirmedSpam, coordinated, highBotRisk };
  }, [suspiciousCases]);

  const handleReview = async (complaintId: string, decision: "cleared_legitimate" | "confirmed_spam") => {
    try {
      setIsProcessing(complaintId);
      await reviewFraudCase(complaintId, decision);
    } catch (err) {
      console.error("Failed to submit fraud review:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
        <p className="text-sm text-slate-500 mt-1">
          The Suspicious & Spam Review Queue is restricted to AICTE officers, administrators, and the chairperson.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Link href="/" className="hover:text-blue-900 flex items-center">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
            </Link>
            <span>/</span>
            <span>Security & Integrity</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" /> Suspicious & Spam Review Queue (3.7)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated multi-factor evaluation of bot heuristics, toxic language patterns, and coordinated astroturfing campaigns across IP subnets.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Flagged Dockets</span>
              <Bot className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{metrics.pending} pending officer review</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-amber-700 text-xs">
              <span>Pending Scrutiny</span>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-1">{metrics.pending}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting adjudication</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-red-700 text-xs">
              <span>Bot / Astroturfing</span>
              <Users2 className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{metrics.highBotRisk + metrics.coordinated}</p>
            <p className="text-[11px] text-red-600 mt-0.5">{metrics.coordinated} coordinated bursts</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-emerald-700 text-xs">
              <span>Confirmed Spam / Disposed</span>
              <ShieldX className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.confirmedSpam}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Blocked from grievance queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Tab Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {(
            [
              { id: "all", label: `All (${suspiciousCases.length})` },
              { id: "pending", label: `Pending Review (${metrics.pending})` },
              { id: "confirmed_spam", label: `Confirmed Spam (${metrics.confirmedSpam})` },
              { id: "cleared_legitimate", label: `Cleared Legitimate` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search complaint, IP, signal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Main List */}
      {filteredCases.length === 0 ? (
        <Card className="border-dashed border-slate-200 text-center py-12">
          <CardContent className="space-y-3">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-800">No suspicious dockets found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All incoming grievance submissions have met verification and anti-abuse thresholds.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((item) => {
            const complaint = complaints.find((c) => c.id === item.complaint_id);
            const isPending = !item.review_status || item.review_status === "pending";
            const isSpam = item.review_status === "confirmed_spam";
            const isCleared = item.review_status === "cleared_legitimate";

            return (
              <Card
                key={item.complaint_id || Math.random()}
                className={`transition-all shadow-xs border ${
                  isSpam
                    ? "border-red-200 bg-red-50/10"
                    : isCleared
                    ? "border-emerald-200 bg-emerald-50/10"
                    : item.overall_score >= 80
                    ? "border-red-300 bg-white"
                    : "border-amber-200 bg-white"
                }`}
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/complaint/${item.complaint_id}`}
                        className="font-bold text-blue-900 hover:underline flex items-center gap-1 text-sm"
                      >
                        {item.complaint_id}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                      {complaint?.tracking_id && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {complaint.tracking_id}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          item.risk_tier === "fraud_spam"
                            ? "bg-red-100 text-red-800"
                            : item.risk_tier === "suspicious"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.risk_tier.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Fraud Score:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          item.overall_score >= 80
                            ? "bg-red-600 text-white"
                            : item.overall_score >= 50
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {item.overall_score}/100
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Complaint Excerpt */}
                  {complaint?.description && (
                    <div className="bg-slate-50 rounded-md p-2.5 border border-slate-100 text-xs text-slate-700">
                      <p className="font-medium text-slate-500 text-[10px] uppercase mb-0.5">
                        Submission Excerpt ({complaint.category} · {complaint.channel?.toUpperCase()}):
                      </p>
                      <p className="italic line-clamp-2">&quot;{complaint.description}&quot;</p>
                    </div>
                  )}

                  {/* Signals & Astroturfing Indicators */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3 w-3 text-slate-400" /> Detected Risk Signals:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.signals.map((sig, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1"
                        >
                          <Flame className="h-2.5 w-2.5 text-red-500" />
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata footer & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      {item.submission_source?.ip_subnet && (
                        <span>
                          <strong className="text-slate-700">Subnet:</strong> {item.submission_source.ip_subnet}
                        </span>
                      )}
                      {item.submission_source?.device_hash && (
                        <span>
                          <strong className="text-slate-700">Device:</strong> {item.submission_source.device_hash}
                        </span>
                      )}
                      {item.detected_at && (
                        <span>
                          <strong className="text-slate-700">Flagged:</strong> {fmtDate(item.detected_at.slice(0, 10))}
                        </span>
                      )}
                    </div>

                    {/* Review Adjudication State & Actions */}
                    <div>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessing === item.complaint_id}
                            onClick={() => handleReview(item.complaint_id!, "cleared_legitimate")}
                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Clear as Legitimate
                          </Button>
                          <Button
                            size="sm"
                            disabled={isProcessing === item.complaint_id}
                            onClick={() => handleReview(item.complaint_id!, "confirmed_spam")}
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Confirm Spam & Block
                          </Button>
                        </div>
                      ) : isSpam ? (
                        <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Confirmed Spam / Disposed</span>
                          {item.reviewed_by && <span className="text-slate-400">by {item.reviewed_by}</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Cleared Legitimate</span>
                          {item.reviewed_by && <span className="text-slate-400">by {item.reviewed_by}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
