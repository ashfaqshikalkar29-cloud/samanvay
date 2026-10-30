"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n/context";
import { SupportedLocale } from "@/lib/i18n/types";
import { GuidedTour } from "@/components/demo/guided-tour";
import { LiveOverlapDemo } from "@/components/demo/live-overlap-demo";
import {
  AlertOctagon,
  Award,
  Bell,
  BookOpen,
  Bot,
  Building2,
  ChevronDown,
  ChevronRight,
  Compass,
  FileBarChart2,
  FilePenLine,
  FilePlus,
  Globe,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  UserCog,
  X,
  Check,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { DEMO_TODAY, type Role } from "@/lib/mock";
import { isTaskOverdue } from "@/lib/tasks";
import { fmtDate } from "@/components/ui-bits";
import { TasksDrawer } from "@/components/tasks-drawer";
import { RulebookDrawer } from "@/components/rulebook-drawer";
import { AuditChainViewer } from "@/components/security/audit-chain-viewer";
import { MfaModal } from "@/components/security/mfa-modal";
import { AntiRaggingDialog } from "@/components/anti-ragging/anti-ragging-dialog";
import { KnowledgeBaseSearchDialog } from "@/components/knowledge-base/kb-search-dialog";
import { ImpactPanel } from "@/components/impact-panel";
import { useSimpleMode } from "@/lib/simple-mode";
import { defaultNotificationService } from "@/lib/notifications/service";
import { NotificationRecord } from "@/lib/notifications/types";
import { Mail, MessageCircle, Phone, Send, Zap } from "lucide-react";

// ==============================================================================
// 1. Notification Bell Popover Component
// ==============================================================================
function BellPopover() {
  const { visible, sendReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sla" | "nudges">("sla");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [runningNudges, setRunningNudges] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const urgent = visible
    .filter((c) => c.status !== "Disposed")
    .map((c) => ({ c, sla: getSla(c) }))
    .filter(({ sla }) => sla.state === "Overdue" || sla.state === "Due soon")
    .sort((a, b) => a.sla.daysLeft - b.sla.daysLeft)
    .slice(0, 5);

  const loadNotifications = () => {
    setNotifications(defaultNotificationService.getNotifications().slice(0, 6));
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleRunNudges = async () => {
    setRunningNudges(true);
    setNudgeMessage(null);
    try {
      const res = await fetch("/api/notifications/nudges/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_date: DEMO_TODAY }),
      });
      const data = await res.json();
      if (data.success) {
        setNudgeMessage(
          `Dispatched ${data.nudges_dispatched} proactive nudges (${data.summary.institute_80_urgent} urgent 80% SLA reminders)`
        );
        loadNotifications();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningNudges(false);
    }
  };

  const channelIcon = (ch: string) => {
    switch (ch) {
      case "sms":
        return <Phone className="h-3 w-3 text-emerald-600" />;
      case "email":
        return <Mail className="h-3 w-3 text-blue-600" />;
      case "whatsapp":
        return <MessageCircle className="h-3 w-3 text-green-600" />;
      default:
        return <Send className="h-3 w-3 text-purple-600" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications (${urgent.length} urgent SLA alerts)`}
        className="relative h-9 w-9 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {urgent.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {urgent.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-2xl text-slate-800 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
            <button
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === "sla"
                  ? "border-blue-900 text-blue-900 bg-white font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setActiveTab("sla")}
            >
              Urgent SLA ({urgent.length})
            </button>
            <button
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === "nudges"
                  ? "border-blue-900 text-blue-900 bg-white font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setActiveTab("nudges")}
            >
              Proactive Nudges
            </button>
          </div>

          {activeTab === "sla" && (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {urgent.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No overdue or urgent cases. All SLAs on track!</div>
              ) : (
                urgent.map(({ c, sla }) => (
                  <div key={c.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/track/${c.id}`}
                        onClick={() => setOpen(false)}
                        className="font-bold text-blue-900 hover:underline truncate"
                      >
                        {c.id}
                      </Link>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          sla.state === "Overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {sla.state} ({sla.daysLeft < 0 ? `${-sla.daysLeft}d late` : `${sla.daysLeft}d left`})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">{c.description || c.category}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Due: {fmtDate(sla.due)}</span>
                      <span>Assigned: {c.assigned_officer}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "nudges" && (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Automated Proactive Nudge Engine</span>
                <Button
                  size="sm"
                  onClick={handleRunNudges}
                  disabled={runningNudges}
                  className="h-7 text-xs bg-blue-900 hover:bg-blue-800 text-white"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {runningNudges ? "Scanning..." : "Run Nudges Now"}
                </Button>
              </div>

              {nudgeMessage && (
                <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-[10px] border border-emerald-200">
                  {nudgeMessage}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5 truncate max-w-[200px]">
                        {channelIcon(n.channel)}
                        {n.title}
                      </span>
                      <span className="rounded uppercase bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                        {n.channel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                      <span>To: {n.recipient_name}</span>
                      <span className="text-emerald-600 font-semibold">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 px-4 py-2 text-center bg-slate-50">
            <Link href="/" className="text-xs text-blue-700 font-medium hover:underline" onClick={() => setOpen(false)}>
              View All Dockets →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 2. Main Redesigned Header Component
// ==============================================================================
export function Header() {
  const { mode, role, setRole, actor, resetDemo, signOut, user, profile, tasks, suspiciousCases } = useApp();
  const { locale, setLocale, languages } = useTranslation();
  const pathname = usePathname();

  // Navigation State
  const [activeDropdown, setActiveDropdown] = useState<"intake" | "intelligence" | "governance" | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collapsedMobileSections, setCollapsedMobileSections] = useState<Record<string, boolean>>({
    intake: false,
    intelligence: false,
    governance: false,
  });

  const toggleMobileSection = (section: string) => {
    setCollapsedMobileSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Feature Modals & Drawers
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [rulebookDrawerOpen, setRulebookDrawerOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [overlapDemoOpen, setOverlapDemoOpen] = useState(false);
  const [auditChainOpen, setAuditChainOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [antiRaggingOpen, setAntiRaggingOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);

  const { isSimpleMode, toggleSimpleMode } = useSimpleMode();
  const navContainerRef = useRef<HTMLDivElement>(null);

  // If on /login page, keep header minimal
  const isLoginPage = pathname === "/login";

  const isStaff = role === "Admin" || role === "RB Officer" || role === "PGRC Officer" || role === "Chairperson";
  const myBureau = role === "PGRC Officer" ? "PGRC" : "RB";

  const pendingTasks = (tasks || []).filter(
    (t) => t.status !== "completed" && (role === "Admin" || role === "Chairperson" || t.to_bureau === myBureau)
  );
  const overdueTasks = (tasks || []).filter(
    (t) => isTaskOverdue(t, DEMO_TODAY) && (role === "Admin" || role === "Chairperson" || t.to_bureau === myBureau)
  );
  const pendingSuspicious = (suspiciousCases || []).filter(
    (c) => !c.review_status || c.review_status === "pending"
  ).length;

  // Auto-close menus on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileSheetOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation: Escape key closes menus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileSheetOpen(false);
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Group active checks
  const isIntakeActive =
    pathname === "/new" || pathname === "/walk-in" || pathname === "/assisted-filing" || pathname.startsWith("/track");

  const isIntelligenceActive =
    pathname === "/clusters" ||
    pathname === "/watchlist" ||
    pathname === "/forecasts" ||
    pathname === "/suspicious" ||
    pathname === "/scorecards";

  const isGovernanceActive =
    pathname === "/public/transparency" || pathname === "/coverage" || pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 shadow-md select-none">
      {/* Tricolour Accent Line */}
      <div className="flex h-1">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      {/* Main Bar: 64px tall, single row, strictly non-wrapping */}
      <div className="bg-blue-950 text-white h-16" ref={navContainerRef}>
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ================================================================ */}
          {/* LEFT: Logo & Branding                                            */}
          {/* ================================================================ */}
          <Link
            href="/"
            aria-label="Samanvay Home Dashboard"
            className="flex items-center gap-2.5 shrink-0 hover:opacity-95 transition-opacity"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 text-blue-200">
              <Landmark className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <span className="block text-lg font-bold tracking-wide text-white">Samanvay</span>
              <span className="hidden xl:block text-[9px] uppercase tracking-widest text-blue-300">
                AICTE · Integrated Grievance Portal
              </span>
            </div>
          </Link>

          {/* ================================================================ */}
          {/* CENTER: Desktop Navigation (>= 1024px)                           */}
          {/* Direct Links + 3 Structured Dropdowns: Intake, Intel, Governance  */}
          {/* ================================================================ */}
          {!isLoginPage && (
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 h-full" aria-label="Main Navigation">
              {/* Direct: Dashboard */}
              <Link
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                  pathname === "/" ? "bg-white/20 text-white font-bold" : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
              </Link>

              {/* Direct: Institutions */}
              <Link
                href="/institutions"
                aria-current={pathname === "/institutions" ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                  pathname === "/institutions"
                    ? "bg-white/20 text-white font-bold"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Institutions</span>
              </Link>

              {/* Direct: Reports */}
              <Link
                href="/reports"
                aria-current={pathname === "/reports" ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                  pathname === "/reports"
                    ? "bg-white/20 text-white font-bold"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileBarChart2 className="h-4 w-4 shrink-0" />
                <span>Reports</span>
              </Link>

              {/* ------------------------------------------------------------ */}
              {/* DROPDOWN 1: Intake                                           */}
              {/* ------------------------------------------------------------ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "intake"}
                  onClick={() => setActiveDropdown(activeDropdown === "intake" ? null : "intake")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                    isIntakeActive || activeDropdown === "intake"
                      ? "bg-white/20 text-white font-bold"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <FilePlus className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Intake</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${
                      activeDropdown === "intake" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeDropdown === "intake" && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[54px] z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Grievance Filing & Lodgement
                    </div>

                    <Link
                      href="/new"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                        <FilePlus className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">File Grievance</div>
                        <div className="text-[10px] text-slate-500">Citizen & student online complaint form</div>
                      </div>
                    </Link>

                    {isStaff && (
                      <Link
                        href="/walk-in"
                        role="menuitem"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                      >
                        <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md shrink-0 mt-0.5">
                          <FilePenLine className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Walk-In Entry</div>
                          <div className="text-[10px] text-slate-500">Reception desk offline paper entry</div>
                        </div>
                      </Link>
                    )}

                    <Link
                      href="/assisted-filing"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-md shrink-0 mt-0.5">
                        <FilePenLine className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Assisted Filing</div>
                        <div className="text-[10px] text-slate-500">Common Service Centre (CSC) & printed slip</div>
                      </div>
                    </Link>

                    <Link
                      href="/track"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="p-1.5 bg-slate-100 text-slate-700 rounded-md shrink-0 mt-0.5">
                        <Search className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Track Status</div>
                        <div className="text-[10px] text-slate-500">Real-time status, timeline & DPDP rights</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------ */}
              {/* DROPDOWN 2: Intelligence                                     */}
              {/* ------------------------------------------------------------ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "intelligence"}
                  onClick={() => setActiveDropdown(activeDropdown === "intelligence" ? null : "intelligence")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                    isIntelligenceActive || activeDropdown === "intelligence"
                      ? "bg-white/20 text-white font-bold"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-yellow-400" />
                  <span>Intelligence</span>
                  {pendingSuspicious > 0 && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                      {pendingSuspicious}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${
                      activeDropdown === "intelligence" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeDropdown === "intelligence" && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[54px] z-50 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      AI Analytics & Coordination
                    </div>

                    {isStaff && (
                      <>
                        <Link
                          href="/clusters"
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50/60 transition-colors"
                        >
                          <span className="p-1.5 bg-yellow-100 text-yellow-800 rounded-md shrink-0 mt-0.5">
                            <Network className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Clusters</div>
                            <div className="text-[10px] text-slate-500">Systemic patterns & root-cause groups</div>
                          </div>
                        </Link>

                        <Link
                          href="/watchlist"
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50/60 transition-colors"
                        >
                          <span className="p-1.5 bg-rose-100 text-rose-800 rounded-md shrink-0 mt-0.5">
                            <ShieldAlert className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Watchlist</div>
                            <div className="text-[10px] text-slate-500">High-risk colleges & repeat offenders</div>
                          </div>
                        </Link>

                        <Link
                          href="/forecasts"
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50/60 transition-colors"
                        >
                          <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md shrink-0 mt-0.5">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Forecasts</div>
                            <div className="text-[10px] text-slate-500">Weekly intake volume & SLA breach risks</div>
                          </div>
                        </Link>

                        <Link
                          href="/suspicious"
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50/60 transition-colors"
                        >
                          <span className="p-1.5 bg-purple-100 text-purple-800 rounded-md shrink-0 mt-0.5">
                            <Bot className="h-4 w-4" />
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">Suspicious Queue</span>
                              {pendingSuspicious > 0 && (
                                <Badge className="bg-red-500 text-white text-[9px] h-4 px-1.5">
                                  {pendingSuspicious} review
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">Bot, spam & false complaint review</div>
                          </div>
                        </Link>
                      </>
                    )}

                    <Link
                      href="/scorecards"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50/60 transition-colors"
                    >
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                        <Award className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Risk Scorecards</div>
                        <div className="text-[10px] text-slate-500">Institutional 0-100 risk & recidivism index</div>
                      </div>
                    </Link>

                    {/* Interactive Demos / Modals */}
                    <div className="border-t border-slate-100 my-1 pt-1">
                      {isStaff && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveDropdown(null);
                            setRulebookDrawerOpen(true);
                          }}
                          className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-amber-50 text-left transition-colors"
                        >
                          <span className="p-1.5 bg-amber-100 text-amber-800 rounded-md shrink-0 mt-0.5">
                            <BookOpen className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Rulebook AI Assistant</div>
                            <div className="text-[10px] text-slate-500">RAG Q&A on AICTE Approval Handbooks</div>
                          </div>
                        </button>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setOverlapDemoOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-yellow-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-yellow-100 text-yellow-800 rounded-md shrink-0 mt-0.5">
                          <Sparkles className="h-4 w-4 text-yellow-600" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Live Overlap & Merge Demo</span>
                            <span className="text-[9px] bg-yellow-400 text-blue-950 font-bold px-1 rounded">Interactive</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Simulate cross-bureau conflict merge</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setImpactOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-emerald-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                          <TrendingUp className="h-4 w-4 text-emerald-700" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">ROI Impact & Executive Summary</div>
                          <div className="text-[10px] text-slate-500">75% turnaround reduction & ₹4.20 Cr saved</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------ */}
              {/* DROPDOWN 3: Governance                                       */}
              {/* ------------------------------------------------------------ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "governance"}
                  onClick={() => setActiveDropdown(activeDropdown === "governance" ? null : "governance")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                    isGovernanceActive || activeDropdown === "governance"
                      ? "bg-white/20 text-white font-bold"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>Governance</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${
                      activeDropdown === "governance" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {activeDropdown === "governance" && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[54px] z-50 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Compliance & Statutory Protocols
                    </div>

                    <Link
                      href="/public/transparency"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md shrink-0 mt-0.5">
                        <Globe className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Public Transparency</div>
                        <div className="text-[10px] text-slate-500">Zero-PII portal, RTI metrics & synergy statistics</div>
                      </div>
                    </Link>

                    <Link
                      href="/coverage"
                      role="menuitem"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                    >
                      <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-md shrink-0 mt-0.5">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">SIH Coverage Matrix</div>
                        <div className="text-[10px] text-slate-500">Domain A-H statutory traceability matrix</div>
                      </div>
                    </Link>

                    {role === "Admin" && (
                      <Link
                        href="/admin/users"
                        role="menuitem"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 transition-colors"
                      >
                        <span className="p-1.5 bg-amber-100 text-amber-800 rounded-md shrink-0 mt-0.5">
                          <UserCog className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Admin Console</span>
                            <span className="text-[9px] bg-blue-900 text-white font-bold px-1 rounded">Admin</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Staff roster, CSV onboard & feature flags</div>
                        </div>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setAuditChainOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-emerald-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Audit Chain Ledger</div>
                          <div className="text-[10px] text-slate-500">SHA-256 cryptographic tamper verification</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setKbOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-blue-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md shrink-0 mt-0.5">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">APH Regulatory Rules</div>
                          <div className="text-[10px] text-slate-500">Approval Process Handbook 2026 search</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setAntiRaggingOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-red-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-red-100 text-red-800 rounded-md shrink-0 mt-0.5">
                          <AlertOctagon className="h-4 w-4 text-red-600" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                            <span>Anti-Ragging 24x7 Fast-Track</span>
                            <span className="text-[9px] bg-red-600 text-white font-bold px-1 rounded animate-pulse">Emergency</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Toll-free 1800-180-5522 & safety officer alerts</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveDropdown(null);
                          setMfaModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2 hover:bg-indigo-50 text-left transition-colors"
                      >
                        <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-md shrink-0 mt-0.5">
                          <KeyRound className="h-4 w-4 text-indigo-600" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">TOTP 2FA Security</div>
                          <div className="text-[10px] text-slate-500">RFC 6238 authenticator & recovery codes</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* ================================================================ */}
          {/* RIGHT: Action Toolbar (Desktop >= 1024px)                        */}
          {/* File Grievance Primary CTA, Tasks, Bell, Simple, Tour, Lang, User */}
          {/* ================================================================ */}
          {!isLoginPage ? (
            <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
              {/* Primary "+ File Grievance" Button on Desktop */}
              <Link
                href="/new"
                className="hidden xl:inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" />
                <span>+ File Grievance</span>
              </Link>

              {/* Tasks Drawer Button (Staff Only) */}
              {isStaff && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Inter-bureau Tasks (${pendingTasks.length} pending)`}
                  className="relative h-9 w-9 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg"
                  onClick={() => setTasksDrawerOpen(true)}
                >
                  <ListTodo className="h-4 w-4" />
                  {pendingTasks.length > 0 && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ${
                        overdueTasks.length > 0 ? "bg-red-500 animate-pulse" : "bg-blue-600"
                      }`}
                    >
                      {pendingTasks.length}
                    </span>
                  )}
                </Button>
              )}

              {/* Notification Bell Popover */}
              <BellPopover />

              {/* Citizen Plain-Language Simple Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Toggle Plain-Language Simple Mode"
                title={isSimpleMode ? "Turn off Simple Citizen Mode" : "Switch to Citizen Plain-Language Mode"}
                className={`hidden lg:inline-flex items-center gap-1 h-8 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  isSimpleMode
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold"
                    : "text-amber-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={toggleSimpleMode}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSimpleMode ? "Simple: ON" : "Simple"}</span>
              </Button>

              {/* Guided Product Tour Button */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Guided Product Tour"
                title="Start Interactive Guided Tour"
                className="hidden lg:inline-flex h-9 w-9 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg"
                onClick={() => setTourOpen(true)}
              >
                <HelpCircle className="h-4 w-4 text-blue-300" />
              </Button>

              {/* Multi-Language Selector Dropdown */}
              <div className="hidden lg:block">
                <Select value={locale} onValueChange={(v) => setLocale(v as SupportedLocale)}>
                  <SelectTrigger
                    aria-label="Select Portal Language"
                    title="Change Portal Language"
                    className="w-[95px] xl:w-[110px] border-white/20 bg-white/10 text-white text-xs h-8 rounded-lg"
                  >
                    <Globe className="h-3.5 w-3.5 mr-1 text-blue-200 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="bg-white text-slate-800 text-xs">
                    {languages.map((l) => (
                      <SelectItem key={l.code} value={l.code} className="text-xs">
                        {l.nativeName} ({l.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Profile / Role Menu */}
              <div className="relative hidden lg:block">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                  title={`Signed in as ${profile?.full_name || actor} (${role})`}
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 h-8 border border-white/20 bg-white/10 px-2 xl:px-2.5 text-xs text-white hover:bg-white/20 rounded-lg"
                >
                  <User className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                  <span className="hidden xl:inline text-[11px] max-w-[100px] truncate text-slate-200">
                    {profile?.full_name || actor} ·
                  </span>
                  <span className="font-bold text-amber-300 max-w-[90px] truncate">{role}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="border-b border-slate-100 pb-2 mb-2 px-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Signed In As</div>
                      <div className="font-bold text-slate-900 truncate mt-0.5">{profile?.full_name || actor}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user?.email || "Local Demo Session"}</div>
                      <Badge className="mt-1 bg-blue-900 text-white text-[10px]">{role}</Badge>
                    </div>

                    {/* In Memory mode: Role Switcher */}
                    {mode === "memory" && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 px-1">Switch Demo Role</div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {(["Admin", "RB Officer", "PGRC Officer", "Chairperson", "Institute", "Complainant"] as Role[]).map(
                            (r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  setRole(r);
                                  setUserMenuOpen(false);
                                }}
                                className={`text-left px-2 py-1.5 rounded transition-colors ${
                                  role === r ? "bg-blue-900 text-white font-bold" : "hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                {r}
                              </button>
                            )
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetDemo();
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Reset 5,000 Demo Cases</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* In Supabase mode: Sign Out */}
                    {mode === "supabase" && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-1.5 px-2 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out of Account</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile / Tablet Hamburger Button (< 1024px) */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open Navigation Menu"
                className="lg:hidden h-9 w-9 text-white hover:bg-white/10 rounded-lg ml-1"
                onClick={() => setMobileSheetOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="text-xs text-blue-200">Official Portal Login</div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE / TABLET SLIDE-OVER SHEET (< 1024px)                      */}
      {/* Accessible, scrollable, touch-friendly slide-over drawer         */}
      {/* ================================================================ */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSheetOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col text-slate-800 animate-in slide-in-from-right duration-200">
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b px-4 py-3.5 bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-blue-200">
                  <Landmark className="h-4 w-4" />
                </span>
                <span className="font-bold text-base">Samanvay Navigation</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Session Banner */}
            <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Signed In As</div>
                <div className="font-bold text-xs text-slate-900">{profile?.full_name || actor}</div>
              </div>
              <Badge className="bg-blue-900 text-white text-xs">{role}</Badge>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Primary CTA */}
              <Link
                href="/new"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                <FilePlus className="h-4 w-4" />
                <span>+ File Grievance Online</span>
              </Link>

              {/* Direct Links */}
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold min-h-[44px] ${
                    pathname === "/" ? "bg-blue-900 text-white" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/institutions"
                  onClick={() => setMobileSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold min-h-[44px] ${
                    pathname === "/institutions" ? "bg-blue-900 text-white" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Institutions Directory</span>
                </Link>

                <Link
                  href="/reports"
                  onClick={() => setMobileSheetOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold min-h-[44px] ${
                    pathname === "/reports" ? "bg-blue-900 text-white" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <FileBarChart2 className="h-4 w-4 shrink-0" />
                  <span>Analytical Reports</span>
                </Link>
              </div>

              {/* Section 1: Intake (Collapsible) */}
              <div className="border-t pt-2">
                <button
                  type="button"
                  onClick={() => toggleMobileSection("intake")}
                  aria-expanded={!collapsedMobileSections.intake}
                  className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <FilePlus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Grievance Intake</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      collapsedMobileSections.intake ? "-rotate-90" : ""
                    }`}
                  />
                </button>
                {!collapsedMobileSections.intake && (
                  <div className="space-y-0.5 mt-1">
                    <Link
                      href="/assisted-filing"
                      onClick={() => setMobileSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                    >
                      <FilePenLine className="h-4 w-4 text-indigo-700 shrink-0" />
                      <span>Assisted Filing (CSC Mode)</span>
                    </Link>

                    {isStaff && (
                      <Link
                        href="/walk-in"
                        onClick={() => setMobileSheetOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                      >
                        <FilePenLine className="h-4 w-4 text-blue-700 shrink-0" />
                        <span>Walk-In Physical Entry</span>
                      </Link>
                    )}

                    <Link
                      href="/track"
                      onClick={() => setMobileSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                    >
                      <Search className="h-4 w-4 text-slate-600 shrink-0" />
                      <span>Track Grievance Status</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Section 2: Intelligence (Collapsible) */}
              <div className="border-t pt-2">
                <button
                  type="button"
                  onClick={() => toggleMobileSection("intelligence")}
                  aria-expanded={!collapsedMobileSections.intelligence}
                  className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-600" />
                    <span>Intelligence & Analytics</span>
                    {pendingSuspicious > 0 && (
                      <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                        {pendingSuspicious}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      collapsedMobileSections.intelligence ? "-rotate-90" : ""
                    }`}
                  />
                </button>
                {!collapsedMobileSections.intelligence && (
                  <div className="space-y-0.5 mt-1">
                    {isStaff && (
                      <>
                        <Link
                          href="/clusters"
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                        >
                          <Network className="h-4 w-4 text-yellow-700 shrink-0" />
                          <span>Clusters Analysis</span>
                        </Link>

                        <Link
                          href="/watchlist"
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                        >
                          <ShieldAlert className="h-4 w-4 text-rose-700 shrink-0" />
                          <span>Watchlist Monitoring</span>
                        </Link>

                        <Link
                          href="/forecasts"
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                        >
                          <TrendingUp className="h-4 w-4 text-blue-700 shrink-0" />
                          <span>Predictive Forecasts</span>
                        </Link>

                        <Link
                          href="/suspicious"
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                        >
                          <div className="flex items-center gap-3">
                            <Bot className="h-4 w-4 text-purple-700 shrink-0" />
                            <span>Suspicious Queue</span>
                          </div>
                          {pendingSuspicious > 0 && (
                            <Badge className="bg-red-500 text-white text-[9px]">{pendingSuspicious}</Badge>
                          )}
                        </Link>
                      </>
                    )}

                    <Link
                      href="/scorecards"
                      onClick={() => setMobileSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                    >
                      <Award className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>Risk Scorecards (0-100)</span>
                    </Link>

                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          setRulebookDrawerOpen(true);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                      >
                        <BookOpen className="h-4 w-4 text-amber-700 shrink-0" />
                        <span>Rulebook / Notebook AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setOverlapDemoOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-600 shrink-0" />
                      <span>Live Overlap Demo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setImpactOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                    >
                      <TrendingUp className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>ROI Impact Summary</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Section 3: Governance (Collapsible) */}
              <div className="border-t pt-2">
                <button
                  type="button"
                  onClick={() => toggleMobileSection("governance")}
                  aria-expanded={!collapsedMobileSections.governance}
                  className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Governance & Security</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      collapsedMobileSections.governance ? "-rotate-90" : ""
                    }`}
                  />
                </button>
                {!collapsedMobileSections.governance && (
                  <div className="space-y-0.5 mt-1">
                    <Link
                      href="/public/transparency"
                      onClick={() => setMobileSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                    >
                      <Globe className="h-4 w-4 text-blue-700 shrink-0" />
                      <span>Public Transparency</span>
                    </Link>

                    <Link
                      href="/coverage"
                      onClick={() => setMobileSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                    >
                      <ShieldCheck className="h-4 w-4 text-indigo-700 shrink-0" />
                      <span>SIH Coverage Matrix</span>
                    </Link>

                    {role === "Admin" && (
                      <Link
                        href="/admin/users"
                        onClick={() => setMobileSheetOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 min-h-[44px]"
                      >
                        <UserCog className="h-4 w-4 text-amber-700 shrink-0" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setAuditChainOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>Audit Chain Ledger</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setKbOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                    >
                      <BookOpen className="h-4 w-4 text-blue-700 shrink-0" />
                      <span>APH / APM Regulatory Rules</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setAntiRaggingOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-red-700 font-semibold hover:bg-red-50 text-left min-h-[44px]"
                    >
                      <AlertOctagon className="h-4 w-4 text-red-600 shrink-0" />
                      <span>Anti-Ragging 24x7 Fast-Track</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setMfaModalOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 text-left min-h-[44px]"
                    >
                      <KeyRound className="h-4 w-4 text-indigo-700 shrink-0" />
                      <span>TOTP 2FA Security</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sheet Footer: Utilities & Switchers */}
            <div className="border-t bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSimpleMode}
                  className={`flex-1 text-xs h-9 ${
                    isSimpleMode ? "bg-amber-100 text-amber-900 border-amber-300 font-bold" : ""
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {isSimpleMode ? "Simple Mode: ON" : "Simple Mode"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setTourOpen(true);
                  }}
                  className="flex-1 text-xs h-9"
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1" />
                  Product Tour
                </Button>
              </div>

              {/* Language Selector in Mobile */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Language:
                </span>
                <Select value={locale} onValueChange={(v) => setLocale(v as SupportedLocale)}>
                  <SelectTrigger className="w-[140px] text-xs h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    {languages.map((l) => (
                      <SelectItem key={l.code} value={l.code} className="text-xs">
                        {l.nativeName} ({l.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Switcher in Memory Mode */}
              {mode === "memory" && (
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <Select value={role} onValueChange={(v) => { if (v) setRole(v as Role); }}>
                    <SelectTrigger className="w-[140px] text-xs h-8 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-xs">
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="RB Officer">RB Officer</SelectItem>
                      <SelectItem value="PGRC Officer">PGRC Officer</SelectItem>
                      <SelectItem value="Chairperson">Chairperson</SelectItem>
                      <SelectItem value="Institute">Institute</SelectItem>
                      <SelectItem value="Complainant">Complainant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* GLOBAL DRAWERS & MODALS                                          */}
      {/* Mounted at root level so any trigger opens them cleanly          */}
      {/* ================================================================ */}
      <TasksDrawer isOpen={tasksDrawerOpen} onClose={() => setTasksDrawerOpen(false)} />
      <RulebookDrawer isOpen={rulebookDrawerOpen} onClose={() => setRulebookDrawerOpen(false)} />
      <GuidedTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onLaunchOverlapDemo={() => setOverlapDemoOpen(true)}
      />
      <LiveOverlapDemo isOpen={overlapDemoOpen} onClose={() => setOverlapDemoOpen(false)} />
      {auditChainOpen && (
        <AuditChainViewer userRole={role} complaintId="ALL" onClose={() => setAuditChainOpen(false)} />
      )}
      {mfaModalOpen && <MfaModal userRole={role} userId={actor} onClose={() => setMfaModalOpen(false)} />}
      {antiRaggingOpen && <AntiRaggingDialog onClose={() => setAntiRaggingOpen(false)} />}
      {kbOpen && <KnowledgeBaseSearchDialog onClose={() => setKbOpen(false)} />}
      <ImpactPanel isOpen={impactOpen} onClose={() => setImpactOpen(false)} />
    </header>
  );
}
