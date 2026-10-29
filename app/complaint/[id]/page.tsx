"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock, GitMerge,
  History, Lock, Send, User, ShieldAlert, Eye, EyeOff, Paperclip,
  FileText, FileAudio, FileVideo, Image as ImageIcon, Download, AlertTriangle,
  Layers, ListTodo, Sparkles, Bot, Scale, Edit3, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BureauBadge, ChannelBadge, LinkButton, SlaBadge, StatusBadge, fmtDate, fmtDateTime } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { ACTOR, OFFICERS, type Bureau, type Complaint, type Status, type Role } from "@/lib/mock";
import { CATEGORY_SCHEMAS } from "@/lib/intake-schemas";
import { ConflictBanner } from "@/components/conflict-banner";
import { UnifiedTimeline } from "@/components/timeline";
import { TasksDrawer } from "@/components/tasks-drawer";
import { DistressBanner } from "@/components/distress-banner";
import { AISummaryCard } from "@/components/ai-summary-card";
import { RAGReplyDialog } from "@/components/rag-reply-dialog";
import { PIITextViewer } from "@/components/pii-toggle";
import { AICategorizationPrediction } from "@/lib/ai/types";

// ── Adjudication dialog ────────────────────────────────────────────────────
function AdjudicateDialog({
  alertId,
  otherCaseId,
  decision,
  onClose,
}: {
  alertId: string;
  otherCaseId: string;
  decision: "Confirmed Duplicate" | "Dismissed (Distinct)";
  onClose: () => void;
}) {
  const { adjudicateAlert, role } = useApp();
  const [leadBureau, setLeadBureau] = useState<Bureau>("RB");
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!note.trim()) return;
    await adjudicateAlert({
      alertId,
      decision,
      lead_bureau: decision === "Confirmed Duplicate" ? leadBureau : undefined,
      note: note.trim(),
      adjudicated_by: ACTOR[role],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-base font-semibold text-slate-900">
            {decision === "Confirmed Duplicate" ? "Confirm Duplicate" : "Mark as Not Related"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Affects both this case and {otherCaseId}</p>
        </div>
        <div className="space-y-4 px-6 py-4">
          {decision === "Confirmed Duplicate" && (
            <div className="space-y-1.5">
              <Label>Lead Bureau (other case will be put on hold)</Label>
              <Select value={leadBureau} onValueChange={(v) => { if (v) setLeadBureau(v as Bureau); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RB">RB</SelectItem>
                  <SelectItem value="PGRC">PGRC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Adjudication note <span className="text-red-500">*</span></Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={decision === "Confirmed Duplicate"
                ? "e.g. Identical institution and fee-related issue — RB to lead proceedings."
                : "e.g. Different academic years; factually distinct complaints."}
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!note.trim()}
            className={decision === "Confirmed Duplicate" ? "bg-orange-600 hover:bg-orange-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}
            onClick={submit}
          >
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            {decision === "Confirmed Duplicate" ? "Confirm Duplicate" : "Mark Not Related"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Confidential Identity Reveal Dialog ────────────────────────────────────
function AnonymousRevealDialog({
  complaintId,
  onClose,
  onRevealed,
}: {
  complaintId: string;
  onClose: () => void;
  onRevealed: (data: any) => void;
}) {
  const { role } = useApp();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = async () => {
    if (reason.trim().length < 15) {
      setError("Please provide a statutory justification of at least 15 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/complaints/anonymous-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: complaintId,
          role,
          officer_name: ACTOR[role],
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reveal identity.");
      }
      onRevealed(data.identity);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to access confidential identity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <p className="text-base font-semibold text-slate-900">
              Access Confidential Complainant Identity
            </p>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Grievance Reference: <span className="font-mono font-medium">{complaintId}</span>
          </p>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">⚠️ Mandatory Statutory Audit Requirement</p>
            <p className="mt-1">
              Unmasking whistleblower identity is permanently recorded in the immutable audit log with your name (<span className="font-medium">{ACTOR[role]}</span>), timestamp, and justification reason.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revealReason">
              Official Justification / Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="revealReason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Required for initiating formal AICTE fact-finding committee inquiry as sanctioned by Chairperson."
              rows={3}
            />
            <p className="text-[11px] text-slate-500">Minimum 15 characters required.</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={loading || reason.trim().length < 15}
            className="bg-red-700 hover:bg-red-800 text-white"
            onClick={handleReveal}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "Verifying..." : "Confirm & Unmask Identity"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── AI Prediction Correction Dialog (3.1) ─────────────────────────────────
function AICorrectionModal({
  complaint,
  onClose,
}: {
  complaint: Complaint;
  onClose: () => void;
}) {
  const { updateComplaint, recordAICorrection, role } = useApp();
  const [category, setCategory] = useState(complaint.category);
  const [urgency, setUrgency] = useState(complaint.urgency || complaint.ai_predictions?.urgency || "medium");
  const [severity, setSeverity] = useState(complaint.ai_predictions?.severity_score || 5);
  const [legalRisk, setLegalRisk] = useState(Boolean(complaint.legal_risk || complaint.ai_predictions?.legal_risk));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // 1. Log correction to AI feedback endpoint
      await fetch("/api/ai/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: complaint.id,
          original_predictions: complaint.ai_predictions || {
            predicted_category: complaint.category,
            urgency: complaint.urgency || "medium",
            severity_score: severity,
            legal_risk: complaint.legal_risk || false,
          },
          corrected_category: category,
          corrected_urgency: urgency,
          corrected_severity: severity,
          corrected_legal_risk: legalRisk,
          officer_notes: notes,
          officer_name: ACTOR[role],
        }),
      });

      // 2. Persist correction in store
      await recordAICorrection({
        id: `corr-${complaint.id}-${Date.now()}`,
        complaint_id: complaint.id,
        field: "urgency",
        original_value: complaint.urgency || "medium",
        corrected_value: urgency,
        officer: ACTOR[role],
        reason: notes || `Adjusted priority to ${urgency} and category to ${category}`,
        timestamp: new Date().toISOString(),
      });

      // 3. Update complaint record
      await updateComplaint(complaint.id, {
        category,
        urgency: urgency as any,
        legal_risk: legalRisk,
        remark: `AI predictions corrected by officer (${notes || "routine adjustment"}). Priority: ${urgency.toUpperCase()}.`,
      });

      onClose();
    } catch (err) {
      console.error("Failed to save correction:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-slate-900">Review & Correct AI Predictions</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>✕</Button>
        </div>

        <div className="space-y-4 py-4 text-xs">
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 mt-1 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Urgency Priority</Label>
              <Select value={urgency} onValueChange={(v) => { if (v) setUrgency(v as any); }}>
                <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Severity Score (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value, 10) || 1)}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="legalRiskCheckbox"
              checked={legalRisk}
              onChange={(e) => setLegalRisk(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="legalRiskCheckbox" className="text-xs font-medium cursor-pointer">
              Flag as High Legal / Statutory Risk
            </Label>
          </div>

          <div>
            <Label className="text-xs">Officer Correction Rationale / Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain reason for adjusting AI classification..."
              className="mt-1 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={submitting} className="bg-blue-900 hover:bg-blue-800 text-white">
            {submitting ? "Saving..." : "Save Correction & Retrain"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Multi-Language Translation Viewer (3.9) ────────────────────────────────
function TranslationViewer({
  description,
  role,
  isAssignedOfficer,
}: {
  description: string;
  role: Role;
  isAssignedOfficer: boolean;
}) {
  const [targetLang, setTargetLang] = useState<string>("Original");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [translating, setTranslating] = useState<boolean>(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});

  const handleLangChange = async (lang: string) => {
    setTargetLang(lang);
    if (lang === "Original") return;

    if (translationsCache[lang]) {
      setTranslatedText(translationsCache[lang]);
      return;
    }

    const LANG_CODES: Record<string, string> = {
      English: "en",
      Hindi: "hi",
      Marathi: "mr",
      Tamil: "ta",
      Bengali: "bn",
      Telugu: "te",
    };
    const code = LANG_CODES[lang] || "en";

    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description, target_language: code }),
      });
      const data = await res.json();
      const txt = data.translation?.translated_text || data.translated_text;
      if (res.ok && txt) {
        setTranslatedText(txt);
        setTranslationsCache((prev) => ({ ...prev, [lang]: txt }));
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const LANGUAGES = ["Original", "English", "Hindi", "Marathi", "Tamil", "Bengali", "Telugu"];

  return (
    <div className="space-y-3">
      {/* Language Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Languages className="h-3.5 w-3.5 text-blue-700" />
          <span className="font-semibold">Language View:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLangChange(lang)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                targetLang === lang
                  ? "bg-blue-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Render text: either Original with PII Redaction OR Translated text */}
      {targetLang === "Original" ? (
        <PIITextViewer
          rawText={description}
          role={role}
          isAssignedOfficer={isAssignedOfficer}
        />
      ) : translating ? (
        <div className="rounded-md bg-slate-50 p-6 text-center text-xs text-slate-500 animate-pulse">
          Translating grievance into {targetLang}...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md bg-blue-50/50 p-3.5 leading-relaxed text-slate-800 ring-1 ring-blue-100 text-sm">
            {translatedText}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            ✓ Translated into {targetLang} via AICTE Indic Domain Translation Engine (3.9).
          </p>
        </div>
      )}
    </div>
  );
}

// ── Action panel ───────────────────────────────────────────────────────────
function ActionPanel({
  c,
  readOnly,
  onOpenRagDialog,
}: {
  c: Complaint;
  readOnly: boolean;
  onOpenRagDialog?: () => void;
}) {
  const { updateComplaint, audit } = useApp();
  const [status, setStatus] = useState<Status>(c.status);
  const [officer, setOfficer] = useState(c.assigned_officer);
  const [remark, setRemark] = useState("");
  const [nextAction, setNextAction] = useState(c.next_action || "");
  const [msg, setMsg] = useState<string | null>(null);

  const lastEntry = [...audit]
    .filter((a) => a.complaint_id === c.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // suppress unused warning
  void lastEntry;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateComplaint(c.id, { status, assigned_officer: officer, remark, next_action: nextAction });
    setMsg(ok ? "Case updated and audit log written." : "Nothing to update — change a field or add a remark.");
    if (ok) setRemark("");
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-blue-950">Action Panel</CardTitle>
        <CardDescription>Update status, re-assign or add a remark.</CardDescription>
      </CardHeader>
      <CardContent>
        {readOnly && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-100 p-3 text-xs text-slate-600">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Read-only: this case belongs to {c.bureau}. Switch role to take action.
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => { if (v) setStatus(v as Status); }} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In-Process">In-Process</SelectItem>
                <SelectItem value="Disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned officer</Label>
            <Select value={officer} onValueChange={(v) => { if (v) setOfficer(v); }} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OFFICERS.map((o) => (
                  <SelectItem key={o.name} value={o.name}>{o.name} — {o.bureau}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">Assigning to an officer of the other bureau transfers the case.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Next action</Label>
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Issue show-cause notice"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Remark</Label>
            <Textarea
              value={remark} onChange={(e) => setRemark(e.target.value)} disabled={readOnly}
              placeholder="e.g. Coordinated with PGRC; merging proceedings…" rows={3}
            />
          </div>
          <Button type="submit" disabled={readOnly} className="w-full bg-blue-900 hover:bg-blue-800">
            <Send className="mr-2 h-4 w-4" /> Update Case
          </Button>

          {onOpenRagDialog && !readOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenRagDialog}
              className="w-full border-blue-300 bg-blue-50/60 hover:bg-blue-100 text-blue-900 flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-700" /> AI Draft Statutory Reply (RAG)
            </Button>
          )}

          {msg && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {msg}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ComplaintPage() {
  const { id } = useParams<{ id: string }>();
  const {
    complaints,
    overlapAlerts,
    audit,
    role,
    getInstitution,
    sendReminder,
    escalateCase,
    watchlistedInstitutes,
    unmergeComplaint,
  } = useApp();
  const [adjState, setAdjState] = useState<{
    alertId: string; otherCaseId: string; decision: "Confirmed Duplicate" | "Dismissed (Distinct)";
  } | null>(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealedIdentity, setRevealedIdentity] = useState<any>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [isUnmerging, setIsUnmerging] = useState(false);
  const [ragDialogOpen, setRagDialogOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  const c = complaints.find((x) => x.id === id);
  if (!c) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Complaint {id} not found</p>
        <LinkButton href="/" variant="link">Back to dashboard</LinkButton>
      </div>
    );
  }

  const inst = getInstitution(c.institution_id);
  const siblings = complaints.filter((x) => x.institution_id === c.institution_id);
  const linked = c.overlap_links
    .map((l) => ({ link: l, other: complaints.find((x) => x.id === l.complaint_id)! }))
    .filter((x) => x.other);
  const otherBureaus = Array.from(new Set(linked.map((x) => x.other.bureau)));
  const trail = audit.filter((a) => a.complaint_id === c.id).slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const sla = getSla(c);
  const lastAudit = trail[0];

  const readOnly =
    (role === "RB Officer" && c.bureau !== "RB") || (role === "PGRC Officer" && c.bureau !== "PGRC");

  const isStaff = role === "Admin" || role === "RB Officer" || role === "PGRC Officer" || role === "Chairperson";
  const isWatchlisted = (watchlistedInstitutes || []).some((w) => w.institution_id === c.institution_id);

  return (
    <div className="space-y-5">
      {adjState && (
        <AdjudicateDialog
          alertId={adjState.alertId}
          otherCaseId={adjState.otherCaseId}
          decision={adjState.decision}
          onClose={() => setAdjState(null)}
        />
      )}

      {showRevealModal && (
        <AnonymousRevealDialog
          complaintId={c.id}
          onClose={() => setShowRevealModal(false)}
          onRevealed={(data) => setRevealedIdentity(data)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </LinkButton>

        {isStaff && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-blue-900 text-xs font-semibold text-blue-950 hover:bg-blue-50"
              onClick={() => setTasksOpen(true)}
            >
              <ListTodo className="mr-1.5 h-3.5 w-3.5 text-blue-700" /> Inter-Bureau Tasks
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-blue-950">{c.id}</h1>
        {c.tracking_id && (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
            {c.tracking_id}
          </span>
        )}
        <BureauBadge bureau={c.bureau} />
        <StatusBadge status={c.status} />
        <ChannelBadge channel={c.channel} />

        {c.is_anonymous && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-900">
            <ShieldAlert className="h-3.5 w-3.5 text-purple-700" /> Confidential
          </span>
        )}

        {isWatchlisted && (
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Watchlisted Institute
          </Link>
        )}

        {c.is_triage ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
            title={c.routing_rationale || "Low routing confidence — awaiting officer review"}
          >
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Triage Queue ({Math.round((c.routing_confidence || 0) * 100)}%)
          </span>
        ) : c.routing_confidence !== undefined ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
            title={c.routing_rationale || "Auto-routed by AICTE classifier"}
          >
            <Sparkles className="h-3 w-3 text-blue-600" /> Auto-routed ({Math.round(c.routing_confidence * 100)}%)
          </span>
        ) : null}

        {c.is_merged && (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-900">
            <GitMerge className="h-3 w-3 text-purple-700" /> Merged Docket
          </span>
        )}

        {c.merged_complaint_ids && c.merged_complaint_ids.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
            <Layers className="h-3 w-3 text-blue-700" /> Master Docket ({c.merged_complaint_ids.length} children)
          </span>
        )}

        <SlaBadge state={sla.state} daysLeft={sla.daysLeft} />
        <span className="text-sm text-slate-500">{c.category}</span>
      </div>

      {/* Cross-bureau contradictory directive conflict banner */}
      <ConflictBanner complaintId={c.id} institutionId={c.institution_id} />

      {/* 3.3 Distress & Sentiment SOS Banner */}
      {c.has_distress && (
        <DistressBanner
          complaintId={c.id}
          distress={c.distress_details}
        />
      )}

      {/* 3.1 AI Categorisation & Priority Intelligence Strip */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-blue-950">
              <Bot className="h-4 w-4 text-blue-700" /> AI Classification:
            </span>

            {/* Urgency Badge */}
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                (c.urgency || c.ai_predictions?.urgency) === "critical"
                  ? "bg-red-600 text-white animate-pulse"
                  : (c.urgency || c.ai_predictions?.urgency) === "high"
                  ? "bg-orange-500 text-white"
                  : (c.urgency || c.ai_predictions?.urgency) === "low"
                  ? "bg-slate-200 text-slate-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              Priority: {c.urgency || c.ai_predictions?.urgency || "medium"}
            </span>

            {/* Severity Score */}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
              Severity: {c.ai_predictions?.severity_score || (c.urgency === "critical" ? 9 : 6)}/10
            </span>

            {/* Legal Risk Flag */}
            {(c.legal_risk || c.ai_predictions?.legal_risk) && (
              <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                <Scale className="h-3 w-3 text-amber-700" /> Legal Risk Flagged
              </span>
            )}

            {/* Fraud Shield Tier */}
            {c.fraud_score !== undefined && c.fraud_score > 30 && (
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                  c.fraud_score >= 70
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <ShieldAlert className="h-3 w-3" /> Fraud Score: {c.fraud_score}/100
              </span>
            )}
          </div>

          {/* Officer Edit AI Predictions Button */}
          {isStaff && !readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCorrectionModalOpen(true)}
              className="h-7 text-xs border-blue-300 text-blue-900 hover:bg-blue-100 flex items-center gap-1"
            >
              <Edit3 className="h-3 w-3" /> Adjust AI Priority & Category
            </Button>
          )}
        </div>
      </div>

      {/* Merged Child Docket notification */}
      {c.is_merged && c.master_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 mt-0.5">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-950">
                Consolidated Case · Consolidated into Master Case{" "}
                <Link href={`/complaint/${c.master_id}`} className="underline font-bold text-blue-900 hover:text-blue-700">
                  {c.master_id}
                </Link>
              </p>
              <p className="text-xs text-purple-800 mt-0.5">
                Lead Bureau: <span className="font-semibold">{c.lead_bureau || c.bureau}</span>. Status and substantive directions automatically mirror the master docket. Complainant contact and evidence remain distinct.
              </p>
            </div>
          </div>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              disabled={isUnmerging}
              className="h-8 border-purple-300 text-xs font-medium text-purple-900 hover:bg-purple-100 shrink-0"
              onClick={async () => {
                if (!confirm(`Unmerge complaint ${c.id} from master case ${c.master_id}? It will resume independent proceedings.`)) return;
                setIsUnmerging(true);
                try {
                  await unmergeComplaint(c.id);
                } finally {
                  setIsUnmerging(false);
                }
              }}
            >
              {isUnmerging ? "Unmerging..." : "Unmerge Docket"}
            </Button>
          )}
        </div>
      )}

      {/* Master Docket banner */}
      {c.merged_complaint_ids && c.merged_complaint_ids.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-slate-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mt-0.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-950">
                Lead Master Docket · Consolidating {c.merged_complaint_ids.length} Related Grievance(s)
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5 items-center text-xs text-slate-700">
                <span className="font-medium text-slate-600">Child Dockets:</span>
                {c.merged_complaint_ids.map((childId) => (
                  <Link
                    key={childId}
                    href={`/complaint/${childId}`}
                    className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-900 hover:underline"
                  >
                    {childId}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <span className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 shrink-0">
            Lead Bureau: {c.lead_bureau || c.bureau}
          </span>
        </div>
      )}

      {/* Case Snapshot strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Bureau", value: <BureauBadge bureau={c.bureau} /> },
          { label: "Officer", value: <span className="flex items-center gap-1 text-sm font-medium"><User className="h-3.5 w-3.5 text-slate-400" />{c.assigned_officer}</span> },
          { label: "Status", value: <StatusBadge status={c.status} /> },
          { label: "Last action", value: lastAudit ? <span className="text-xs text-slate-600">{lastAudit.action.slice(0, 40)}<br /><span className="text-slate-400">{fmtDate(lastAudit.timestamp)}</span></span> : <span className="text-xs text-slate-400">—</span> },
          { label: "Next action", value: <span className="text-xs text-slate-700">{c.next_action || "—"}</span> },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</p>
            {value}
          </div>
        ))}
      </div>

      {/* SLA actions */}
      {c.status !== "Disposed" && (sla.state === "Overdue" || sla.state === "Due soon") && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {sla.state === "Overdue"
                ? `Overdue by ${-sla.daysLeft} day(s) — SLA breach`
                : `Due in ${sla.daysLeft} day(s) — act promptly`}
              {sla.escalationLevel > 0 && ` · L${sla.escalationLevel}: ${sla.escalationAuthority}`}
            </p>
            <p className="text-xs text-amber-700">Due date: {fmtDate(sla.due)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300" onClick={() => sendReminder(c.id)}>
              Send reminder
            </Button>
            {sla.escalationLevel > 0 && (
              <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => escalateCase(c.id)}>
                Escalate
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Overlap banner */}
      {c.is_overlap_flagged && (
        <div className="rounded-lg border border-red-300 bg-gradient-to-r from-red-50 to-orange-50 p-4 shadow-sm">
          <p className="font-semibold text-red-800">
            ⚠️ Potential Overlap Detected: Similar case(s) in {otherBureaus.join(" & ")}
          </p>
          <div className="mt-3 space-y-3">
            {linked.map(({ link, other }) => {
              const pairKey = [c.id, other.id].sort().join("|");
              const alert = overlapAlerts.find((a) => a.id === pairKey);
              const compareIds = [c.id, other.id].sort();
              return (
                <div key={other.id} className="rounded-md bg-white/80 p-3 ring-1 ring-red-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/complaint/${other.id}`} className="text-sm font-semibold text-blue-900 hover:underline">{other.id}</Link>
                        <BureauBadge bureau={other.bureau} />
                        <StatusBadge status={other.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {link.reason} · Score: {Math.round(link.score * 100)}% · Officer: {other.assigned_officer}
                      </p>
                      {other.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{other.description}</p>
                      ) : (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 italic">
                          <Lock className="h-3 w-3 text-slate-400" /> Restricted: owned by {other.bureau}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Adjudication panel */}
                  {alert && alert.status === "Open" ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-red-100 pt-3">
                      <LinkButton href={`/compare/${compareIds[0]}/${compareIds[1]}`} variant="outline" size="sm" className="h-7 text-xs border-red-200 text-red-700 flex items-center">
                        Review pair <ArrowRight className="ml-1 h-3 w-3" />
                      </LinkButton>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white"
                        onClick={() => setAdjState({ alertId: pairKey, otherCaseId: other.id, decision: "Confirmed Duplicate" })}
                      >
                        Confirm Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-slate-300"
                        onClick={() => setAdjState({ alertId: pairKey, otherCaseId: other.id, decision: "Dismissed (Distinct)" })}
                      >
                        Not Related
                      </Button>
                    </div>
                  ) : alert ? (
                    <div className="mt-3 border-t border-red-100 pt-2">
                      <p className="text-xs text-slate-500">
                        Adjudicated: <span className="font-medium text-slate-700">{alert.status}</span>
                        {alert.adjudicated_by && ` · by ${alert.adjudicated_by}`}
                        {alert.note && ` — ${alert.note}`}
                      </p>
                      <Link href={`/compare/${compareIds[0]}/${compareIds[1]}`} className="mt-1 text-xs text-blue-700 hover:underline block">
                        View comparison →
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-950">
                <Building2 className="h-5 w-5" /> Institution
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
              <div className="sm:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Name</p>
                <Link href={`/institution/${c.institution_id}`} className="text-base font-semibold text-blue-800 hover:underline">
                  {inst?.name}
                </Link>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">AICTE ID</p>
                <p className="font-medium">{inst?.aicte_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Region</p>
                <p className="font-medium">{inst?.region}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Complaints on file</p>
                <p className="font-medium">
                  {siblings.length} ({siblings.filter((s) => s.bureau === "RB").length} RB ·{" "}
                  {siblings.filter((s) => s.bureau === "PGRC").length} PGRC)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3.2 AI Case Summary */}
          {c.description && (
            <AISummaryCard
              complaintId={c.id}
              description={c.description}
              category={c.category}
              institutionName={inst?.name || ""}
              initialSummary={c.ai_summary}
            />
          )}

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-blue-950">Complaint</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {c.description ? (
                <TranslationViewer
                  description={c.description}
                  role={role}
                  isAssignedOfficer={c.assigned_officer === ACTOR[role]}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-slate-100 p-4 text-sm text-slate-500 italic border border-slate-200">
                  <Lock className="h-4 w-4 text-slate-400" /> Restricted: grievance record owned by {c.bureau} bureau.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Received</p>
                  <p className="font-medium">{fmtDate(c.date_received)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">SLA due</p>
                  <p className="font-medium">{fmtDate(sla.due)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Category</p>
                  <p className="font-medium">{c.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Whistleblower / Confidential Identity Box */}
          {c.is_anonymous && (
            <Card className="border-purple-200 bg-purple-50/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-950 text-base">
                  <ShieldAlert className="h-5 w-5 text-purple-700" /> Whistleblower / Confidential Grievance
                </CardTitle>
                <CardDescription className="text-purple-800/80">
                  Complainant personal details are stored encrypted. Unmasking is strictly restricted to Admin and Chairperson per statutory whistleblower rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {revealedIdentity ? (
                  <div className="rounded-lg border border-purple-200 bg-white p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">Decrypted Identity Record</span>
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-slate-500" onClick={() => setRevealedIdentity(null)}>
                        <EyeOff className="mr-1 h-3 w-3" /> Hide
                      </Button>
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-slate-400 uppercase text-[10px]">Full Name</p>
                        <p className="font-semibold text-slate-900">{revealedIdentity.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase text-[10px]">Contact Phone</p>
                        <p className="font-semibold text-slate-900">{revealedIdentity.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase text-[10px]">Email Address</p>
                        <p className="font-semibold text-slate-900">{revealedIdentity.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase text-[10px]">Address</p>
                        <p className="font-semibold text-slate-900">{revealedIdentity.address || "—"}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-700 pt-1">
                      ✓ Identity unmasking was logged in the audit trail.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200/70 bg-white/80 p-3">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Identity Status:</span> Encrypted in secure enclave.
                      {c.complainant_phone_last4 && ` (Verified phone ending in ****${c.complainant_phone_last4})`}
                    </div>
                    {role === "Admin" || role === "Chairperson" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-purple-300 text-purple-900 hover:bg-purple-100"
                        onClick={() => setShowRevealModal(true)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Reveal Identity (Statutory Justification)
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Unmasking restricted to Admin & Chairperson
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dynamic Category Specific Details */}
          {c.dynamic_fields && Object.keys(c.dynamic_fields).filter((k) => !k.startsWith("_")).length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-950 text-base">
                  <FileText className="h-4 w-4 text-blue-800" /> Category-Specific Parameters ({c.category})
                </CardTitle>
                <CardDescription>
                  Dynamic schema fields captured for this specific norm category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(c.dynamic_fields)
                    .filter(([key]) => !key.startsWith("_"))
                    .map(([key, value]) => {
                      const schema = Object.values(CATEGORY_SCHEMAS).find((s) => s.fields.some((f) => f.id === key));
                      const field = schema?.fields.find((f) => f.id === key);
                      const label = field?.label || key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                      return (
                        <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                          <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900 break-words">
                            {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "—")}
                          </dd>
                        </div>
                      );
                    })}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Attached Evidence */}
          {c.evidence && c.evidence.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-950 text-base">
                  <Paperclip className="h-4 w-4 text-blue-800" /> Attached Evidence ({c.evidence.length})
                </CardTitle>
                <CardDescription>
                  Verified documents and media uploaded with this complaint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {c.evidence.map((file, idx) => {
                    const isImg = file.type.startsWith("image/");
                    const isAudio = file.type.startsWith("audio/");
                    const isVideo = file.type.startsWith("video/");
                    const Icon = isImg ? ImageIcon : isAudio ? FileAudio : isVideo ? FileVideo : FileText;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-900">{file.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {(file.size / 1024).toFixed(1)} KB · {file.type.split("/")[1]?.toUpperCase() || file.type}
                            </p>
                          </div>
                        </div>
                        {file.dataUrl || file.url ? (
                          <a
                            href={file.dataUrl || file.url}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 p-1.5 text-slate-500 hover:text-blue-700 rounded-md hover:bg-slate-100"
                            title="Download / View"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Archived</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Unified Cross-Bureau Timeline */}
          <UnifiedTimeline complaintId={c.id} readOnly={readOnly} />
        </div>

        <div className="space-y-5">
          <ActionPanel key={c.id} c={c} readOnly={readOnly} onOpenRagDialog={() => setRagDialogOpen(true)} />

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-950">
                <History className="h-5 w-5" /> Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-2 space-y-5 border-l-2 border-slate-200 pl-5">
                {trail.map((a, i) => {
                  const engine = a.officer.includes("Engine");
                  return (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${engine ? "bg-red-500" : i === 0 ? "bg-blue-700" : "bg-slate-400"}`}
                      />
                      <p className="text-sm font-semibold text-slate-800">{a.action}</p>
                      <p className="text-xs text-slate-500">{fmtDateTime(a.timestamp)} · {a.officer}</p>
                      {a.remarks && a.remarks !== "—" && <p className="mt-1 text-xs text-slate-600">{a.remarks}</p>}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Case-specific inter-bureau task drawer */}
      <TasksDrawer
        isOpen={tasksOpen}
        onClose={() => setTasksOpen(false)}
        presetComplaintId={c.id}
      />

      {/* 3.4 AI Precedent & RAG Statutory Reply Drafter */}
      <RAGReplyDialog
        isOpen={ragDialogOpen}
        onClose={() => setRagDialogOpen(false)}
        complaintId={c.id}
        description={c.description || ""}
        category={c.category}
        institutionName={inst?.name || ""}
      />

      {/* 3.1 AI Predictions & Priority Correction Modal */}
      {correctionModalOpen && (
        <AICorrectionModal
          complaint={c}
          onClose={() => setCorrectionModalOpen(false)}
        />
      )}
    </div>
  );
}
