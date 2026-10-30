"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  Compass,
  FileBarChart2,
  FilePenLine,
  FilePlus,
  Globe,
  Landmark,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Sparkles,
  TrendingUp,
  User,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function BellPopover() {
  const { visible, sendReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sla" | "nudges">("sla");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [runningNudges, setRunningNudges] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

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
        setNudgeMessage(`Dispatched ${data.nudges_dispatched} proactive nudges (${data.summary.institute_80_urgent} urgent 80% SLA reminders to institutes)`);
        loadNotifications();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningNudges(false);
    }
  };

  const channelIcon = (ch: string) => {
    if (ch === "sms") return <Phone className="h-3.5 w-3.5 text-blue-600" />;
    if (ch === "email") return <Mail className="h-3.5 w-3.5 text-purple-600" />;
    if (ch === "whatsapp") return <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />;
    return <Bell className="h-3.5 w-3.5 text-slate-600" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="SLA reminders and notifications"
        className="relative text-blue-200 hover:bg-white/10 hover:text-white"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {urgent.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {urgent.length}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          {/* Header & Tabs */}
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Activity &amp; Notifications</p>
              <span className="text-[10px] text-slate-500 font-mono">Demo: {fmtDate(DEMO_TODAY)}</span>
            </div>
            <div className="mt-2 flex gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab("sla")}
                className={`flex-1 py-1 rounded-md font-medium text-center transition-colors ${
                  activeTab === "sla" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                SLA Alerts ({urgent.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("nudges");
                  loadNotifications();
                }}
                className={`flex-1 py-1 rounded-md font-medium text-center transition-colors ${
                  activeTab === "nudges" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Proactive Nudges ({notifications.length})
              </button>
            </div>
          </div>

          {activeTab === "sla" ? (
            <div>
              {urgent.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">All cases on track. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {urgent.map(({ c, sla }) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <Link
                          href={`/complaint/${c.id}`}
                          className="text-sm font-semibold text-blue-800 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {c.id}
                        </Link>
                        <p className="text-xs text-slate-500 truncate">{c.category}</p>
                        <p className={`text-xs font-medium ${sla.state === "Overdue" ? "text-red-600" : "text-amber-600"}`}>
                          {sla.state === "Overdue" ? `${-sla.daysLeft}d overdue` : `Due in ${sla.daysLeft}d`}
                          {sla.escalationLevel > 0 && ` · Escalate to ${sla.escalationAuthority}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-7 border-slate-200"
                        onClick={() => {
                          sendReminder(c.id);
                          setOpen(false);
                        }}
                      >
                        Remind
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                <div className="text-[11px] text-blue-900">
                  <p className="font-semibold">Simulated Gateway Adapters</p>
                  <p className="text-blue-700/80">CDAC SMS · NIC Mail · WhatsApp Cloud</p>
                </div>
                <Button
                  size="sm"
                  disabled={runningNudges}
                  onClick={handleRunNudges}
                  className="h-7 text-xs bg-blue-900 hover:bg-blue-800 text-white gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${runningNudges ? "animate-spin" : ""}`} />
                  {runningNudges ? "Evaluating..." : "Run Nudges"}
                </Button>
              </div>

              {nudgeMessage && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 font-medium">
                  ✓ {nudgeMessage}
                </p>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5 truncate max-w-[200px]">
                        {channelIcon(n.channel)}
                        {n.title}
                      </span>
                      <span className="rounded uppercase bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
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

export function Header() {
  const { mode, role, setRole, actor, resetDemo, signOut, user, profile, tasks, suspiciousCases } = useApp();
  const { locale, setLocale, languages, t } = useTranslation();
  const pathname = usePathname();
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ...(isStaff
      ? [
          { href: "/clusters", label: "Clusters", icon: Network },
          { href: "/watchlist", label: "Watchlist", icon: ShieldAlert },
          { href: "/forecasts", label: "Forecasts", icon: TrendingUp },
          {
            href: "/suspicious",
            label: "Suspicious",
            icon: Bot,
            badge: pendingSuspicious > 0 ? pendingSuspicious : undefined,
          },
        ]
      : []),
    { href: "/institutions", label: "Institutions", icon: Building2 },
    { href: "/scorecards", label: "Risk Scorecards", icon: Award },
    { href: "/public/transparency", label: "Transparency", icon: Globe },
    { href: "/reports", label: "Reports", icon: FileBarChart2 },
    { href: "/assisted-filing", label: "Assisted Filing", icon: FilePenLine },
    { href: "/coverage", label: "Coverage", icon: ShieldCheck },
    ...(role === "Admin" ? [{ href: "/admin/users", label: "Admin", icon: UserCog }] : []),
    { href: "/new", label: "File Grievance", icon: FilePlus },
    ...(isStaff ? [{ href: "/walk-in", label: "Walk-In Entry", icon: FilePenLine }] : []),
    { href: "/track", label: "Track Status", icon: Search },
  ];

  return (
    <header className="sticky top-0 z-40 shadow-md">
      {/* tricolour accent */}
      <div className="flex h-1">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      <div className="bg-blue-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-wide">Samanvay</span>
              <span className="hidden text-[10px] uppercase tracking-widest text-blue-200 sm:block">
                AICTE · Integrated Grievance Coordination
              </span>
            </span>
          </Link>

          {/* Desktop nav (only when logged in / not on login page) */}
          {!isLoginPage && (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon, badge }: any) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs xl:text-sm font-medium transition-colors ${
                    pathname === href
                      ? "bg-white/15 text-white"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  {badge && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          )}

          {!isLoginPage && (
            <div className="flex items-center gap-2">
              {/* AICTE Rulebook Q&A Assistant button */}
              {isStaff && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Rulebook AI Assistant"
                  className="relative text-amber-200 hover:bg-white/10 hover:text-white flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  onClick={() => setRulebookDrawerOpen(true)}
                >
                  <BookOpen className="h-4 w-4 text-amber-300" />
                  <span className="hidden sm:inline">Rulebook AI</span>
                </Button>
              )}

              {/* Inter-bureau Tasks button with live badge */}
              {isStaff && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Inter-bureau Tasks"
                  className="relative text-blue-200 hover:bg-white/10 hover:text-white flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  onClick={() => setTasksDrawerOpen(true)}
                >
                  <ListTodo className="h-4 w-4" />
                  <span className="hidden sm:inline">Tasks</span>
                  {pendingTasks.length > 0 && (
                    <span
                      className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                        overdueTasks.length > 0 ? "bg-red-500 animate-pulse" : "bg-blue-600"
                      }`}
                    >
                      {pendingTasks.length}
                    </span>
                  )}
                </Button>
              )}

              <BellPopover />

              <div className="hidden text-right text-xs leading-tight text-blue-200 md:block">
                <div className="text-[10px] uppercase tracking-wider">Signed in as</div>
                <div className="font-medium text-white">{actor}</div>
              </div>

              {/* Anti-Ragging 24x7 Fast-Track Emergency Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Anti-Ragging 24x7"
                className="relative text-red-300 hover:bg-red-500/20 hover:text-red-100 flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border border-red-500/40 rounded-lg animate-pulse"
                onClick={() => setAntiRaggingOpen(true)}
              >
                <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
                <span className="hidden xl:inline">Anti-Ragging 24x7</span>
              </Button>

              {/* Regulatory Knowledge Base Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Knowledge Base"
                className="relative text-blue-200 hover:bg-white/10 hover:text-white flex items-center gap-1.5 px-2 py-1 text-xs"
                onClick={() => setKbOpen(true)}
              >
                <BookOpen className="h-4 w-4 text-blue-300" />
                <span className="hidden md:inline">APH Rules</span>
              </Button>

              {/* Live Overlap Demo Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Live Overlap Demo"
                className="relative text-yellow-300 hover:bg-white/10 hover:text-yellow-100 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
                onClick={() => setOverlapDemoOpen(true)}
              >
                <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                <span className="hidden sm:inline">Live Overlap Demo</span>
              </Button>

              {/* Executive ROI & Impact Metrics Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Executive Impact Metrics"
                className="relative text-yellow-300 hover:bg-white/10 hover:text-yellow-100 flex items-center gap-1.5 px-2 py-1 text-xs font-semibold"
                onClick={() => setImpactOpen(true)}
              >
                <TrendingUp className="h-4 w-4 text-yellow-400" />
                <span className="hidden xl:inline">ROI Impact</span>
              </Button>

              {/* Citizen Plain-Language Simple Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Toggle Simple Mode"
                className={`relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  isSimpleMode
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                    : "text-amber-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={toggleSimpleMode}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{isSimpleMode ? "Simple: ON" : "Simple Mode"}</span>
              </Button>

              {/* Guided Product Tour Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Guided Product Tour"
                className="relative text-blue-200 hover:bg-white/10 hover:text-white flex items-center gap-1.5 px-2 py-1 text-xs"
                onClick={() => setTourOpen(true)}
              >
                <Compass className="h-4 w-4 text-blue-300" />
                <span className="hidden md:inline">Tour</span>
              </Button>

              {/* Cryptographic Hash-Chained Audit Trail Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Audit Chain Ledger"
                className="relative text-emerald-300 hover:bg-white/10 hover:text-emerald-100 flex items-center gap-1.5 px-2 py-1 text-xs font-medium"
                onClick={() => setAuditChainOpen(true)}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="hidden lg:inline">Audit Chain</span>
              </Button>

              {/* TOTP 2FA Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="TOTP 2FA"
                className="relative text-indigo-300 hover:bg-white/10 hover:text-indigo-100 flex items-center gap-1.5 px-2 py-1 text-xs font-medium"
                onClick={() => setMfaModalOpen(true)}
              >
                <KeyRound className="h-4 w-4 text-indigo-400" />
                <span className="hidden lg:inline">2FA</span>
              </Button>

              {/* Multi-Language Selector Dropdown */}
              <Select value={locale} onValueChange={(v) => setLocale(v as SupportedLocale)}>
                <SelectTrigger className="w-[105px] border-white/20 bg-white/10 text-white text-xs h-8">
                  <Globe className="h-3.5 w-3.5 mr-1 text-blue-200 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      {l.nativeName} ({l.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* In Memory mode: Show role switcher dropdown */}
              {mode === "memory" && (
                <>
                  <UserCog className="hidden h-4 w-4 text-blue-200 sm:block" />
                  <Select value={role} onValueChange={(v) => { if (v) setRole(v as Role); }}>
                    <SelectTrigger className="w-[160px] border-white/25 bg-white/10 text-white focus:ring-white/40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="RB Officer">RB Officer</SelectItem>
                      <SelectItem value="PGRC Officer">PGRC Officer</SelectItem>
                      <SelectItem value="Chairperson">Chairperson</SelectItem>
                      <SelectItem value="Institute">Institute</SelectItem>
                      <SelectItem value="Complainant">Complainant</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* In Supabase mode: Role switcher is HIDDEN, show User menu with Sign out */}
              {mode === "supabase" && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20"
                    onClick={() => setUserMenuOpen((o) => !o)}
                  >
                    <User className="h-3.5 w-3.5 text-blue-200" />
                    <span className="font-semibold">{role}</span>
                  </Button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl text-slate-800">
                      <div className="border-b border-slate-100 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-900">{profile?.full_name || actor}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block">
                          {role}
                        </p>
                      </div>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded mt-1 transition-colors"
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reset demo data menu (in memory mode) */}
              {mode === "memory" && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reset demo data"
                    className="text-blue-200 hover:bg-white/10 hover:text-white"
                    onClick={() => setResetMenuOpen((o) => !o)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {resetMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-xl">
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          resetDemo();
                          setResetMenuOpen(false);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" /> Reset demo data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile nav strip */}
        {!isLoginPage && (
          <div className="flex lg:hidden border-t border-white/10 overflow-x-auto px-4 pb-2 gap-1">
            {navLinks.map(({ href, label, icon: Icon, badge }: any) => (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1 rounded px-3 py-1 text-xs font-medium ${
                  pathname === href ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
                {badge && (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Inter-bureau task management drawer */}
      <TasksDrawer isOpen={tasksDrawerOpen} onClose={() => setTasksDrawerOpen(false)} />

      {/* AICTE Rulebook Q&A Knowledge Assistant Drawer */}
      <RulebookDrawer isOpen={rulebookDrawerOpen} onClose={() => setRulebookDrawerOpen(false)} />

      {/* Interactive Product Walkthrough Tour */}
      <GuidedTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onLaunchOverlapDemo={() => setOverlapDemoOpen(true)}
      />

      {/* Interactive Live Overlap & Merge Demo */}
      <LiveOverlapDemo
        isOpen={overlapDemoOpen}
        onClose={() => setOverlapDemoOpen(false)}
      />

      {/* Cryptographic Hash-Chained Audit Trail Viewer */}
      {auditChainOpen && (
        <AuditChainViewer
          userRole={role}
          complaintId="ALL"
          onClose={() => setAuditChainOpen(false)}
        />
      )}

      {/* TOTP Multi-Factor Authentication Modal */}
      {mfaModalOpen && (
        <MfaModal
          userRole={role}
          userId={actor}
          onClose={() => setMfaModalOpen(false)}
        />
      )}

      {/* Emergency Anti-Ragging Fast-Track Dialog */}
      {antiRaggingOpen && (
        <AntiRaggingDialog onClose={() => setAntiRaggingOpen(false)} />
      )}

      {/* AICTE Regulatory Knowledge Base Search Dialog */}
      {kbOpen && (
        <KnowledgeBaseSearchDialog onClose={() => setKbOpen(false)} />
      )}

      {/* Executive ROI & Impact Summary Panel */}
      <ImpactPanel
        isOpen={impactOpen}
        onClose={() => setImpactOpen(false)}
      />
    </header>
  );
}
