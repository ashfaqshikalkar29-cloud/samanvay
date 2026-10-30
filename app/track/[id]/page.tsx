"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  KeyRound,
  Lock,
  MessageSquare,
  PauseCircle,
  PlusCircle,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, ChannelBadge, LinkButton, QrCodeView, StatusBadge, fmtDate, fmtDateTime } from "@/components/ui-bits";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

const STAGES_EXPLANATION = [
  { stage: "Intake", title: "Docket Intake", desc: "Citizen submission received and assigned AICTE tracking reference." },
  { stage: "Scrutiny", title: "Regulatory Scrutiny", desc: "Nodal officer examines legal merits, APH norms, and jurisdictional applicability." },
  { stage: "Show-Cause", title: "Institutional Show-Cause", desc: "Statutory notice issued to college administration demanding formal explanation." },
  { stage: "Hearing", title: "Inquiry & Hearing", desc: "Ombudsman hearing / fact-finding committee convened to review evidence." },
  { stage: "Compliance", title: "Compliance Verification", desc: "Directives enforced (fee refund, certificate return, faculty recruitment)." },
  { stage: "Disposed", title: "Disposal & Order", desc: "Final regulatory disposal order communicated and docket closed." },
];

export default function TrackDetailPage({ params }: TrackPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const initialVerify = searchParams.get("verify") || "";

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState(initialVerify);
  const [unlocking, setUnlocking] = useState(false);

  // Modals for Complainant Actions
  const [showAddInfoModal, setShowAddInfoModal] = useState(false);
  const [additionalText, setAdditionalText] = useState("");
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [addInfoSuccess, setAddInfoSuccess] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Citizen Feedback
  const [starRating, setStarRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // DPDP Right to be Forgotten
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [eraseReason, setEraseReason] = useState("");
  const [isErasing, setIsErasing] = useState(false);
  const [eraseSuccess, setEraseSuccess] = useState(false);

  const handleEraseIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eraseReason.trim()) return;
    setIsErasing(true);
    try {
      const res = await fetch("/api/privacy/erase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "Complainant" },
        body: JSON.stringify({
          complaint_id: data.id,
          reason: eraseReason.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEraseSuccess(true);
        setTimeout(() => {
          setShowEraseModal(false);
          fetchTrackData(verifyInput);
        }, 1500);
      } else {
        alert(json.error || "Failed to execute DPDP data erasure.");
      }
    } catch {
      alert("Network error processing DPDP erasure request.");
    } finally {
      setIsErasing(false);
    }
  };

  const fetchTrackData = async (verifyCode: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = verifyCode ? `&verify=${encodeURIComponent(verifyCode)}` : "";
      const res = await fetch(`/api/track?id=${encodeURIComponent(resolvedParams.id)}${q}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
        if (json.dynamic_fields?.citizen_feedback) {
          setStarRating(json.dynamic_fields.citizen_feedback.rating || 5);
          setFeedbackComment(json.dynamic_fields.citizen_feedback.comments || "");
          setFeedbackSubmitted(true);
        }
      } else {
        setErrorMsg(json.error || "Grievance record not found.");
      }
    } catch {
      setErrorMsg("Network error fetching grievance tracking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackData(initialVerify);
  }, [resolvedParams.id, initialVerify]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setUnlocking(true);
    await fetchTrackData(verifyInput.trim());
    setUnlocking(false);
  };

  const handleSubmitAdditionalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalText.trim()) return;
    setIsSubmittingInfo(true);
    try {
      const res = await fetch("/api/complaints/additional-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: data.id,
          additional_text: additionalText,
          actor: "Complainant Citizen",
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setAddInfoSuccess(true);
        setTimeout(() => {
          setShowAddInfoModal(false);
          setAddInfoSuccess(false);
          setAdditionalText("");
          fetchTrackData(verifyInput);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  const handleWithdrawComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawReason.trim() || withdrawReason.trim().length < 5) return;
    setIsWithdrawing(true);
    try {
      const res = await fetch("/api/complaints/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: data.id,
          reason: withdrawReason,
          actor: "Complainant Citizen",
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setWithdrawSuccess(true);
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(false);
          fetchTrackData(verifyInput);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch("/api/complaints/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: data.id,
          rating: starRating,
          comments: feedbackComment,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setFeedbackSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading grievance tracking details...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Tracking Record Not Found</h2>
        <p className="text-xs text-slate-500">{errorMsg || "Invalid Tracking ID."}</p>
        <LinkButton href="/track" variant="outline" size="sm">
          Try Another ID
        </LinkButton>
      </div>
    );
  }

  const currentStageName =
    data.dynamic_fields?._current_stage ||
    (data.status === "Pending" ? "Scrutiny" : data.status === "In-Process" ? "Show-Cause" : "Disposed");
  const isDisposed = data.status === "Disposed";
  const isPaused = Boolean(data.dynamic_fields?.is_paused_awaiting_info);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <LinkButton href="/track" variant="ghost" size="sm" className="-ml-2 text-slate-600">
          ← Track Another Grievance
        </LinkButton>
        <div className="flex items-center gap-2">
          <StatusBadge status={data.status} />
          <BureauBadge bureau={data.bureau} />
        </div>
      </div>

      {/* Header Docket Card */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-950 to-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                AICTE Official Tracking ID
              </span>
              <h1 className="text-3xl font-extrabold font-mono text-white tracking-wide">
                {data.tracking_id}
              </h1>
              <p className="text-xs text-slate-300">
                Docket Reference: <strong className="text-white font-mono">{data.id}</strong> · Docketed on {fmtDate(data.date_received)}
              </p>
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <ChannelBadge channel={data.channel} />
                {data.is_anonymous && (
                  <span className="rounded-full bg-purple-900/80 border border-purple-400 text-purple-200 text-[10px] font-semibold px-2 py-0.5">
                    Confidential Whistleblower
                  </span>
                )}
                {isPaused && (
                  <span className="rounded-full bg-amber-500/30 border border-amber-400 text-amber-200 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <PauseCircle className="h-3 w-3" /> SLA Timer Paused (Awaiting Info)
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <QrCodeView value={typeof window !== "undefined" ? window.location.href : ""} size={100} />
              <span className="text-[10px] text-blue-200 mt-1 font-mono">Scan to Track</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complainant Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {!isDisposed && (
            <>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs h-8 gap-1.5"
                onClick={() => setShowAddInfoModal(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" /> Submit Additional Info
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-8 gap-1.5"
                onClick={() => setShowWithdrawModal(true)}
              >
                <XCircle className="h-3.5 w-3.5" /> Withdraw Complaint
              </Button>
            </>
          )}

          {data.complainant_name !== "[DATA ERASED UNDER DPDP ACT SEC 12]" && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-8 gap-1.5"
              onClick={() => setShowEraseModal(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> DPDP Right to be Forgotten
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/complaints/pdf-summary?id=${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-blue-900" /> Download PDF Slip
          </a>
        </div>
      </div>

      {/* Modal: Submit Additional Info */}
      {showAddInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-900" /> Submit Supplementary Information
              </h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddInfoModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmitAdditionalInfo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Docket Reference</label>
                <Input value={`${data.id} (${data.tracking_id})`} readOnly className="mt-1 bg-slate-50 font-mono text-xs" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Additional Facts / Clarification</label>
                <Textarea
                  rows={4}
                  placeholder="Provide additional details, transaction dates, names of department heads, or replies received from college..."
                  value={additionalText}
                  onChange={(e) => setAdditionalText(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Attach Supplementary Files (Optional)</label>
                <input
                  type="file"
                  multiple
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                />
              </div>

              {addInfoSuccess ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Information appended successfully! Resuming statutory clock.
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddInfoModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingInfo} className="bg-blue-900 hover:bg-blue-800 text-white">
                    {isSubmittingInfo ? "Submitting..." : "Submit to Officer"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal: Withdraw Complaint */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-red-900 text-base flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" /> Formal Complaint Withdrawal
              </h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowWithdrawModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleWithdrawComplaint} className="space-y-4">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <strong>Important Notice:</strong> Once withdrawn, the grievance will be permanently marked as Disposed. A formal confirmation notice will be sent to your registered phone/email.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Reason for Withdrawal (Mandatory)</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Mutual resolution reached with college; Full tuition fee refunded by accounts office on Oct 28..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              {withdrawSuccess ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Grievance recorded as withdrawn and closed.
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowWithdrawModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isWithdrawing} className="bg-red-700 hover:bg-red-800 text-white">
                    {isWithdrawing ? "Withdrawing..." : "Confirm Formal Withdrawal"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal: DPDP Section 12 Right to be Forgotten Erasure */}
      {showEraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> DPDP Right to be Forgotten (Data Erasure)
              </h3>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowEraseModal(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleEraseIdentity} className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <strong>Statutory Right under DPDP Act 2023 Section 12:</strong>
                <p className="text-[11px] text-emerald-800">
                  You have the right to demand erasure of your personal identifying data (Name, Phone, Email, Address) from the AICTE grievance repository.
                  Statutory case details (category, institute reference, outcome order) will be retained in anonymized format for regulatory transparency.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Reason for Data Erasure (Mandatory)</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Redressal completed; Requesting expungement of personal contact identifiers per DPDP Act Section 12..."
                  value={eraseReason}
                  onChange={(e) => setEraseReason(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              {eraseSuccess ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Identity successfully erased and recorded in Cryptographic Audit Ledger!
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowEraseModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isErasing} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    {isErasing ? "Expunging Personal Data..." : "Execute DPDP Data Erasure"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Verification unlock panel if limited view */}
      {data.requires_verification && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-amber-700 shrink-0" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Viewing Safe Public Summary</p>
                <p className="text-[11px] text-amber-800">
                  Enter your mobile last 4 digits (or confidential access key) to view the full complaint text and files.
                </p>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Last 4 digits or Access Key"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="h-8 text-xs bg-white border-amber-300 font-mono w-44"
              />
              <Button type="submit" size="sm" disabled={unlocking} className="h-8 text-xs bg-amber-800 hover:bg-amber-900 text-white">
                Unlock Full Details
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Statutory Stage Stepper Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-blue-950 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-900" /> Statutory Redressal Stage Progress
            </span>
            <span className="text-xs font-mono text-slate-500">Stage: {currentStageName}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Mandated stages under AICTE Grievance Redressal Regulations (2024–27)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STAGES_EXPLANATION.map((stg, i) => {
              const activeIdx = STAGES_EXPLANATION.findIndex((x) => x.stage.toLowerCase() === currentStageName.toLowerCase());
              const isDone = isDisposed || (activeIdx >= 0 && activeIdx > i);
              const isCurrent = !isDisposed && activeIdx === i;

              return (
                <div
                  key={stg.stage}
                  className={`rounded-lg p-2.5 border text-center space-y-1 transition-all ${
                    isCurrent
                      ? "border-blue-600 bg-blue-50/80 shadow-xs ring-1 ring-blue-500"
                      : isDone
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50 opacity-60"
                  }`}
                >
                  <div
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">{stg.title}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{stg.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span>
              <strong>Next Action:</strong> {data.next_action}
            </span>
            <span>
              Target Statutory Turnaround: <strong>15–30 Statutory Days</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Citizen Feedback Form (After Resolution) */}
      {isDisposed && (
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-950 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Citizen Resolution Feedback
            </CardTitle>
            <CardDescription className="text-xs text-emerald-800">
              Your feedback is audited under AICTE Quality of Service and Citizen Charter compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {feedbackSubmitted ? (
              <div className="p-3 bg-white border border-emerald-200 rounded-lg text-xs space-y-1 text-slate-800">
                <p className="font-bold text-emerald-900">Thank you for rating your resolution experience!</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= starRating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`}
                    />
                  ))}
                  <span className="font-bold ml-1">{starRating}/5 Stars</span>
                </div>
                {feedbackComment && <p className="text-slate-600 italic">"{feedbackComment}"</p>}
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3 bg-white p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Rate your experience:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setStarRating(s)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-5 w-5 ${s <= starRating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 ml-2">{starRating} of 5</span>
                </div>

                <Textarea
                  rows={2}
                  placeholder="Share feedback on timeliness, officer assistance, or institutional compliance..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="text-xs"
                />

                <Button type="submit" size="sm" disabled={isSubmittingFeedback} className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs">
                  {isSubmittingFeedback ? "Submitting..." : "Submit Rating"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grievance Summary */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-blue-950 flex items-center justify-between">
            <span>Grievance Summary &amp; Institution</span>
            <span className="text-xs font-normal text-slate-500">{data.category}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[11px]">AICTE Approved Institution</span>
              <span className="font-semibold text-slate-900 text-sm">{data.institution_name}</span>
              <span className="text-slate-500 block text-[11px]">State / Region: {data.institution_state}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 block text-[11px]">Bureau in Charge</span>
              <span className="font-semibold text-slate-900 text-sm">
                {data.bureau === "RB" ? "Regional Bureau (RB) — Jurisdiction / Norms" : "Public Grievance Redressal Cell (PGRC)"}
              </span>
              <span className="text-slate-500 block text-[11px]">Intake Channel: {data.channel?.toUpperCase()}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1">
            <span className="font-semibold text-slate-700 block">Description &amp; Grievance Facts:</span>
            <p className="text-slate-800 leading-relaxed">{data.description}</p>
          </div>

          {/* Dynamic Category Specific Data */}
          {data.dynamic_fields && Object.keys(data.dynamic_fields).length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3.5 text-xs space-y-2">
              <span className="font-semibold text-blue-950 block">Category Specific Records ({data.category}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {Object.entries(data.dynamic_fields)
                  .filter(([k]) => !k.startsWith("_") && k !== "stage_history" && k !== "citizen_feedback")
                  .map(([k, v]) => (
                    <div key={k} className="bg-white p-2 rounded border border-blue-100">
                      <span className="text-slate-400 capitalize block">{k.replace(/([A-Z])/g, " $1")}</span>
                      <strong className="text-slate-900">{String(v)}</strong>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Evidence Attachments */}
          {data.evidence && data.evidence.length > 0 && (
            <div className="space-y-2 pt-1 text-xs">
              <span className="font-semibold text-slate-800 block">Attached Evidence Files ({data.evidence.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.evidence.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white shadow-2xs">
                    <FileText className="h-4 w-4 text-blue-900 shrink-0" />
                    <span className="truncate font-medium text-slate-800 text-[11px]">{file.name}</span>
                    <span className="ml-auto text-[10px] text-emerald-600 font-bold shrink-0">Clean</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Timeline & Audit */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-blue-950">Milestone History &amp; Actions</CardTitle>
          <CardDescription className="text-xs">
            Official milestone tracking as mandated by AICTE Citizen Charter and Redressal Regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {data.milestones.map((m: any) => (
              <div key={m.step} className="relative flex items-start gap-4 pl-1">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white z-10 ${
                    m.completed ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {m.completed ? <CheckCircle2 className="h-4 w-4" /> : m.step}
                </span>

                <div className="min-w-0 space-y-0.5 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${m.completed ? "text-slate-900" : "text-slate-500"}`}>
                      {m.title}
                    </span>
                    {m.date && <span className="text-[11px] text-slate-400">· {fmtDate(m.date)}</span>}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}
          </div>

          {data.history && data.history.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Official Action History
              </span>
              <div className="space-y-2">
                {data.history.map((h: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <p className="font-semibold text-blue-950">{h.action}</p>
                      {h.remarks && <p className="text-slate-600 text-[11px] mt-0.5">{h.remarks}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {fmtDateTime(h.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
