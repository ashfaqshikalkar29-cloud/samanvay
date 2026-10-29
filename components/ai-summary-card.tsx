"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, FileText, CheckCircle2, History, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AICaseSummary } from "@/lib/ai/types";
import { fmtDateTime } from "@/components/ui-bits";

export function AISummaryCard({
  complaintId,
  description,
  category,
  institutionName,
  initialSummary,
}: {
  complaintId: string;
  description: string;
  category: string;
  institutionName: string;
  initialSummary?: AICaseSummary | null;
}) {
  const [summary, setSummary] = useState<AICaseSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: complaintId,
          description,
          category,
          institution_name: institutionName,
          force_regenerate: force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate AI summary.");
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load AI summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!summary && description) {
      fetchSummary(false);
    }
  }, [complaintId]);

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-indigo-950">AI Docket Synthesis</CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.2 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                  <Bot className="h-3 w-3" /> AI-Generated
                </span>
              </div>
              <CardDescription className="text-[11px] text-slate-500">
                Automated multi-timeline paragraph synthesis & procedural next step
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-indigo-700 hover:bg-indigo-100 gap-1.5"
            onClick={() => fetchSummary(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Synthesizing..." : "Regenerate"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 text-xs">
        {error && (
          <p className="text-red-600 bg-red-50 p-2 rounded text-[11px]">{error}</p>
        )}

        {summary ? (
          <>
            <div className="rounded-lg border border-indigo-100 bg-white p-3 shadow-2xs leading-relaxed text-slate-800">
              <p className="font-medium text-slate-900">{summary.complaint_summary}</p>
            </div>

            {/* Timeline Digest */}
            {summary.timeline_digest && summary.timeline_digest.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <History className="h-3 w-3" /> Procedural Milestones
                </p>
                <ul className="space-y-1 pl-1">
                  {summary.timeline_digest.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-slate-600">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Immediate Step */}
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Recommended Procedural Action</p>
                <p className="font-semibold text-emerald-950 mt-0.5">{summary.recommended_first_step}</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-right">
              Generated: {fmtDateTime(summary.generated_at)}
            </p>
          </>
        ) : (
          <div className="py-4 text-center text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-indigo-400" />
            <p className="text-[11px]">Generating automated synthesis...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
