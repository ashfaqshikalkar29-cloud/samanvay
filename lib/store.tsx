"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ACTOR,
  OFFICERS,
  type AuditEntry,
  type Complaint,
  type Institution,
  type OverlapAlert,
  type Role,
  type Bureau,
} from "./mock";
import { detectOverlaps, OVERLAP_CONFIG } from "./overlap";
import { getRepo, type UpdatePatch, type AdjudicationPatch } from "./data/repo";
import { getSupabaseBrowserClient } from "./supabase/client";
import { mapDbRoleToAppRole, type DbProfile } from "./supabase/types";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, LogOut } from "lucide-react";

const ENGINE = "Samanvay Overlap Engine";

function alertId(a: string, b: string) {
  return [a, b].sort().join("|");
}

// ── Store interface ────────────────────────────────────────────────────────
interface Store {
  mode: "memory" | "supabase";
  role: Role;
  setRole: (r: Role) => void;
  actor: string;
  user: any | null;
  profile: DbProfile | null;
  noRoleAssigned: boolean;
  loading: boolean;
  error: string | null;
  retryLoad: () => void;
  signOut: () => Promise<void>;

  complaints: Complaint[]; // all complaints
  visible: Complaint[]; // filtered for dashboard table by role
  audit: AuditEntry[];
  institutions: Institution[];
  overlapAlerts: OverlapAlert[];
  overlapThreshold: number;
  setOverlapThreshold: (t: number) => void;
  getInstitution: (id: string) => Institution | undefined;
  updateComplaint: (id: string, patch: UpdatePatch) => Promise<boolean>;
  adjudicateAlert: (patch: AdjudicationPatch) => Promise<void>;
  addComplaint: (c: Complaint) => Promise<void>;
  resetDemo: () => void;
  sendReminder: (complaintId: string) => void;
  escalateCase: (complaintId: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const repo = useMemo(() => getRepo(), []);
  const mode = repo.mode;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [noRoleAssigned, setNoRoleAssigned] = useState(false);

  const [role, setRoleState] = useState<Role>("Admin");
  const [actorName, setActorName] = useState<string>(ACTOR["Admin"]);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [rawComplaints, setRawComplaints] = useState<Complaint[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [overlapAlerts, setOverlapAlerts] = useState<OverlapAlert[]>([]);
  const [overlapThreshold, setOverlapThresholdState] = useState(OVERLAP_CONFIG.threshold);

  const lastSyncSignatureRef = useRef<string>("");

  // Dismissed pairs derived from alerts with status "Dismissed (Distinct)"
  const dismissedPairs = useMemo(() => {
    const s = new Set<string>();
    for (const a of overlapAlerts) {
      if (a.status === "Dismissed (Distinct)") {
        const [idA, idB] = a.complaint_ids;
        s.add(alertId(idA, idB));
      }
    }
    return s;
  }, [overlapAlerts]);

  // Derived: complaints with client-side overlap links computed
  const complaints = useMemo(() => {
    return detectOverlaps(rawComplaints, dismissedPairs, overlapThreshold);
  }, [rawComplaints, dismissedPairs, overlapThreshold]);

  // Derived: visible complaints for dashboard table
  const visible = useMemo(() => {
    if (role === "Admin") return complaints;
    const bureau = role === "RB Officer" ? "RB" : "PGRC";
    return complaints.filter((c) => c.bureau === bureau);
  }, [role, complaints]);

  // Actor display string
  const actor = useMemo(() => {
    if (mode === "supabase" && profile) {
      return `${profile.full_name} (${role})`;
    }
    return actorName;
  }, [mode, profile, role, actorName]);

  const setRole = useCallback(
    (newRole: Role) => {
      if (mode === "supabase") return; // In supabase mode, role is fixed from user profile
      setRoleState(newRole);
      setActorName(ACTOR[newRole]);
    },
    [mode]
  );

  // ── Load data from active repo ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await repo.loadAll();
      setInstitutions(data.institutions);
      setRawComplaints(data.complaints);
      setAudit(data.audit);
      setOverlapAlerts(data.alerts);
    } catch (err: any) {
      console.error("Error loading data from repository:", err);
      setError(err.message || "Failed to load data. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  // ── Authentication & Initial Load ────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (mode === "supabase") {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          await loadData();
          return;
        }

        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUser = authData?.user;

          if (!currentUser) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          if (mounted) setUser(currentUser);

          // Fetch profile row
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (profileErr || !profileData) {
            console.warn("No profile found for authenticated user:", currentUser.id);
            if (mounted) {
              setNoRoleAssigned(true);
              setLoading(false);
            }
            return;
          }

          if (mounted) {
            const mappedRole = mapDbRoleToAppRole(profileData.role);
            setProfile(profileData);
            setRoleState(mappedRole);
            setActorName(profileData.full_name);
            setNoRoleAssigned(false);
          }

          await loadData();
        } catch (err) {
          console.error("Auth initialization error:", err);
          if (mounted) await loadData();
        }
      } else {
        // Memory mode
        await loadData();
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [mode, loadData]);

