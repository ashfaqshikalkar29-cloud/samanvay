"use client";

import { useState } from "react";
import { BookOpen, Bot, HelpCircle, Send, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RulebookQAResponse } from "@/lib/ai/types";

const QUICK_PROMPTS = [
  "What is the fee refund policy if student withdraws before cutoff?",
  "Can college withhold original marksheets for fee default?",
  "What is the minimum pay scale for Assistant Professors under 7th CPC?",
  "What is the penalty for admitting excess students beyond sanctioned intake?",
  "What are the mandatory anti-ragging squad requirements?",
];

export function RulebookDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RulebookQAResponse[]>([]);

  if (!isOpen) return null;

  const handleAsk = async (textToAsk: string) => {
    const q = textToAsk.trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/rulebook-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setHistory((prev) => [data.result, ...prev]);
        setQuery("");
      }
    } catch (err) {
      console.error("Rulebook query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 text-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 text-yellow-300">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">AICTE Rulebook & Handbook Assistant</h2>
              <p className="text-[10px] text-slate-300">
                Grounded Q&A over Approval Process Handbook (APH 2024-27)
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-b border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Common Regulation Queries</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-blue-400 hover:text-blue-900 transition-colors text-left truncate max-w-full"
                onClick={() => handleAsk(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation / Query History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bot className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Ask any procedural or regulatory question</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Answers cite exact chapters, pages, and clause numbers from AICTE statutory handbooks.
              </p>
            </div>
          ) : (
            history.map((resp, idx) => (
              <div key={idx} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{resp.query}</span>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed rounded-lg bg-slate-50 p-3 border border-slate-100 whitespace-pre-wrap">
                  {resp.answer}
                </div>

                {resp.citations && resp.citations.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cited Statutory Sources:</p>
                    {resp.citations.map((c, cIdx) => (
                      <div key={cIdx} className="flex items-center justify-between text-[11px] bg-blue-50 text-blue-900 px-2 py-1 rounded border border-blue-200">
                        <span className="font-medium truncate">{c.source_document} · {c.clause_number}</span>
                        <span className="text-[10px] font-mono shrink-0 ml-2">Page {c.page_number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="border-t border-slate-200 p-3 bg-white flex items-center gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about AICTE rules, fee norms, intake..."
            className="text-xs h-9 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !query.trim()}
            className="h-9 bg-blue-900 hover:bg-blue-800 text-white shrink-0"
          >
            {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
