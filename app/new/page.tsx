"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BureauBadge, LinkButton, StatusBadge, fmtDate } from "@/components/ui-bits";
import { useApp } from "@/lib/store";
import { DEMO_TODAY, OFFICERS, type Bureau, type Complaint } from "@/lib/mock";
import { jaccard, OVERLAP_CONFIG } from "@/lib/overlap";

const CATEGORIES = [
  "Fee Regulation", "Faculty Norms", "Admission Irregularity",
  "Approval / Affiliation", "Infrastructure", "Scholarship",
  "Hostel & Amenities", "Student Services", "Recognition",
];

export default function NewCasePage() {
  const router = useRouter();
  void router; // may be used for redirect after submit
  const { complaints, institutions, addComplaint } = useApp();

  const [bureau, setBureau] = useState<Bureau>("RB");
  const [institutionId, setInstitutionId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [officer, setOfficer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState("");

  // Live duplicate check
  const potentialDupes = useMemo(() => {
    if (description.trim().length < 30) return [];
    return complaints
      .filter((c) => c.status !== "Disposed")
      .map((c) => ({ c, score: jaccard(description, c.description) }))
      .filter(({ score }) => score >= OVERLAP_CONFIG.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [description, complaints]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !category || !description.trim() || !officer) return;

    const id = `C-${Date.now().toString().slice(-4)}`;
    const newCase: Complaint = {
      id,
      institution_id: institutionId,
      bureau,
      status: "Pending",
      category,
      description: description.trim(),
      date_received: DEMO_TODAY,
      assigned_officer: officer,
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: "Awaiting initial review",
    };
    await addComplaint(newCase);
    setNewId(id);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-20 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
        <p className="text-xl font-bold text-slate-900">Case {newId} registered!</p>
        <p className="text-sm text-slate-500">The Samanvay engine has checked for overlaps.</p>
        <div className="flex justify-center gap-3">
          <LinkButton href={`/complaint/${newId}`}>Open case →</LinkButton>
          <LinkButton href="/" variant="outline">Dashboard</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <LinkButton href="/" variant="ghost" size="sm" className="-ml-2 text-slate-600 flex items-center">
        ← Dashboard
      </LinkButton>

      <div>
        <h1 className="text-2xl font-bold text-blue-950">Register New Case</h1>
        <p className="text-sm text-slate-500">The engine will check for overlaps immediately on submission.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-blue-950">Case Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Bureau <span className="text-red-500">*</span></Label>
                <Select value={bureau} onValueChange={(v) => { if (v) setBureau(v as Bureau); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RB">RB</SelectItem>
                    <SelectItem value="PGRC">PGRC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Institution <span className="text-red-500">*</span></Label>
                <Select value={institutionId} onValueChange={(v) => { if (v) setInstitutionId(v); }}>
                  <SelectTrigger><SelectValue placeholder="Select institution…" /></SelectTrigger>
                  <SelectContent>
                    {institutions.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the grievance in detail (min 30 characters for duplicate check)…"
                rows={5}
              />
              {description.length > 0 && description.length < 30 && (
                <p className="text-xs text-slate-400">Type more to enable live duplicate detection…</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Officer <span className="text-red-500">*</span></Label>
              <Select value={officer} onValueChange={(v) => { if (v) setOfficer(v); }}>
                <SelectTrigger><SelectValue placeholder="Assign to officer…" /></SelectTrigger>
                <SelectContent>
                  {OFFICERS.map((o) => (
                    <SelectItem key={o.name} value={o.name}>{o.name} — {o.bureau}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Live duplicate check results */}
        {potentialDupes.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4" /> Possible Duplicates Detected
              </CardTitle>
              <CardDescription className="text-amber-700/80 text-xs">
                Review before submitting. You may still proceed if this is a distinct case.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {potentialDupes.map(({ c, score }) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white p-3 ring-1 ring-amber-200 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-900">{c.id}</span>
                      <BureauBadge bureau={c.bureau} />
                      <StatusBadge status={c.status} />
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        {Math.round(score * 100)}% match
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 truncate">{c.category} · {fmtDate(c.date_received)}</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{c.description}</p>
                  </div>
                  <Link href={`/complaint/${c.id}`} target="_blank" className="text-xs text-blue-700 hover:underline shrink-0">
                    Open →
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          disabled={!institutionId || !category || description.trim().length < 5 || !officer}
          className="w-full bg-blue-900 hover:bg-blue-800"
        >
          Register Case
        </Button>
      </form>
    </div>
  );
}
