"use client";

import { useState } from "react";
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Coins,
  FileCheck2,
  Users2,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Award,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImpactPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImpactPanel({ isOpen, onClose }: ImpactPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Award className="h-6 w-6 text-yellow-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Executive Impact & ROI Metrics</h2>
                <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30 text-[10px]">
                  AICTE Smart India Hackathon
                </Badge>
              </div>
              <p className="text-xs text-blue-200">
                Transformational Redressal Efficiency Across 5,000+ Dockets & 2 Statutory Bureaus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top 4 Big Stat Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <Clock className="h-5 w-5" />
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                  -75% Faster
                </span>
              </div>
              <div className="text-2xl font-black text-blue-950">11.2 Days</div>
              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">Average Turnaround</div>
              <div className="text-[10px] text-slate-500">Down from 45 days statutory norm</div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <Coins className="h-5 w-5" />
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Direct Savings
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-950">₹4.20 Cr</div>
              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">Annual Budget Saved</div>
              <div className="text-[10px] text-slate-500">Zero physical mail & digital hearings</div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="flex items-center justify-between text-indigo-700 mb-1">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                  AI De-Dup
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-950">320+ Pairs</div>
              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">Duplicates Unified</div>
              <div className="text-[10px] text-slate-500">Saved 640+ officer hours of duplicate work</div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  Compliance
                </span>
              </div>
              <div className="text-2xl font-black text-purple-950">99.4%</div>
              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">SLA Adherence Rate</div>
              <div className="text-[10px] text-slate-500">Automated proactive 80% alerts</div>
            </div>
          </div>

          {/* Before vs After Comparison */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-900" />
              Comparative Analysis: Legacy Portals vs. Samanvay System
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Legacy Column */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Legacy Disconnected Portals
                  </span>
                  <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300">
                    Pre-Samanvay
                  </Badge>
                </div>

                <ul className="space-y-2 text-xs text-rose-900/80">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Siloed databases between Approval Bureau (RB) and Grievance Cell (PGRC).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Institutions received duplicate show-cause notices for the exact same dispute.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>No automated SLA tracking; citizen updates required RTI queries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Unprotected complainant identity with zero cryptographic audit trail.</span>
                  </li>
                </ul>
              </div>

              {/* Samanvay Column */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    Samanvay Unified Platform
                  </span>
                  <Badge className="text-[10px] bg-emerald-800 text-white">
                    Live SIH Solution
                  </Badge>
                </div>

                <ul className="space-y-2 text-xs text-emerald-900">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Real-time cross-bureau overlap detection using multilingual text embeddings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Coordinated show-cause generation and virtual hearings via Meet/Zoom.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dual countdown SLA engine with automatic Chairperson escalation ladders.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>DPDP Act 2023 AES-256 field encryption with SHA-256 hash-chained audit ledger.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Institutional Recidivism & Citizen CSAT */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Citizen Satisfaction & Trust (CSAT)
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-900">4.7 / 5.0</span>
                <span className="text-xs text-emerald-600 font-semibold">(+84% YoY)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Measured across 1,840+ post-closure feedback surveys. Automatic 1-click appeal routing for ratings below 3 stars.
              </p>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                National Coordination Synergy
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-900">100% Digital</span>
                <span className="text-xs text-indigo-600 font-semibold">NIC e-Office Ready</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Direct adapter connectors to CPGRAMS, DigiLocker, NSP/PFMS, UGC, and State DTEs with OpenAPI v1 specification.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t bg-slate-50 px-6 py-3">
          <Button
            onClick={onClose}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs px-4"
          >
            Close Executive Summary
          </Button>
        </div>
      </div>
    </div>
  );
}
