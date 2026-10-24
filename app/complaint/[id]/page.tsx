"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock, GitMerge,
  History, Lock, Send, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDate, fmtDateTime } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { ACTOR, OFFICERS, type Bureau, type Complaint, type Status } from "@/lib/mock";

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

// ── Action panel ───────────────────────────────────────────────────────────
function ActionPanel({ c, readOnly }: { c: Complaint; readOnly: boolean }) {
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
  const { complaints, overlapAlerts, audit, role, getInstitution, sendReminder, escalateCase } = useApp();
  const [adjState, setAdjState] = useState<{
    alertId: string; otherCaseId: string; decision: "Confirmed Duplicate" | "Dismissed (Distinct)";
  } | null>(null);

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

      <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
        <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
      </LinkButton>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-blue-950">{c.id}</h1>
        <BureauBadge bureau={c.bureau} />
        <StatusBadge status={c.status} />
        <SlaBadge state={sla.state} daysLeft={sla.daysLeft} />
        <span className="text-sm text-slate-500">{c.category}</span>
      </div>

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

          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-blue-950">Complaint</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {c.description ? (
                <p className="rounded-md bg-slate-50 p-4 leading-relaxed text-slate-800 ring-1 ring-slate-200">
                  {c.description}
                </p>
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
        </div>

        <div className="space-y-5">
          <ActionPanel key={c.id} c={c} readOnly={readOnly} />

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
    </div>
  );
}
