"use client";

import { useState } from "react";
import { BookOpen, Check, Copy, FileText, GitBranch, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RAGDraftReply } from "@/lib/ai/types";
import { useApp } from "@/lib/store";

export function RAGReplyDialog({
  isOpen,
  onClose,
  complaintId,
  description,
  category,
  institutionName,
}: {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  description: string;
  category: string;
  institutionName: string;
}) {
  const { addEvent, updateComplaint, role } = useApp();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<RAGDraftReply | null>(null);
  const [editableText, setEditableText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const generateDraft = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/rag-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: complaintId,
          description,
          category,
          institution_name: institutionName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setDraft(data.draft);
        setEditableText(data.draft.draft_text);
      }
    } catch (err) {
      console.error("Draft generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApproveAndDispatch = async () => {
    setDispatched(true);
    const now = new Date().toISOString();

    // 1. Log event in cross-bureau timeline
    await addEvent({
      id: `evt-rag-reply-${Date.now()}`,
      complaint_id: complaintId,
      bureau: role === "PGRC Officer" ? "PGRC" : "RB",
      event_type: "notice",
      actor: `${role} (AI Assisted)`,
      title: "Statutory Direction & Draft Reply Approved",
      description: `Formal order approved with citations (${draft?.citations.map((c) => c.clause_number).join(", ")}): "${editableText.slice(0, 160)}..."`,
      created_at: now,
    });

    // 2. Add audit entry via complaint update
    await updateComplaint(complaintId, {
      remark: `RAG Statutory Reply Approved: Dispatched citing ${draft?.citations[0]?.source_document || "AICTE APH"} (${draft?.citations.map((c) => c.clause_number).join(", ")}).`,
    });

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
      <div className="flex flex-col max-h-[90vh] w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-950">
                AI Suggested Resolution & Statutory Draft Reply (RAG)
              </h2>
              <p className="text-xs text-slate-500">
                Grounds reply against resolved past rulings & AICTE Approval Process Handbook (APH 2024-27)
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!draft && !loading ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-blue-600 mx-auto opacity-80" />
              <p className="text-sm font-semibold text-slate-800">
                Generate Precedent-Backed Statutory Reply for {complaintId}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                AI will scan previous settled cases with similar facts and retrieve official handbook clauses to draft a point-by-point formal order.
              </p>
              <Button size="sm" onClick={generateDraft} className="bg-blue-900 hover:bg-blue-800 text-white mt-2">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Retrieve Citations & Draft Reply
              </Button>
            </div>
          ) : loading ? (
            <div className="py-16 text-center space-y-2">
              <Sparkles className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm font-medium text-slate-700">Searching precedent database & handbook vector index...</p>
            </div>
          ) : draft ? (
            <>
              {/* Citations & Precedents Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Rulebook Clauses */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-blue-700" /> Cited AICTE Regulation Clauses
                  </p>
                  {draft.citations.map((c, idx) => (
                    <div key={idx} className="rounded-lg bg-white p-2.5 border border-blue-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950">{c.clause_number}: {c.clause_title}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.2 rounded">
                          Page {c.page_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic line-clamp-3">"{c.clause_text}"</p>
                    </div>
                  ))}
                </div>

                {/* Precedent Cases */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-slate-600" /> Historical Settled Precedents
                  </p>
                  {draft.similar_precedents.map((p, idx) => (
                    <div key={idx} className="rounded-lg bg-white p-2.5 border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">{p.title}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          {Math.round(p.similarity_score * 100)}% match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{p.final_resolution_summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Draft */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Draft Statutory Order / Notice (Editable by Officer)
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-600 gap-1" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy text"}
                  </Button>
                </div>
                <Textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  rows={10}
                  className="font-mono text-xs leading-relaxed border-slate-300"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {draft && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
            <span className="text-xs text-slate-500">
              {dispatched ? "✓ Order dispatched and logged to timeline." : "Officer must review and confirm before dispatch."}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
                onClick={handleApproveAndDispatch}
                disabled={dispatched}
              >
                <Send className="h-3.5 w-3.5" />
                {dispatched ? "Approved & Dispatched" : "Approve & Dispatch Order"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
