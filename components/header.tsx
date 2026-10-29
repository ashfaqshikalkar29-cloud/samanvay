"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  FileBarChart2,
  FilePenLine,
  FilePlus,
  Landmark,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  User,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { getSla } from "@/lib/sla";
import { DEMO_TODAY, type Role } from "@/lib/mock";
import { fmtDate } from "@/components/ui-bits";

function BellPopover() {
  const { visible, sendReminder } = useApp();
  const [open, setOpen] = useState(false);

  const urgent = visible
    .filter((c) => c.status !== "Disposed")
    .map((c) => ({ c, sla: getSla(c) }))
    .filter(({ sla }) => sla.state === "Overdue" || sla.state === "Due soon")
    .sort((a, b) => a.sla.daysLeft - b.sla.daysLeft)
    .slice(0, 5);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="SLA reminders"
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
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="text-sm font-semibold text-slate-800">SLA Alerts</p>
            <p className="text-xs text-slate-500">Demo today: {fmtDate(DEMO_TODAY)}</p>
          </div>
          {urgent.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">All cases on track. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {urgent.map(({ c, sla }) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
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
          <div className="border-t border-slate-100 px-4 py-2 text-center">
            <Link href="/" className="text-xs text-blue-700 hover:underline" onClick={() => setOpen(false)}>
              View dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { mode, role, setRole, actor, resetDemo, signOut, user, profile } = useApp();
  const pathname = usePathname();
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // If on /login page, keep header minimal
  const isLoginPage = pathname === "/login";

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/institutions", label: "Institutions", icon: Building2 },
    { href: "/reports", label: "Reports", icon: FileBarChart2 },
    { href: "/new", label: "File Grievance", icon: FilePlus },
    { href: "/walk-in", label: "Walk-In Entry", icon: FilePenLine },
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
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === href
                      ? "bg-white/15 text-white"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {!isLoginPage && (
            <div className="flex items-center gap-2">
              <BellPopover />

              <div className="hidden text-right text-xs leading-tight text-blue-200 md:block">
                <div className="text-[10px] uppercase tracking-wider">Signed in as</div>
                <div className="font-medium text-white">{actor}</div>
              </div>

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
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1 rounded px-3 py-1 text-xs font-medium ${
                  pathname === href ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
