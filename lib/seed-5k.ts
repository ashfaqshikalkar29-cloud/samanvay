// ==============================================================================
// SAMANVAY: 5,000+ Fictional Complaints Dataset Generator (H. Seed Script)
// Deterministic Mulberry32 PRNG (seed = 42) with Planted Overlaps & Systemic Clusters
// Clearly marked fictional data for AICTE Smart India Hackathon Demonstration
// ==============================================================================

import { Complaint, Bureau, Channel, Status, OFFICERS } from "./mock";
import { AICTE_INSTITUTIONS_SEED } from "./institutes-seed";
import { defaultEmbeddingService } from "./embeddings";

// Mulberry32 deterministic pseudo-random number generator
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = [
  "Fee Regulation",
  "Faculty Norms",
  "Infrastructure",
  "Scholarship",
  "Approval / Affiliation",
  "Admission Irregularity",
  "Ragging & Campus Safety",
  "Student Services",
];

const CHANNELS: Channel[] = ["web", "mobile", "email", "whatsapp", "helpline", "walk-in"];

// Archetypal complaint issue templates with planted variations
const SEED_TEMPLATES = [
  {
    category: "Fee Regulation",
    bureau: "RB" as Bureau,
    templates: [
      "Institute is demanding capitation fee of Rs. 1,50,000 in cash above the AICTE approved fee schedule for admission to first-year engineering.",
      "College administration collected excess tuition fee of Rs. 85,000 without providing receipt and refusing to refund after seat cancellation.",
      "Development fees charged by institute are 200% above State Fee Regulatory Committee and AICTE guidelines.",
      "Parents forced to pay compulsory caution deposit and hostel development charges despite student being day scholar.",
    ],
  },
  {
    category: "Faculty Norms",
    bureau: "RB" as Bureau,
    templates: [
      "Unqualified faculty without required M.Tech / Ph.D qualifications and industry experience teaching core semester subjects.",
      "Institute running with 40% ad-hoc and guest faculty violating AICTE 1:20 teacher-student cadre ratio norms.",
      "Assistant professors paid consolidated salary of Rs. 20,000/month in cash instead of UGC 7th Central Pay Commission scales.",
      "Biometric attendance records falsified; multiple ghost faculty members registered on AICTE portal during EOA inspection.",
    ],
  },
  {
    category: "Infrastructure",
    bureau: "RB" as Bureau,
    templates: [
      "Computer engineering laboratories lack required licenced software, internet bandwidth is less than 50 Mbps for 1200 students.",
      "Library lacks prescribed IEEE journals and curriculum textbooks; total volume count is less than 50% of mandatory AICTE norms.",
      "Hostel premises lack clean drinking water filtration systems and fire safety NOC from municipal authorities.",
      "Mechanical and civil workshops have obsolete broken machinery creating hazardous conditions for laboratory practicals.",
    ],
  },
  {
    category: "Scholarship",
    bureau: "PGRC" as Bureau,
    templates: [
      "Institute has not disbursed AICTE PG GATE scholarship stipend for the past 5 months despite clearance from central portal.",
      "College accounts office withholding Pragati / Saksham scholarship funds disbursed by AICTE for female students.",
      "Tuition waiver scheme (TFW) students being forced to pay full tuition and exam fees under threat of debarment.",
      "Post-matric scholarship reimbursement delayed due to non-verification of biometric portal credentials by college nodal officer.",
    ],
  },
  {
    category: "Approval / Affiliation",
    bureau: "RB" as Bureau,
    templates: [
      "Institute operating unapproved PG diploma courses in Artificial Intelligence without valid Extension of Approval (EOA) for 2026-27.",
      "College misleading prospective students with false claims of NBA accreditation and AICTE autonomous status on website.",
      "Unsanctioned shift of college campus to an unauthorized commercial building without AICTE approval.",
      "Running evening shift technical courses without sanctioned intake authorization from AICTE regional bureau.",
    ],
  },
  {
    category: "Admission Irregularity",
    bureau: "PGRC" as Bureau,
    templates: [
      "Institute admitted 35 excess students beyond the sanctioned intake of 60 in Computer Science and Engineering department.",
      "Management quota seats filled without following merit list and state counselling reservation criteria.",
      "Direct spot admissions conducted after cutoff date in violation of Supreme Court and AICTE academic calendar guidelines.",
      "College cancelled confirmed admission without valid reason to re-allot seat to higher paying applicant.",
    ],
  },
  {
    category: "Ragging & Campus Safety",
    bureau: "PGRC" as Bureau,
    templates: [
      "Severe physical hazing and psychological harassment by senior hostel inmates in block-B after midnight.",
      "College anti-ragging squad inactive; complaints submitted to principal were ignored and suppressed.",
      "Verbal humiliation and forced servitude of first-year hostel residents; victims terrified to attend morning lectures.",
      "Inadequate CCTV surveillance and lack of security guards in college hostel corridors during night hours.",
    ],
  },
  {
    category: "Student Services",
    bureau: "PGRC" as Bureau,
    templates: [
      "College administration withholding original 10th/12th marksheets, degree certificates and migration certificate after course completion.",
      "Delay of over 4 months in issuing Transfer Certificate (TC) and character certificate to graduating student.",
      "Mandatory internship completion certificates withheld by placement coordinator due to pending alumni association dues.",
      "Examination admit cards blocked due to disputed library fine charges of Rs. 500.",
    ],
  },
];

