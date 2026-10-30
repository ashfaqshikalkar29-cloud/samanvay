"use client";

import { useState } from "react";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
  Crown,
  Building,
  CheckCircle2,
  RefreshCw,
  GitMerge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchOverlapDemo?: () => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: "1. Unified Multi-Channel Intake",
    tagline: "One Portal. Six Citizen Gateways. Zero Siloed Records.",
    icon: Layers,
    color: "from-blue-600 to-indigo-700",
    description:
      "Every complaint—whether lodged via Web, Mobile App, Official Email, WhatsApp Bot, 24x7 Helpline, or Officer Walk-in—arrives in one unified queue. Identity is protected with optional confidential whistleblower encryption.",
    features: [
      "Common REST intake API powering all 6 intake channels",
      "Field-level AES-256 encryption for anonymous complainants",
      "Auto-fill institute lookup across 210+ AICTE approved colleges",
    ],
  },
  {
    step: 2,
    title: "2. Real-Time Overlap Detection",
    tagline: "Sentence-Transformers Multilingual Cosine Similarity",
    icon: GitMerge,
    color: "from-orange-600 to-red-600",
    description:
      "When a grievance is filed, Samanvay instantly embeds the narrative and searches for semantic duplicates across all bureaus. Cosine similarity above 0.85 triggers an automated duplicate warning before contradictory orders can be issued.",
    features: [
      "Flags cross-bureau duplicates (Approval Bureau vs Student Grievance Cell)",
      "Side-by-side comparison with matching phrase highlights",
      "Consolidation into a Lead Bureau with child case mirroring",
    ],
  },
  {
    step: 3,
    title: "3. Bureau-Specific Statutory Workflows",
    tagline: "Rulebook-Governed Stage Transitions & Role Guards",
    icon: Sparkles,
    color: "from-purple-600 to-pink-700",
    description:
      "Workflows follow AICTE Approval Process Handbook (APH) regulations. Each category (Fee Regulation, Faculty Norms, Ragging & Safety) follows tailored stage sequences with role authorization guards and mandatory required fields.",
    features: [
      "Configurable statutory workflows stored as JSON definitions",
      "Role-based stage transition guards (Admin, RB, PGRC, Chairperson)",
      "Approval gates: Chairperson must approve final disposal orders",
    ],
  },
  {
    step: 4,
    title: "4. Multi-Tier SLA Timers & Escalations",
    tagline: "Per-Stage Deadlines with Automatic Clock Freeze",
    icon: Clock,
    color: "from-amber-600 to-yellow-600",
    description:
      "Countdown timers tick per stage rather than arbitrary case-level deadlines. When an officer awaits documents from a student or institution, the SLA clock pauses. Unresolved cases climb a statutory 50%, 100%, and 200% escalation ladder.",
    features: [
      "Countdown timer freezes when awaiting evidence (no false breaches)",
      "50% Warning notice sent to Section Head / Nodal Officer",
      "100% Breach escalated to Bureau Head; 200% escalated to Chairperson",
    ],
  },
  {
    step: 5,
    title: "5. Chairperson Executive Escalation Desk",
    tagline: "High-Authority Oversight, 2x SLA Breaches & Systemic Clusters",
    icon: Crown,
    color: "from-amber-700 to-red-800",
    description:
      "The Chairperson suite provides a national high-level cockpit. Executive alerts highlight cases that exceeded 200% of their statutory timeframe, institutions flagged on the repeat-offender watchlist, and AI-detected systemic clusters.",
    features: [
      "Direct 2x SLA breach docket for immediate Chairperson summons",
      "Repeat-offender watchlist ranking institutions by recidivism",
      "Semantic clustering identifying coordinated multi-student issues",
    ],
  },
  {
    step: 6,
    title: "6. Institutional Compliance & Citizen Portals",
    tagline: "Full Accountability, Scorecards & Downloadable Orders",
    icon: Building,
    color: "from-emerald-600 to-teal-700",
    description:
      "Colleges view their scoped compliance standing, respond to show-cause notices with affidavits, and request deadline extensions. Complainants track their docket with transparent 6-stage steppers and download official authenticated PDF orders.",
    features: [
      "Institutions submit compliance affidavits and extension requests",
      "Citizen tracking stepper with stage explanations and SLA countdown",
      "Official computer-generated PDF slips with digital verification seal",
    ],
  },
];

export function GuidedTour({ isOpen, onClose, onLaunchOverlapDemo }: GuidedTourProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === TOUR_STEPS.length - 1;
  const Icon = current.icon;

  const handleNext = () => {
    if (!isLast) setCurrentIdx((i) => i + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentIdx((i) => i - 1);
  };

  const handleRestart = () => {
    setCurrentIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Banner with step gradient */}
        <div className={`bg-gradient-to-r ${current.color} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              AICTE Samanvay Product Tour
            </span>
            <span className="text-xs text-white/80 font-mono">
              Step {current.step} of {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
              <Icon className="h-6 w-6 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-bold leading-tight">{current.title}</h2>
              <p className="text-xs text-white/90 mt-0.5">{current.tagline}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {current.description}
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
              Key Capabilities Demonstrated:
            </span>
            <ul className="space-y-2 text-xs text-slate-600">
              {current.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Launch Overlay Demo on Step 2 */}
          {current.step === 2 && onLaunchOverlapDemo && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-orange-950">Want to see overlap detection in action?</p>
                <p className="text-orange-800 text-[11px]">Launch the interactive 5-step live duplicate demo.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onLaunchOverlapDemo();
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-7 gap-1 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" /> Launch Demo
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <span
                key={s.step}
                onClick={() => setCurrentIdx(idx)}
                className={`h-2 rounded-full cursor-pointer transition-all ${
                  currentIdx === idx ? "w-6 bg-blue-900" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button size="sm" variant="outline" onClick={handlePrev} className="text-xs border-slate-300">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Previous
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs gap-1"
            >
              {isLast ? "Finish Tour" : "Next Step"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
