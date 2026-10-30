"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  Tag,
  FileText,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KNOWLEDGE_BASE_ARTICLES, KnowledgeArticle } from "@/lib/knowledge-base";

export function KnowledgeBaseSearchDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle>(KNOWLEDGE_BASE_ARTICLES[0]);

  const categories = ["ALL", "Fee Regulation", "Student Services", "Campus Safety", "Scholarship", "Faculty Norms"];

  const filtered = KNOWLEDGE_BASE_ARTICLES.filter((article) => {
    const matchCategory = selectedCategory === "ALL" || article.category === selectedCategory;
    const matchSearch =
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.summary.toLowerCase().includes(search.toLowerCase()) ||
      article.aph_clause.toLowerCase().includes(search.toLowerCase()) ||
      article.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AICTE Statutory Knowledge Base & APH Regulations</h2>
              <p className="text-xs text-slate-400">
                Official regulatory precedents, fee refund rules, and approval handbook clauses
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
          >
            Close
          </Button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by keywords, APH clause, or issue (e.g., fee refund, certificates, ragging)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs bg-white h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] h-7 px-2.5 ${
                  selectedCategory === cat ? "bg-blue-900 text-white" : "border-slate-200 text-slate-700"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Split: Article List (Left) + Detail Reader (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-5 flex-1 overflow-hidden">
          {/* Article List */}
          <div className="md:col-span-2 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 bg-slate-50/40">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching AICTE regulations found.
              </div>
            ) : (
              filtered.map((article) => {
                const isSelected = activeArticle.id === article.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-white border-l-4 border-l-blue-900 shadow-2xs"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold text-blue-900">{article.category}</span>
                      <span className="font-mono">{article.id}</span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900 line-clamp-2">
                      {article.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {article.aph_clause}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Article Full Detail Reader */}
          <div className="md:col-span-3 p-6 overflow-y-auto space-y-4 bg-white">
            <div className="border-b border-slate-100 pb-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-900 text-[10px] border-blue-200 font-semibold">
                  {activeArticle.category}
                </Badge>
                <span className="text-[11px] font-mono text-slate-400">ID: {activeArticle.id}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {activeArticle.title}
              </h3>
              <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {activeArticle.aph_clause}
              </p>
            </div>

            {/* Summary Callout */}
            <div className="rounded-lg bg-blue-50/60 p-3.5 border border-blue-100 text-xs text-slate-800 space-y-1">
              <strong className="text-blue-950 block text-[11px]">Regulatory Summary:</strong>
              <p className="leading-relaxed">{activeArticle.summary}</p>
            </div>

            {/* Full Statutory Text */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <strong className="text-slate-900 block text-[11px]">Official Statutory Clause Text:</strong>
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 leading-relaxed font-serif text-slate-800 whitespace-pre-wrap text-[13px]">
                &quot;{activeArticle.full_text}&quot;
              </div>
            </div>

            {/* Statutory Remedy */}
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
              <strong className="text-amber-950 flex items-center gap-1.5 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-700" /> Prescribed Enforcement Remedy:
              </strong>
              <p>{activeArticle.statutory_remedy}</p>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10px] text-slate-400">
              <Tag className="h-3 w-3" />
              {activeArticle.keywords.map((k, i) => (
                <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-mono">
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
