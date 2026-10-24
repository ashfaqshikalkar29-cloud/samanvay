export type Bureau = "RB" | "PGRC";
export type Status = "Pending" | "In-Process" | "Disposed";
export type Role = "Admin" | "RB Officer" | "PGRC Officer";

/** Fixed "today" for the demo — never use new Date() for rendering logic. */
export const DEMO_TODAY = "2026-10-24";

// ── SLA configuration ──────────────────────────────────────────────────────
export const SLA_DAYS: Record<string, number> = {
  "Fee Regulation": 15,
  "Faculty Norms": 21,
  "Admission Irregularity": 15,
  "Approval / Affiliation": 30,
  Infrastructure: 30,
  Scholarship: 30,
  "Hostel & Amenities": 30,
  "Student Services": 30,
  Recognition: 30,
};

// ── Escalation authorities ─────────────────────────────────────────────────
export const ESCALATION: { level: number; authority: string }[] = [
  { level: 1, authority: "Section Head" },
  { level: 2, authority: "Director" },
];

export interface Institution {
  id: string;
  aicte_id: string;
  name: string;
  region: string;
}

export interface OverlapLink {
  complaint_id: string;
  reason: string;
  score: number; // 0..1 text similarity
  same_institution: boolean;
}

export interface OverlapAlert {
  id: string;                        // sorted ids joined by "|"
  complaint_ids: [string, string];
  reason: string;
  score: number;
  same_institution: boolean;
  status: "Open" | "Confirmed Duplicate" | "Dismissed (Distinct)";
  lead_bureau?: Bureau;
  adjudicated_by?: string;
  adjudicated_at?: string;
  note?: string;
}

export interface Complaint {
  id: string;
  institution_id: string;
  bureau: Bureau;
  status: Status;
  category: string;
  description: string | null;
  date_received: string; // YYYY-MM-DD
  assigned_officer: string;
  is_overlap_flagged: boolean;
  overlap_links: OverlapLink[];
  next_action: string;
  consolidated_under?: string;       // Phase 4: lead case id
}

export interface AuditEntry {
  complaint_id: string;
  action: string;
  timestamp: string; // ISO
  officer: string;
  remarks: string;
}

export const OFFICERS: { name: string; bureau: Bureau }[] = [
  { name: "Dr. A. Kulkarni", bureau: "RB" },
  { name: "Mr. S. Verma", bureau: "RB" },
  { name: "Ms. R. Iyer", bureau: "PGRC" },
  { name: "Mr. P. Nair", bureau: "PGRC" },
];

// Who "you" are for each role (used in the audit log)
export const ACTOR: Record<Role, string> = {
  Admin: "Admin Console",
  "RB Officer": "Dr. A. Kulkarni",
  "PGRC Officer": "Ms. R. Iyer",
};

export const institutions: Institution[] = [
  { id: "inst-1", aicte_id: "1-4021", name: "Sahyadri Institute of Engineering & Technology", region: "Western" },
  { id: "inst-2", aicte_id: "1-5530", name: "Kaveri College of Engineering", region: "Southern" },
  { id: "inst-3", aicte_id: "1-2217", name: "Himalaya Institute of Management Studies", region: "Northern" },
  { id: "inst-4", aicte_id: "1-3345", name: "Gangetic Polytechnic & Technical Institute", region: "Eastern" },
  { id: "inst-5", aicte_id: "1-6102", name: "Vindhya Institute of Technology", region: "Central" },
  { id: "inst-6", aicte_id: "1-7788", name: "Brahmaputra College of Engineering", region: "North-Eastern" },
  { id: "inst-7", aicte_id: "1-1894", name: "Deccan School of Planning & Architecture", region: "Southern" },
  { id: "inst-8", aicte_id: "1-9051", name: "Aravali Institute of Pharmacy", region: "Northern" },
];

