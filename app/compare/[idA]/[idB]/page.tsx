"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  GitMerge,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, LinkButton, SlaBadge, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { sharedTokens, jaccard } from "@/lib/overlap";
import { ACTOR, type Bureau } from "@/lib/mock";
import {
  cosineSimilarity,
  defaultEmbeddingService,
  SEMANTIC_THRESHOLDS,
  findSharedPhrases,
} from "@/lib/embeddings";

function HighlightedText({
  text,
  bureau,
  shared,
  phrases = [],
}: {
  text: string | null;
  bureau: string;
  shared: Set<string>;
  phrases?: string[];
}) {
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
        const stem =
          clean.length > 3 && clean.endsWith("s") && !clean.endsWith("ss")
            ? clean.slice(0, -1)
            : clean;
        const isShared = clean.length > 2 && (shared.has(clean) || shared.has(stem));
        return isShared ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-medium">
            {word}
          </mark>
        ) : (
          <span key={i}>{word}</span>
        );
      })}
    </p>
  );
}

export default function ComparePage() {
  const { idA, idB } = useParams<{ idA: string; idB: string }>();
  const { complaints, overlapAlerts, getInstitution, mergeComplaints, unmergeComplaint, adjudicateAlert, role } =
    useApp();

  const ca = complaints.find((x) => x.id === idA);
  const cb = complaints.find((x) => x.id === idB);

  // Semantic Embeddings state
  const [semanticScore, setSemanticScore] = useState<number>(0);
  const [thresholds, setThresholds] = useState(SEMANTIC_THRESHOLDS);
  const [sharedPhrasesList, setSharedPhrasesList] = useState<string[]>([]);

  // Merge state
  const [masterId, setMasterId] = useState<string>(idA || "");
  const [mergeLeadBureau, setMergeLeadBureau] = useState<Bureau>("RB");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (ca?.description && cb?.description) {
      Promise.all([
        ca.embedding || defaultEmbeddingService.embed(ca.description),
        cb.embedding || defaultEmbeddingService.embed(cb.description),
      ]).then(([vecA, vecB]) => {
        if (!active) return;
        const score = cosineSimilarity(vecA, vecB);
        setSemanticScore(score);
        const phrases = findSharedPhrases(ca.description, cb.description);
        setSharedPhrasesList(phrases);
      });
    }
    return () => {
      active = false;
    };
  }, [ca, cb]);

  if (!ca || !cb) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">Cases not found</p>
        <LinkButton href="/" variant="link">
          Back to dashboard
        </LinkButton>
      </div>
    );
  }

  const alertId = [idA, idB].sort().join("|");
  const alert = overlapAlerts.find((a) => a.id === alertId);
  const lexicalScore = jaccard(ca.description, cb.description);
  const shared = sharedTokens(ca.description, cb.description);
  const instA = getInstitution(ca.institution_id);
  const instB = getInstitution(cb.institution_id);
  const slaA = getSla(ca);
  const slaB = getSla(cb);

  // Match category evaluation based on configurable thresholds
  const isLikelyDuplicate = semanticScore >= thresholds.likelyDuplicate;
  const isPossiblyRelated = semanticScore >= thresholds.possiblyRelated && !isLikelyDuplicate;

  const childId = masterId === idA ? idB : idA;
  const isMerged = ca.master_id === cb.id || cb.master_id === ca.id || ca.is_merged || cb.is_merged;
  const activeMaster = ca.master_id ? cb : cb.master_id ? ca : ca.merged_complaint_ids?.includes(cb.id) ? ca : null;

  const handleMerge = async () => {
    setMergeLoading(true);
    const ok = await mergeComplaints(masterId, [childId], mergeLeadBureau);
    setMergeLoading(false);
    if (ok) {
      setMergeSuccess(`Successfully merged child case ${childId} under master case ${masterId} with ${mergeLeadBureau} as Lead Bureau.`);
      setTimeout(() => setMergeSuccess(null), 6000);
    }
  };

  const handleUnmerge = async (cId: string) => {
    setMergeLoading(true);
    const ok = await unmergeComplaint(cId);
    setMergeLoading(false);
    if (ok) {
      setMergeSuccess(`Case ${cId} has been detached and unmerged back to independent status.`);
      setTimeout(() => setMergeSuccess(null), 6000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </LinkButton>
        <h1 className="text-xl font-bold text-blue-950">Semantic Side-by-Side Comparison (2.1 & 2.3)</h1>
      </div>

      {mergeSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{mergeSuccess}</span>
        </div>
      )}

      {/* Semantic Vector Meter & Match Classification Banner */}
      <Card className={`border-2 ${isLikelyDuplicate ? "border-red-400 bg-red-50/60" : isPossiblyRelated ? "border-orange-400 bg-orange-50/60" : "border-slate-200 bg-slate-50/70"}`}>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-700" />
                <p className="text-xs uppercase tracking-wider font-bold text-slate-600">
                  Multilingual Semantic Cosine Similarity
                </p>
                {isLikelyDuplicate ? (
                  <span className="rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                    Likely Duplicate (≥ {Math.round(thresholds.likelyDuplicate * 100)}%)
                  </span>
                ) : isPossiblyRelated ? (
                  <span className="rounded-full bg-orange-500 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                    Possibly Related (≥ {Math.round(thresholds.possiblyRelated * 100)}%)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-600 text-white px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                    Distinct / Low Similarity
                  </span>
                )}
              </div>

              {/* Vector Cosine Meter */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLikelyDuplicate ? "bg-red-600" : isPossiblyRelated ? "bg-orange-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.round(semanticScore * 100)}%` }}
                  />
                </div>
                <span className="text-base font-extrabold text-slate-900 w-12 text-right">
                  {Math.round(semanticScore * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Cosine Distance: {Math.round((1 - semanticScore) * 100) / 100} · Lexical Jaccard Overlap: {Math.round(lexicalScore * 100)}% ({shared.size} shared tokens)
              </p>
            </div>

            {/* Threshold Adjuster */}
            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200 text-xs">
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-600 font-medium">Duplicate Threshold:</span>
              <Select
                value={String(thresholds.likelyDuplicate)}
                onValueChange={(v) => { if (v) setThresholds({ ...thresholds, likelyDuplicate: parseFloat(v) }); }}
              >
                <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.80">0.80 (80%)</SelectItem>
                  <SelectItem value="0.85">0.85 (85%)</SelectItem>
                  <SelectItem value="0.90">0.90 (90%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shared Phrases Chip Strip */}
          {sharedPhrasesList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-600 mr-1">Matching Semantic Phrases:</span>
              {sharedPhrasesList.map((phrase, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 px-2.5 py-0.5 text-[11px] font-medium"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge & Lead-Bureau Workflow Panel (2.3) */}
      <Card className="border-blue-200 bg-blue-50/40 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-950 text-base flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-blue-800" /> Merge & Lead-Bureau Consolidation Workflow (2.3)
          </CardTitle>
          <CardDescription className="text-xs">
            Consolidate duplicate grievances into a master docket. Child cases mirror status updates while preserving complainant confidentiality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMerged ? (
            <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 text-indigo-900 text-xs font-bold px-2 py-0.5 border border-indigo-300">
                    CONSOLIDATED MASTER DOCKET
                  </span>
                  <span className="text-xs text-slate-600">
                    Master Case: <strong className="text-blue-950">{activeMaster?.id || masterId}</strong> · Lead Bureau: <strong className="text-blue-950">{activeMaster?.lead_bureau || ca.lead_bureau || cb.lead_bureau || "RB"}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => handleUnmerge(ca.is_merged ? ca.id : cb.id)}
                  disabled={mergeLoading}
                >
                  <Undo2 className="mr-1 h-3 w-3" /> Un-merge Case
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Child complaints retain their original filing channels, attachments, and tracking codes, but automatically mirror all official status transitions from the master case.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3 bg-white p-3.5 rounded-lg border border-blue-100">
              <div className="space-y-1">
                <Label className="text-xs">Designate Master Case</Label>
                <Select value={masterId} onValueChange={(v) => { if (v) setMasterId(v); }}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ca.id}>{ca.id} ({ca.bureau})</SelectItem>
                    <SelectItem value={cb.id}>{cb.id} ({cb.bureau})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Mandatory Lead Bureau</Label>
                <Select value={mergeLeadBureau} onValueChange={(v) => { if (v) setMergeLeadBureau(v as Bureau); }}>
                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RB">Regional Bureau (RB)</SelectItem>
                    <SelectItem value="PGRC">PGRC Bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                className="h-8 text-xs bg-blue-900 hover:bg-blue-800 text-white"
                onClick={handleMerge}
                disabled={mergeLoading}
              >
                <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                {mergeLoading ? "Merging Cases..." : `Merge ${childId} into Master ${masterId}`}
              </Button>

              <span className="text-[11px] text-slate-500 pb-1">
                Child case updates will automatically mirror master case {masterId}.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side-by-side Complaint Views */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { c: ca, inst: instA, sla: slaA },
          { c: cb, inst: instB, sla: slaB },
        ].map(({ c, inst, sla }) => (
          <Card key={c.id} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-blue-950">
                  <Link href={`/complaint/${c.id}`} className="hover:underline">
                    {c.id}
                  </Link>
                </CardTitle>
                <BureauBadge bureau={c.bureau} />
                <StatusBadge status={c.status} />
                <SlaBadge state={sla.state} daysLeft={sla.daysLeft} />
                {c.is_merged && (
                  <span className="rounded bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold border border-indigo-200">
                    Merged Child (Master: {c.master_id})
                  </span>
                )}
                {c.merged_complaint_ids && c.merged_complaint_ids.length > 0 && (
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                    Lead Master (+{c.merged_complaint_ids.length} merged)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {c.category} · {inst?.name} · {inst?.region}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <HighlightedText text={c.description} bureau={c.bureau} shared={shared} phrases={sharedPhrasesList} />
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
    </div>
  );
}
