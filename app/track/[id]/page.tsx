"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BureauBadge, ChannelBadge, LinkButton, QrCodeView, StatusBadge, fmtDate, fmtDateTime } from "@/components/ui-bits";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export default function TrackDetailPage({ params }: TrackPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const initialVerify = searchParams.get("verify") || "";

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState(initialVerify);
  const [unlocking, setUnlocking] = useState(false);

  const fetchTrackData = async (verifyCode: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = verifyCode ? `&verify=${encodeURIComponent(verifyCode)}` : "";
      const res = await fetch(`/api/track?id=${encodeURIComponent(resolvedParams.id)}${q}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
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
              <div className="pt-2 flex items-center gap-2">
                <ChannelBadge channel={data.channel} />
                {data.is_anonymous && (
                  <span className="rounded-full bg-purple-900/80 border border-purple-400 text-purple-200 text-[10px] font-semibold px-2 py-0.5">
                    Confidential Whistleblower
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <QrCodeView value={typeof window !== "undefined" ? window.location.href : ""} size={110} />
              <span className="text-[10px] text-blue-200 mt-1 font-mono">Scan to Track</span>
            </div>
          </div>
        </CardContent>
      </Card>

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

          {/* Dynamic Category Specific Data (if unlocked) */}
          {data.dynamic_fields && Object.keys(data.dynamic_fields).length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3.5 text-xs space-y-2">
              <span className="font-semibold text-blue-950 block">Category Specific Records ({data.category}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {Object.entries(data.dynamic_fields).map(([k, v]) => (
                  <div key={k} className="bg-white p-2 rounded border border-blue-100">
                    <span className="text-slate-400 capitalize block">{k.replace(/([A-Z])/g, " $1")}</span>
                    <strong className="text-slate-900">{String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Attachments (if unlocked) */}
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

      {/* Progress Timeline */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-blue-950">Grievance Progress Timeline</CardTitle>
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

          {/* Audit Trail List */}
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
