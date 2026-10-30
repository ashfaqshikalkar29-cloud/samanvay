"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Shield,
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  UserCheck,
  UserX,
  FileText,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  OFFICER_ROSTER,
  OfficerProfile,
  smartAssignmentEngine,
} from "@/lib/assignment";
import { ROLE_PERMISSIONS, Permission } from "@/lib/security/rbac";
import { Role, Bureau } from "@/lib/mock";

export default function AdminUsersPage() {
  const [roster, setRoster] = useState<OfficerProfile[]>([...OFFICER_ROSTER]);
  const [searchQuery, setSearchQuery] = useState("");
  const [bureauFilter, setBureauFilter] = useState<"ALL" | "RB" | "PGRC">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ON_LEAVE">("ALL");

  // Modals
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"roster" | "roles_matrix">("roster");

  // New Officer Form
  const [newOfficer, setNewOfficer] = useState({
    name: "",
    bureau: "RB" as Bureau,
    designation: "",
    email: "",
    skills: "",
    assignedRegions: "Northern, Western",
  });

  // Delegation Form
  const [leaveUntil, setLeaveUntil] = useState("2026-11-15");
  const [leaveReason, setLeaveReason] = useState("");
  const [delegateId, setDelegateId] = useState("");

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);

  // Filter Roster
  const filteredRoster = roster.filter((officer) => {
    const matchesSearch =
      officer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      officer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      officer.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      officer.assignedRegions.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBureau = bureauFilter === "ALL" || officer.bureau === bureauFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && !officer.onLeave) ||
      (statusFilter === "ON_LEAVE" && officer.onLeave);

    return matchesSearch && matchesBureau && matchesStatus;
  });

  const handleCreateOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficer.name || !newOfficer.email || !newOfficer.designation) return;

    const created: OfficerProfile = {
      id: `off-${newOfficer.bureau.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: newOfficer.name,
      bureau: newOfficer.bureau,
      designation: newOfficer.designation,
      email: newOfficer.email,
      skills: newOfficer.skills.split(",").map((s) => s.trim()).filter(Boolean),
      assignedRegions: newOfficer.assignedRegions.split(",").map((r) => r.trim()).filter(Boolean),
      onLeave: false,
      activeCasesCount: 0,
    };

    setRoster((prev) => [created, ...prev]);
    setIsOnboardOpen(false);
    setNewOfficer({
      name: "",
      bureau: "RB",
      designation: "",
      email: "",
      skills: "",
      assignedRegions: "Northern, Western",
    });
    setBannerMessage({
      type: "success",
      text: `Officer ${created.name} (${created.bureau}) successfully onboarded to the AICTE roster.`,
    });
  };

  const handleSimulateCsvUpload = () => {
    // Simulated CSV bulk upload of 3 regulatory officers
    const bulkOfficers: OfficerProfile[] = [
      {
        id: "off-rb-bulk-1",
        name: "Dr. Rameshwar Patil",
        bureau: "RB",
        designation: "Joint Secretary (Western Region)",
        email: "r.patil@aicte-india.org",
        skills: ["Fee Regulation", "Capitation Refunds", "Autonomous Colleges"],
        assignedRegions: ["Western"],
        onLeave: false,
        activeCasesCount: 4,
      },
      {
        id: "off-pgrc-bulk-2",
        name: "Ms. Ananya Sen",
        bureau: "PGRC",
        designation: "Grievance Officer (Scholarships & Equal Opportunity)",
        email: "a.sen@aicte-india.org",
        skills: ["Scholarship", "NSP/PFMS", "Student Services", "SC/ST Cell"],
        assignedRegions: ["Eastern", "North-East"],
        onLeave: false,
        activeCasesCount: 6,
      },
      {
        id: "off-rb-bulk-3",
        name: "Er. Vikramaditya Rathore",
        bureau: "RB",
        designation: "Inspection Officer (Curriculum & Norms)",
        email: "v.rathore@aicte-india.org",
        skills: ["Faculty Norms", "Cadre Ratio", "Infrastructure", "NBA Accreditation"],
        assignedRegions: ["North-West", "Northern"],
        onLeave: false,
        activeCasesCount: 2,
      },
    ];

    setRoster((prev) => [...bulkOfficers, ...prev]);
    setIsCsvModalOpen(false);
    setBannerMessage({
      type: "success",
      text: `Bulk Onboarding Completed: 3 AICTE Officers successfully registered from CSV file.`,
    });
  };

  const handleSaveDelegation = () => {
    if (!selectedOfficer) return;

    setRoster((prev) =>
      prev.map((o) => {
        if (o.id === selectedOfficer.id) {
          return {
            ...o,
            onLeave: true,
            leaveUntil,
            leaveReason: leaveReason || "Official Duty / Statutory Inspection",
            delegateOfficerId: delegateId || undefined,
          };
        }
        return o;
      })
    );

    setIsDelegationOpen(false);
    setBannerMessage({
      type: "info",
      text: `Leave recorded for ${selectedOfficer.name}. Incoming cases will be auto-routed to delegate.`,
    });
  };

  const handleReturnFromLeave = (officerId: string) => {
    setRoster((prev) =>
      prev.map((o) => {
        if (o.id === officerId) {
          const { leaveUntil, leaveReason, delegateOfficerId, ...rest } = o;
          return {
            ...rest,
            onLeave: false,
          };
        }
        return o;
      })
    );
    setBannerMessage({
      type: "success",
      text: `Officer marked as returned to duty. Live caseload assignment resumed.`,
    });
  };

  const handleExportAccessReviewCsv = () => {
    const headers = [
      "Officer ID",
      "Full Name",
      "Bureau",
      "Designation",
      "Email Address",
      "Assigned Regions",
      "Active Caseload",
      "Leave Status",
      "Delegate Officer ID",
      "RBAC Permissions Count",
      "MFA Enrolled",
      "Last Access Review Date",
    ];

    const rows = roster.map((o) => {
      const role: Role = o.bureau === "RB" ? "RB Officer" : "PGRC Officer";
      const permissions = ROLE_PERMISSIONS[role] || [];
      return [
        `"${o.id}"`,
        `"${o.name}"`,
        `"${o.bureau}"`,
        `"${o.designation}"`,
        `"${o.email}"`,
        `"${o.assignedRegions.join("; ")}"`,
        o.activeCasesCount || 0,
        o.onLeave ? `"On Leave (until ${o.leaveUntil || "TBD"})"` : '"Active"',
        `"${o.delegateOfficerId || "None"}"`,
        permissions.length,
        '"Enabled (TOTP RFC 6238)"',
        `"${new Date().toISOString().split("T")[0]}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aicte-samanvay-access-review-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-900 text-white shadow-sm">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Staff & Officer Directory
              </h1>
              <p className="text-xs text-slate-500">
                AICTE Centralised Grievance Roster · Smart Assignment Routing & Statutory Access Governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAccessReviewCsv}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Access Review (CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            Bulk CSV Onboard
          </Button>

          <Button
            size="sm"
            onClick={() => setIsOnboardOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-blue-900 hover:bg-blue-800 text-white shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Onboard Officer
          </Button>
        </div>
      </div>

      {/* Banner */}
      {bannerMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-xs ${
            bannerMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b text-xs font-medium">
        <button
          onClick={() => setActiveTab("roster")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "roster"
              ? "border-blue-900 text-blue-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Active Staff Roster ({roster.length})
        </button>

        <button
          onClick={() => setActiveTab("roles_matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === "roles_matrix"
              ? "border-blue-900 text-blue-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          RBAC Role Templates & Permission Matrix
        </button>
      </div>

      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">Total Officers</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{roster.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across 2 Statutory Bureaus</div>
            </div>

            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">Approval Bureau (RB)</div>
              <div className="mt-1 text-2xl font-bold text-indigo-700">
                {roster.filter((o) => o.bureau === "RB").length}
              </div>
              <div className="text-[10px] text-indigo-600 mt-0.5">Institutions, Norms & Faculty</div>
            </div>

            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">Grievance Cell (PGRC)</div>
              <div className="mt-1 text-2xl font-bold text-amber-700">
                {roster.filter((o) => o.bureau === "PGRC").length}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">Student Welfare & Campus Safety</div>
            </div>

            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500">On Statutory Leave</div>
              <div className="mt-1 text-2xl font-bold text-orange-600">
                {roster.filter((o) => o.onLeave).length}
              </div>
              <div className="text-[10px] text-orange-500 mt-0.5">Smart Re-routing Active</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by officer name, email, expertise, or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by Bureau"
                value={bureauFilter}
                onChange={(e) => setBureauFilter(e.target.value as any)}
                className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="ALL">All Bureaus</option>
                <option value="RB">Approval Bureau (RB)</option>
                <option value="PGRC">Grievance Redressal (PGRC)</option>
              </select>

              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active on Duty</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {/* Roster Cards / Table */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoster.map((officer) => (
              <div
                key={officer.id}
                className="flex flex-col justify-between rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow relative"
              >
                {/* Bureau Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        officer.bureau === "RB" ? "bg-indigo-700" : "bg-amber-600"
                      }`}
                    >
                      {officer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{officer.name}</h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{officer.designation}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        officer.bureau === "RB"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {officer.bureau === "RB" ? "Approval Bureau" : "PGRC Cell"}
                    </Badge>

                    {officer.onLeave ? (
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-[9px] border-orange-200">
                        On Leave
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px] border-emerald-200">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-2 text-xs text-slate-600 border-t pt-2.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{officer.email}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Regions: <strong className="text-slate-700">{officer.assignedRegions.join(", ")}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      Active Load:{" "}
                      <strong className="text-blue-900 font-semibold">{officer.activeCasesCount ?? 0} cases</strong>
                    </span>
                  </div>

                  {/* Skills Pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {officer.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Leave Warning Info */}
                  {officer.onLeave && (
                    <div className="mt-2 rounded bg-orange-50 p-2 text-[11px] text-orange-800 border border-orange-200/60">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                        Leave until: {officer.leaveUntil || "Ongoing"}
                      </div>
                      <p className="text-[10px] text-orange-700 mt-0.5">{officer.leaveReason}</p>
                      {officer.delegateOfficerId && (
                        <p className="text-[10px] text-blue-700 font-medium mt-1">
                          Delegate Officer ID: {officer.delegateOfficerId}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t pt-2.5 text-xs">
                  {officer.onLeave ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReturnFromLeave(officer.id)}
                      className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300 h-7"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Mark Duty Resumed
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOfficer(officer);
                        setIsDelegationOpen(true);
                      }}
                      className="text-xs text-orange-700 hover:bg-orange-50 border-orange-300 h-7"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Set Leave & Delegate
                    </Button>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono">{officer.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: RBAC Role Templates & Permissions Matrix */}
      {activeTab === "roles_matrix" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              AICTE Statutory Permission Matrix by Role
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enforced at API gateway and component layers in compliance with AICTE Regulations and DPDP Act 2023.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-700 font-semibold">
                    <th className="py-2.5 px-3">Role Title</th>
                    <th className="py-2.5 px-3">Scope of Redressal</th>
                    <th className="py-2.5 px-3 text-center">Permitted Actions</th>
                    <th className="py-2.5 px-3">Key Responsibilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600">
                  {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((roleKey) => {
                    const permissions = ROLE_PERMISSIONS[roleKey];
                    return (
                      <tr key={roleKey} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-blue-900" />
                            {roleKey}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {roleKey === "Admin" && "Central AICTE Administrator (System-Wide)"}
                          {roleKey === "RB Officer" && "Approval Bureau (Institutions, Norms, Fees)"}
                          {roleKey === "PGRC Officer" && "Grievance Cell (Students, Scholarships, Anti-Ragging)"}
                          {roleKey === "Chairperson" && "Appellate Authority & Final Statutory Decider"}
                          {roleKey === "Institute" && "College Nodal Officer (Self Institution Only)"}
                          {roleKey === "Complainant" && "Aggrieved Student, Faculty or Parent"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {permissions.length} actions
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {permissions.slice(0, 5).join(", ")}
                          {permissions.length > 5 ? ` +${permissions.length - 5} more` : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Onboard New Officer */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-900" />
                <h3 className="font-bold text-slate-900">Onboard Regulatory Officer</h3>
              </div>
              <button onClick={() => setIsOnboardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={newOfficer.name}
                  onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Bureau *</label>
                  <select
                    value={newOfficer.bureau}
                    onChange={(e) => setNewOfficer({ ...newOfficer, bureau: e.target.value as Bureau })}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700"
                  >
                    <option value="RB">Approval Bureau (RB)</option>
                    <option value="PGRC">Grievance Cell (PGRC)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Designation *</label>
                  <Input
                    required
                    placeholder="e.g. Deputy Director"
                    value={newOfficer.designation}
                    onChange={(e) => setNewOfficer({ ...newOfficer, designation: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Official AICTE Email *</label>
                <Input
                  required
                  type="email"
                  placeholder="name@aicte-india.org"
                  value={newOfficer.email}
                  onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Specialisation Skills (comma-separated)</label>
                <Input
                  placeholder="e.g. Fee Regulation, 7th CPC, Audit"
                  value={newOfficer.skills}
                  onChange={(e) => setNewOfficer({ ...newOfficer, skills: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Assigned Regions (comma-separated)</label>
                <Input
                  placeholder="e.g. Northern, Western, Central"
                  value={newOfficer.assignedRegions}
                  onChange={(e) => setNewOfficer({ ...newOfficer, assignedRegions: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOnboardOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800 text-white text-xs">
                  Onboard to Roster
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Bulk Onboarding */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-900" />
                <h3 className="font-bold text-slate-900">Bulk CSV Staff Onboarding</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p>
                Upload a structured CSV file with columns:
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-slate-800">
                  Name, Bureau, Designation, Email, Skills, Regions
                </code>
              </p>

              {/* Upload Dropzone Preview */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/50">
                <Upload className="mx-auto h-8 w-8 text-blue-900/60 mb-2" />
                <div className="text-xs font-semibold text-slate-700">
                  Ready to import sample roster batch (3 regulatory officers)
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  aicte_staff_onboarding_batch_nov2026.csv (4.8 KB)
                </div>
              </div>

              <div className="rounded bg-blue-50 p-2.5 text-[11px] text-blue-900 border border-blue-200">
                <strong className="block font-semibold">Automatic Processing:</strong>
                All imported staff accounts are initialized with TOTP 2FA requirements and assigned to smart-assignment round-robin queues.
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSimulateCsvUpload}
                  className="bg-blue-900 hover:bg-blue-800 text-white text-xs"
                >
                  Confirm & Process CSV Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Leave & Delegation */}
      {isDelegationOpen && selectedOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <h3 className="font-bold text-slate-900">Record Leave & Case Delegation</h3>
              </div>
              <button onClick={() => setIsDelegationOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="rounded bg-slate-50 p-2.5 border">
                <div className="font-semibold text-slate-800">{selectedOfficer.name}</div>
                <div className="text-[11px] text-slate-500">
                  {selectedOfficer.designation} · {selectedOfficer.bureau}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Leave Effective Until *</label>
                <Input
                  type="date"
                  value={leaveUntil}
                  onChange={(e) => setLeaveUntil(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Statutory Reason</label>
                <Input
                  placeholder="e.g. On-Site Inspection Duty in Ahmedabad"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Delegate Officer for Caseload Routing</label>
                <select
                  value={delegateId}
                  onChange={(e) => setDelegateId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700"
                >
                  <option value="">Select fallback officer within bureau...</option>
                  {roster
                    .filter((o) => o.id !== selectedOfficer.id && o.bureau === selectedOfficer.bureau && !o.onLeave)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.activeCasesCount ?? 0} active cases)
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDelegationOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDelegation}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                >
                  Confirm Leave & Delegation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