  // ── Supabase Realtime Subscription ───────────────────────────────────────
  useEffect(() => {
    if (mode !== "supabase") return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel("samanvay-app-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "complaints" },
          () => {
            loadData();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "audit_trail" },
          () => {
            loadData();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "overlap_alerts" },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn("Realtime subscription could not be established:", e);
    }
  }, [mode, loadData]);

  // ── Sync Detected Overlaps to Repo ───────────────────────────────────────
  useEffect(() => {
    if (loading || complaints.length === 0) return;

    // Build newly detected alert objects
    const detected: OverlapAlert[] = [];
    const seen = new Set<string>();

    for (const c of complaints) {
      for (const l of c.overlap_links) {
        const id = alertId(c.id, l.complaint_id);
        if (seen.has(id)) continue;
        seen.add(id);
        const [idA, idB] = id.split("|") as [string, string];
        detected.push({
          id,
          complaint_ids: [idA, idB],
          reason: l.reason,
          score: l.score,
          same_institution: l.same_institution,
          status: "Open",
        });
      }
    }

    // Guard against effect loops
    const currentSignature = detected
      .map((d) => `${d.id}:${d.reason}:${d.score}`)
      .sort()
      .join(";");

    if (currentSignature === lastSyncSignatureRef.current) {
      return;
    }
    lastSyncSignatureRef.current = currentSignature;

    // Update in-memory overlap alerts
    setOverlapAlerts((prevAlerts) => {
      const existingMap = new Map(prevAlerts.map((a) => [a.id, a]));
      for (const d of detected) {
        if (!existingMap.has(d.id)) {
          existingMap.set(d.id, d);
        }
      }
      const detectedIds = new Set(detected.map((d) => d.id));
      for (const [id, a] of existingMap.entries()) {
        if (a.status === "Open" && !detectedIds.has(id)) {
          existingMap.delete(id);
        }
      }
      return Array.from(existingMap.values());
    });

    // Sync to persistence layer
    repo
      .syncAlerts(
        detected,
        complaints.map((c) => c.id)
      )
      .catch((err) => {
        console.warn("Could not sync overlap alerts:", err);
      });
  }, [complaints, loading, repo]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const setOverlapThreshold = useCallback((t: number) => {
    setOverlapThresholdState(t);
  }, []);

  const updateComplaint = useCallback(
    async (id: string, patch: UpdatePatch): Promise<boolean> => {
      const target = complaints.find((c) => c.id === id);
      if (!target) return false;

      const ts = new Date().toISOString();
      const changes: string[] = [];
      const updated: Complaint = { ...target };

      let isBureauTransfer = false;
      let targetBureau: Bureau = target.bureau;

      if (patch.status && patch.status !== target.status) {
        changes.push(`Status changed: ${target.status} → ${patch.status}`);
        updated.status = patch.status;
      }

      if (patch.assigned_officer && patch.assigned_officer !== target.assigned_officer) {
        const o = OFFICERS.find((x) => x.name === patch.assigned_officer);
        if (o) {
          changes.push(`Re-assigned: ${target.assigned_officer} → ${o.name} (${o.bureau})`);
          updated.assigned_officer = o.name;
          if (o.bureau !== target.bureau) {
            isBureauTransfer = true;
            targetBureau = o.bureau;
            updated.bureau = o.bureau;
          }
        }
      }

      if (patch.next_action !== undefined && patch.next_action !== target.next_action) {
        changes.push(`Next action set: ${patch.next_action}`);
        updated.next_action = patch.next_action;
      }

      const remark = patch.remark?.trim() ?? "";
      if (!changes.length && !remark) return false;

      const auditEntry: AuditEntry = {
        complaint_id: id,
        action: changes.length ? changes.join("; ") : "Remark Added",
        timestamp: ts,
        officer: profile?.full_name || ACTOR[role],
        remarks: remark || "—",
      };

      // Optimistic state update
      const prevComplaints = [...rawComplaints];
      const prevAudit = [...audit];

      setRawComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setAudit((prev) => [auditEntry, ...prev]);

      try {
        if (isBureauTransfer && patch.assigned_officer) {
          await repo.transferComplaint(id, patch.assigned_officer, targetBureau);
          // If status or next_action also changed, apply them
          if (patch.status || patch.next_action !== undefined) {
            await repo.updateComplaint(id, {
              status: patch.status,
              next_action: patch.next_action,
            });
          }
        } else {
          await repo.updateComplaint(id, patch);
        }

        await repo.addAudit(auditEntry);
        return true;
      } catch (err: any) {
        console.error("Failed to persist complaint update:", err);
        // Rollback optimistic update
        setRawComplaints(prevComplaints);
        setAudit(prevAudit);
        alert(`Error updating case: ${err.message || "Failed to save changes"}`);
        return false;
      }
    },
    [complaints, rawComplaints, audit, profile, role, repo]
  );

  const adjudicateAlert = useCallback(
    async (patch: AdjudicationPatch) => {
      const ts = new Date().toISOString();
      const [idA, idB] = patch.alertId.split("|").sort();
      const aid = alertId(idA, idB);

      // Optimistic update
      const prevAlerts = [...overlapAlerts];
      const prevComplaints = [...rawComplaints];
      const prevAudit = [...audit];

      setOverlapAlerts((prev) =>
        prev.map((a) =>
          a.id === aid
            ? {
                ...a,
                status: patch.decision,
                lead_bureau: patch.lead_bureau,
                adjudicated_by: patch.adjudicated_by,
                adjudicated_at: ts,
                note: patch.note,
              }
            : a
        )
      );

      if (patch.decision === "Confirmed Duplicate" && patch.lead_bureau) {
        setRawComplaints((prev) =>
          prev.map((c) => {
            if (c.id === idA || c.id === idB) {
              if (c.bureau !== patch.lead_bureau) {
                return { ...c, next_action: `Hold – lead bureau is ${patch.lead_bureau}` };
              }
            }
            return c;
          })
        );
      }

      const actionLabel = `Overlap Adjudicated: ${patch.decision}`;
      const newAuditEntries: AuditEntry[] = [idA, idB].map((cid) => ({
        complaint_id: cid,
        action: actionLabel,
        timestamp: ts,
        officer: patch.adjudicated_by,
        remarks: patch.note || "—",
      }));
      setAudit((prev) => [...newAuditEntries, ...prev]);

      try {
        await repo.adjudicateAlert(patch);
        for (const entry of newAuditEntries) {
          await repo.addAudit(entry);
        }
      } catch (err: any) {
        console.error("Failed to adjudicate alert:", err);
        setOverlapAlerts(prevAlerts);
        setRawComplaints(prevComplaints);
        setAudit(prevAudit);
        alert(`Error adjudicating alert: ${err.message || "Operation failed"}`);
      }
    },
    [overlapAlerts, rawComplaints, audit, repo]
  );

  const addComplaint = useCallback(
    async (newCase: Complaint) => {
      const ts = new Date().toISOString();
      const auditEntry: AuditEntry = {
        complaint_id: newCase.id,
        action: "Complaint Registered",
        timestamp: ts,
        officer: profile?.full_name || ACTOR[role],
        remarks: `Received via ${newCase.bureau} intake channel.`,
      };

      const prevComplaints = [...rawComplaints];
      const prevAudit = [...audit];

      setRawComplaints((prev) => [newCase, ...prev]);
      setAudit((prev) => [auditEntry, ...prev]);

      try {
        await repo.insertComplaint(newCase);
        await repo.addAudit(auditEntry);
      } catch (err: any) {
        console.error("Failed to insert complaint:", err);
        setRawComplaints(prevComplaints);
        setAudit(prevAudit);
        alert(`Error registering complaint: ${err.message || "Failed to create complaint"}`);
      }
    },
    [rawComplaints, audit, profile, role, repo]
  );

  const sendReminder = useCallback(
    (complaintId: string) => {
      const c = complaints.find((x) => x.id === complaintId);
      if (!c) return;
      const ts = new Date().toISOString();
      const entry: AuditEntry = {
        complaint_id: complaintId,
        action: `Reminder sent to ${c.assigned_officer}`,
        timestamp: ts,
        officer: profile?.full_name || ACTOR[role],
        remarks: "Automated SLA reminder dispatched.",
      };
      setAudit((prev) => [entry, ...prev]);
      repo.addAudit(entry).catch((e) => console.warn("Failed to persist reminder:", e));
    },
    [complaints, profile, role, repo]
  );

  const escalateCase = useCallback(
    (complaintId: string) => {
      const c = complaints.find((x) => x.id === complaintId);
      if (!c) return;
      const ts = new Date().toISOString();
      import("./sla").then(({ getSla }) => {
        const sla = getSla(c);
        const entry: AuditEntry = {
          complaint_id: complaintId,
          action: `Escalated to Level ${sla.escalationLevel} – ${sla.escalationAuthority}`,
          timestamp: ts,
          officer: profile?.full_name || ACTOR[role],
          remarks: `Case overdue by ${-sla.daysLeft} day(s). Escalated per SLA policy.`,
        };
        setAudit((prev) => [entry, ...prev]);
        repo.addAudit(entry).catch((e) => console.warn("Failed to persist escalation:", e));
      });
    },
    [complaints, profile, role, repo]
  );

  const resetDemo = useCallback(() => {
    if (mode === "memory") {
      (repo as any).reset();
      loadData();
    } else {
      alert("Reset demo is for in-memory mode. For Supabase, run 'npm run seed'.");
    }
  }, [mode, repo, loadData]);

  const signOut = useCallback(async () => {
    if (mode === "supabase") {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    setUser(null);
    setProfile(null);
    router.push("/login");
  }, [mode, router]);

  const value: Store = {
    mode,
    role,
    setRole,
    actor,
    user,
    profile,
    noRoleAssigned,
    loading,
    error,
    retryLoad: loadData,
    signOut,
    complaints,
    visible,
    audit,
    institutions,
    overlapAlerts,
    overlapThreshold,
    setOverlapThreshold,
    getInstitution: (iid) => institutions.find((i) => i.id === iid),
    updateComplaint,
    adjudicateAlert,
    addComplaint,
    resetDemo,
    sendReminder,
    escalateCase,
  };

  // Screen when account has no role assigned
  if (noRoleAssigned) {
    return (
      <Ctx.Provider value={value}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
          <div className="max-w-md space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No Role Assigned</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your account has no role assigned in the Samanvay system. Contact the administrator to assign you to the Admin, RB Officer, or PGRC Officer bureau role.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="mt-2 border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </Ctx.Provider>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