// Pre-generated seeded complaints cache
let cached5kComplaints: Complaint[] | null = null;

export function generate5kFictionalComplaints(): Complaint[] {
  if (cached5kComplaints) {
    return cached5kComplaints;
  }

  const rand = mulberry32(42);
  const total = 5000;
  const complaints: Complaint[] = [];
  const instCount = AICTE_INSTITUTIONS_SEED.length;

  const startDate = new Date("2026-05-01").getTime();
  const endDate = new Date("2026-10-24").getTime();

  // Helper to pick a random date between May 1, 2026 and Oct 24, 2026
  function randomDateStr() {
    const t = startDate + rand() * (endDate - startDate);
    return new Date(t).toISOString().slice(0, 10);
  }

  // Helper to pick random element
  function pick<T>(arr: T[]): T {
    return arr[Math.floor(rand() * arr.length)];
  }

  // 1. Generate 30 Systemic Hotspot Clusters (Each cluster has 25 to 40 complaints for the same institute)
  const hotspotInstitutes = AICTE_INSTITUTIONS_SEED.slice(0, 30);
  let docketCounter = 2000;

  for (const hInst of hotspotInstitutes) {
    const clusterSize = 25 + Math.floor(rand() * 16); // 25-40 complaints
    const categoryDef = pick(SEED_TEMPLATES);

    for (let c = 0; c < clusterSize; c++) {
      docketCounter++;
      const id = `C-${docketCounter}`;
      const trackingId = `SMV-2026-${(300000 + docketCounter).toString()}`;
      const dateReceived = randomDateStr();
      const channel = pick(CHANNELS);
      const isUrgent = rand() > 0.8;
      const status: Status = dateReceived < "2026-09-01" && rand() > 0.4 ? "Disposed" : rand() > 0.5 ? "In-Process" : "Pending";
      const assignedOfficer = pick(OFFICERS.filter((o) => o.bureau === categoryDef.bureau)).name;

      complaints.push({
        id,
        tracking_id: trackingId,
        institution_id: hInst.id,
        bureau: categoryDef.bureau,
        status,
        category: categoryDef.category,
        channel,
        description: `[FICTIONAL DATA] ${pick(categoryDef.templates)} (Ref: Docket ${id} for ${hInst.name})`,
        date_received: dateReceived,
        assigned_officer: assignedOfficer,
        is_overlap_flagged: false,
        overlap_links: [],
        next_action: status === "Disposed" ? "Case closed and compliance verified" : "Ongoing review by designated officer",
        complainant_phone_last4: Math.floor(1000 + rand() * 9000).toString(),
        urgency: isUrgent ? "high" : "medium",
        legal_risk: rand() > 0.7,
        dynamic_fields: {
          cluster_id: `cluster-${hInst.id}`,
          is_systemic_cluster: true,
          _current_stage: status === "Pending" ? "Scrutiny" : status === "In-Process" ? "Show-Cause" : "Disposed",
        },
      });
    }
  }

  // 2. Generate 160 Planted Near-Duplicate Pairs (320 complaints, similarity > 0.85)
  for (let p = 0; p < 160; p++) {
    const targetInst = pick(AICTE_INSTITUTIONS_SEED);
    const categoryDef = pick(SEED_TEMPLATES);
    const baseText = pick(categoryDef.templates);
    const date1 = randomDateStr();
    const date2 = randomDateStr();

    // Docket A
    docketCounter++;
    const idA = `C-${docketCounter}`;
    const trackingA = `SMV-2026-${(300000 + docketCounter).toString()}`;
    const bureauA = categoryDef.bureau;

    // Docket B (near duplicate text)
    docketCounter++;
    const idB = `C-${docketCounter}`;
    const trackingB = `SMV-2026-${(300000 + docketCounter).toString()}`;
    // 50 of these pairs are cross-bureau duplicates (one RB, one PGRC)
    const bureauB = p < 50 ? (bureauA === "RB" ? "PGRC" : "RB") : bureauA;

    const officerA = pick(OFFICERS.filter((o) => o.bureau === bureauA)).name;
    const officerB = pick(OFFICERS.filter((o) => o.bureau === bureauB)).name;

    const descA = `[FICTIONAL DATA] ${baseText} (Student grievance filed by parent for ${targetInst.name})`;
    const descB = `[FICTIONAL DATA] Urgent notice: ${baseText.replace("Institute", "College").replace("is demanding", "demanded")} (Same issue reported at ${targetInst.name})`;

    complaints.push({
      id: idA,
      tracking_id: trackingA,
      institution_id: targetInst.id,
      bureau: bureauA,
      status: "Pending",
      category: categoryDef.category,
      channel: pick(CHANNELS),
      description: descA,
      date_received: date1,
      assigned_officer: officerA,
      is_overlap_flagged: true,
      overlap_links: [{ complaint_id: idB, score: 0.92, same_institution: true, reason: `Identical ${categoryDef.category} issue reported` }],
      next_action: "Examine counterpart docket for potential duplicate consolidation",
      complainant_phone_last4: Math.floor(1000 + rand() * 9000).toString(),
      urgency: "high",
      legal_risk: true,
      dynamic_fields: {
        is_planted_overlap: true,
        pair_id: `pair-${p}`,
        _current_stage: "Scrutiny",
      },
    });

    complaints.push({
      id: idB,
      tracking_id: trackingB,
      institution_id: targetInst.id,
      bureau: bureauB,
      status: "In-Process",
      category: categoryDef.category,
      channel: pick(CHANNELS),
      description: descB,
      date_received: date2,
      assigned_officer: officerB,
      is_overlap_flagged: true,
      overlap_links: [{ complaint_id: idA, score: 0.92, same_institution: true, reason: `Identical ${categoryDef.category} issue reported` }],
      next_action: "Coordinate with counterpart officer regarding duplicate filing",
      complainant_phone_last4: Math.floor(1000 + rand() * 9000).toString(),
      urgency: "high",
      legal_risk: true,
      dynamic_fields: {
        is_planted_overlap: true,
        pair_id: `pair-${p}`,
        _current_stage: "Show-Cause",
      },
    });
  }

  // 3. Fill the remaining complaints up to 5,000+ across all 210 institutions
  while (complaints.length < total) {
    docketCounter++;
    const id = `C-${docketCounter}`;
    const trackingId = `SMV-2026-${(300000 + docketCounter).toString()}`;
    const targetInst = AICTE_INSTITUTIONS_SEED[Math.floor(rand() * instCount)];
    const categoryDef = pick(SEED_TEMPLATES);
    const dateReceived = randomDateStr();
    const channel = pick(CHANNELS);
    const isUrgent = rand() > 0.85;
    const isCritical = categoryDef.category === "Ragging & Campus Safety" && rand() > 0.7;
    const status: Status = dateReceived < "2026-08-15" && rand() > 0.3 ? "Disposed" : rand() > 0.5 ? "In-Process" : "Pending";
    const assignedOfficer = pick(OFFICERS.filter((o) => o.bureau === categoryDef.bureau)).name;

    complaints.push({
      id,
      tracking_id: trackingId,
      institution_id: targetInst.id,
      bureau: categoryDef.bureau,
      status,
      category: categoryDef.category,
      channel,
      description: `[FICTIONAL DATA] ${pick(categoryDef.templates)} (${targetInst.name}, ${targetInst.district})`,
      date_received: dateReceived,
      assigned_officer: assignedOfficer,
      is_overlap_flagged: false,
      overlap_links: [],
      next_action: status === "Disposed" ? "Case disposed - order communicated" : "Under routine scrutiny",
      complainant_phone_last4: Math.floor(1000 + rand() * 9000).toString(),
      urgency: isCritical ? "critical" : isUrgent ? "high" : "medium",
      legal_risk: rand() > 0.8,
    });
  }

  cached5kComplaints = complaints;
  return complaints;
}

export const generate5kComplaints = generate5kFictionalComplaints;