// Seed dates tuned so demo has:
//   Overdue L2 (>7d): C-1001 (Fee Reg, 15d SLA, received 2026-10-02 → due 2026-10-17, 7d overdue)
//   Overdue L1 (1-7d): C-1009 (Adm Irr, 15d SLA, received 2026-10-05 → due 2026-10-20, 4d overdue)
//   Due soon: C-1003 (Faculty, 21d SLA, received 2026-10-04 → due 2026-10-25, 1d left)
//             C-1010 (Adm Irr, 15d SLA, received 2026-10-10 → due 2026-10-25, 1d left)
//   On track: everything else
export const seedComplaints: Complaint[] = [
  {
    id: "C-1001", institution_id: "inst-1", bureau: "RB", status: "Pending",
    category: "Fee Regulation",
    description: "Institute is charging tuition and development fees far above the AICTE approved fee structure for first-year B.Tech students.",
    date_received: "2026-10-02", assigned_officer: "Dr. A. Kulkarni",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Issue show-cause notice to institution",
  },
  {
    id: "C-1002", institution_id: "inst-1", bureau: "PGRC", status: "In-Process",
    category: "Fee Regulation",
    description: "Parents allege collection of additional capitation money and refusal to refund fees after admission cancellation.",
    date_received: "2026-10-09", assigned_officer: "Ms. R. Iyer",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Await institution reply (due 2026-10-28)",
  },
  {
    id: "C-1003", institution_id: "inst-2", bureau: "RB", status: "In-Process",
    category: "Faculty Norms",
    description: "Faculty appointed without required qualifications and experience as per AICTE norms; unqualified lecturers teaching core subjects.",
    date_received: "2026-10-04", assigned_officer: "Mr. S. Verma",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Schedule hearing with department head",
  },
  {
    id: "C-1004", institution_id: "inst-2", bureau: "PGRC", status: "Pending",
    category: "Faculty Norms",
    description: "Students complain that unqualified faculty without prescribed qualifications are teaching core engineering subjects.",
    date_received: "2026-10-12", assigned_officer: "Mr. P. Nair",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Issue show-cause notice to institution",
  },
  {
    id: "C-1005", institution_id: "inst-2", bureau: "PGRC", status: "Pending",
    category: "Infrastructure",
    description: "Laboratory equipment is outdated and library facilities are below prescribed norms.",
    date_received: "2026-10-16", assigned_officer: "Ms. R. Iyer",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Arrange on-site inspection",
  },
  {
    id: "C-1006", institution_id: "inst-3", bureau: "RB", status: "Disposed",
    category: "Approval / Affiliation",
    description: "Institute running programme without valid extension of approval for academic year 2025-26.",
    date_received: "2026-08-14", assigned_officer: "Dr. A. Kulkarni",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Case closed — disposal order issued",
  },
  {
    id: "C-1007", institution_id: "inst-3", bureau: "PGRC", status: "Pending",
    category: "Approval / Affiliation",
    description: "Student reports that the institute displays its approval status falsely on the website.",
    date_received: "2026-10-15", assigned_officer: "Mr. P. Nair",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Verify website claim and issue clarification notice",
  },
  {
    id: "C-1008", institution_id: "inst-4", bureau: "PGRC", status: "Disposed",
    category: "Scholarship",
    description: "Delay in disbursement of scholarship amount to diploma students.",
    date_received: "2026-07-20", assigned_officer: "Ms. R. Iyer",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Case closed — disbursement confirmed",
  },
  {
    id: "C-1009", institution_id: "inst-5", bureau: "RB", status: "Pending",
    category: "Admission Irregularity",
    description: "Admission of students in excess of the AICTE approved intake in Computer Science and Engineering program.",
    date_received: "2026-10-05", assigned_officer: "Dr. A. Kulkarni",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Obtain admission register for scrutiny",
  },
  {
    id: "C-1010", institution_id: "inst-6", bureau: "PGRC", status: "In-Process",
    category: "Admission Irregularity",
    description: "Institute has admitted students in excess of approved intake in Computer Science and Engineering program violating AICTE norms.",
    date_received: "2026-10-10", assigned_officer: "Mr. P. Nair",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Await institution reply on excess admissions",
  },
  {
    id: "C-1011", institution_id: "inst-7", bureau: "RB", status: "In-Process",
    category: "Hostel & Amenities",
    description: "Hostel accommodation lacks drinking water and sanitation facilities.",
    date_received: "2026-10-08", assigned_officer: "Mr. S. Verma",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Physical inspection scheduled",
  },
  {
    id: "C-1012", institution_id: "inst-8", bureau: "PGRC", status: "Pending",
    category: "Student Services",
    description: "Student alleges withholding of original certificates after course completion due to unpaid dues.",
    date_received: "2026-10-18", assigned_officer: "Ms. R. Iyer",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Request affidavit from student and response from institution",
  },
  {
    id: "C-1013", institution_id: "inst-4", bureau: "RB", status: "Pending",
    category: "Recognition",
    description: "Institute conducting unapproved diploma courses in violation of AICTE regulations.",
    date_received: "2026-10-20", assigned_officer: "Dr. A. Kulkarni",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Verify programme approval records",
  },
  {
    id: "C-1014", institution_id: "inst-7", bureau: "RB", status: "Disposed",
    category: "Student Services",
    description: "Delay in issuing transfer certificate to a final-year student.",
    date_received: "2026-08-30", assigned_officer: "Mr. S. Verma",
    is_overlap_flagged: false, overlap_links: [],
    next_action: "Case closed — TC issued",
  },
];

const day = 86_400_000;
const at = (date: string, plusDays: number, hh = "10:30") =>
  new Date(Date.parse(`${date}T${hh}:00.000Z`) + plusDays * day).toISOString();

export function buildSeedAudit(): AuditEntry[] {
  const out: AuditEntry[] = [];
  for (const c of seedComplaints) {
    out.push({
      complaint_id: c.id, action: "Complaint Registered",
      timestamp: at(c.date_received, 0, "09:15"), officer: "System",
      remarks: `Received via ${c.bureau} intake channel.`,
    });
    out.push({
      complaint_id: c.id, action: `Assigned to ${c.assigned_officer}`,
      timestamp: at(c.date_received, 1), officer: "Admin Console",
      remarks: "Initial allocation.",
    });
    if (c.status !== "Pending") {
      out.push({
        complaint_id: c.id, action: "Status changed: Pending → In-Process",
        timestamp: at(c.date_received, 3, "14:00"), officer: c.assigned_officer,
        remarks: "Notice issued to institution seeking response.",
      });
    }
    if (c.status === "Disposed") {
      out.push({
        complaint_id: c.id, action: "Status changed: In-Process → Disposed",
        timestamp: at(c.date_received, 9, "16:45"), officer: c.assigned_officer,
        remarks: "Institution response examined; case closed.",
      });
    }
  }
  return out;
}
