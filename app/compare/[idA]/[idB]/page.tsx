"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, GitMerge, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { sharedTokens, jaccard } from "@/lib/overlap";
import { ACTOR, type Bureau } from "@/lib/mock";

function HighlightedText({ text, bureau, shared }: { text: string | null; bureau: string; shared: Set<string> }) {
  if (!text) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-slate-100 p-4 text-xs text-slate-500 italic border border-slate-200">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        Restricted: owned by {bureau}
      </div>
    );
  }
  const words = text.split(/(\s+)/);
  return (
    <p className="rounded-md bg-slate-50 p-4 leading-relaxed ring-1 ring-slate-200 text-sm">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        const stem = clean.length > 3 && clean.endsWith("s") && !clean.endsWith("ss") ? clean.slice(0, -1) : clean;
        const isShared = clean.length > 2 && (shared.has(clean) || shared.has(stem));
        return isShared ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{word}</mark>
        ) : (
          <span key={i}>{word}</span>
        );
      })}
    </p>
  );
}

function AdjudicatePanel({
  alertId,
  alertStatus,
  adjNote,
  adjBy,
}: {
  alertId: string;
  alertStatus: string;
  adjNote?: string;
  adjBy?: string;
}) {
  const { adjudicateAlert, role } = useApp();
  const [leadBureau, setLeadBureau] = useState<Bureau>("RB");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  if (done || alertStatus !== "Open") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Adjudicated: <span className="text-blue-800">{alertStatus}</span></p>
        {adjBy && <p className="text-xs mt-1">By {adjBy}{adjNote ? ` — ${adjNote}` : ""}</p>}
      </div>
    );
  }

  const submit = async (decision: "Confirmed Duplicate" | "Dismissed (Distinct)") => {
    if (!note.trim()) return;
    await adjudicateAlert({
      alertId, decision,
      lead_bureau: decision === "Confirmed Duplicate" ? leadBureau : undefined,
      note: note.trim(),
      adjudicated_by: ACTOR[role],
    });
    setDone(true);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Adjudicate this overlap</p>
      <div className="space-y-1.5">
        <Label>Lead Bureau (for Confirm Duplicate)</Label>
        <Select value={leadBureau} onValueChange={(v) => { if (v) setLeadBureau(v as Bureau); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RB">RB</SelectItem>
            <SelectItem value="PGRC">PGRC</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Note <span className="text-red-500">*</span></Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for decision…"
          rows={2}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!note.trim()}
          className="bg-orange-600 hover:bg-orange-500 text-white"
          onClick={() => submit("Confirmed Duplicate")}
        >
          <GitMerge className="mr-1.5 h-3.5 w-3.5" /> Confirm Duplicate
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!note.trim()}
          onClick={() => submit("Dismissed (Distinct)")}
        >
          Not Related
        </Button>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const { idA, idB } = useParams<{ idA: string; idB: string }>();
  const { complaints, overlapAlerts, getInstitution } = useApp();

  const ca = complaints.find((x) => x.id === idA);
  const cb = complaints.find((x) => x.id === idB);

  if (!ca || !cb) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Cases not found</p>
        <LinkButton href="/" variant="link">Back to dashboard</LinkButton>
      </div>
    );
  }

  const alertId = [idA, idB].sort().join("|");
  const alert = overlapAlerts.find((a) => a.id === alertId);
  const score = jaccard(ca.description, cb.description);
  const shared = sharedTokens(ca.description, cb.description);
  const instA = getInstitution(ca.institution_id);
  const instB = getInstitution(cb.institution_id);
  const slaA = getSla(ca);
  const slaB = getSla(cb);

  const reasons: string[] = [];
  if (ca.institution_id === cb.institution_id) reasons.push("Same institution");
  if (score >= 0.35) reasons.push(`${Math.round(score * 100)}% text similarity`);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </LinkButton>
        <h1 className="text-xl font-bold text-blue-950">Side-by-Side Comparison</h1>
      </div>

      {/* Score + reason chips */}
      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-[200px] flex-1">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Text Similarity</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${score >= 0.5 ? "bg-red-500" : score >= 0.35 ? "bg-orange-400" : "bg-slate-400"}`}
                  style={{ width: `${Math.round(score * 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-800 w-10">{Math.round(score * 100)}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{shared.size} shared token(s) · Yellow = matched words</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <span key={r} className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">{r}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { c: ca, inst: instA, sla: slaA },
          { c: cb, inst: instB, sla: slaB },
        ].map(({ c, inst, sla }) => (
          <Card key={c.id} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-blue-950">
                  <Link href={`/complaint/${c.id}`} className="hover:underline">{c.id}</Link>
                </CardTitle>
                <BureauBadge bureau={c.bureau} />
                <StatusBadge status={c.status} />
                <SlaBadge state={sla.state} daysLeft={sla.daysLeft} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{c.category} · {inst?.name} · {inst?.region}</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <HighlightedText text={c.description} bureau={c.bureau} shared={shared} />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="uppercase tracking-wider text-slate-400">Received</p>
                  <p className="font-medium">{fmtDate(c.date_received)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-slate-400">Officer</p>
                  <p className="font-medium">{c.assigned_officer}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-slate-400">SLA due</p>
                  <p className="font-medium">{fmtDate(sla.due)}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-slate-400">AICTE ID</p>
                  <p className="font-medium">{inst?.aicte_id}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Next action</p>
                <p className="text-sm text-slate-700">{c.next_action || "—"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Adjudication */}
      {alert && (
        <AdjudicatePanel
          alertId={alertId}
          alertStatus={alert.status}
          adjNote={alert.note}
          adjBy={alert.adjudicated_by}
        />
      )}
    </div>
  );
}
