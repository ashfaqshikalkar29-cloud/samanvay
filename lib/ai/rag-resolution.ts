import { PrecedentCase, RAGDraftReply, RulebookClauseCitation } from "./types";
import { defaultEmbeddingService, cosineSimilarity } from "@/lib/embeddings";

// Curated precedent bank of resolved AICTE disputes with rulings
export const SEED_PRECEDENT_CASES: PrecedentCase[] = [
  {
    complaint_id: "RESOLVED-2025-081",
    title: "Retention of Original School Leaving Certificate on Student Withdrawal",
    category: "fees",
    institution_type: "Engineering College",
    summary: "Student withdrew before academic session cutoff. Institute demanded entire 4-year tuition fee of Rs 4,80,000 to return original 10th and 12th marksheets.",
    similarity_score: 0.89,
    final_resolution_summary: "Regional Bureau issued show-cause notice under APH Clause 6.3.3. Institute directed to release all original certificates within 48 hours and refund caution deposit deducting only Rs 1,000 processing fee. Institution complied.",
    order_date: "2025-09-14",
    lead_bureau: "RB",
  },
  {
    complaint_id: "RESOLVED-2025-114",
    title: "Arbitrary Capitation Fee for Computer Lab Usage",
    category: "fees",
    institution_type: "Polytechnic Institute",
    summary: "Polytechnic demanded additional Rs 25,000 per semester as compulsory computer & server maintenance fee in cash without official receipt.",
    similarity_score: 0.84,
    final_resolution_summary: "PGRC joint committee ordered complete audit of fee receipts against State Fee Regulatory Committee sanctioned fee structure. Excess fees refunded to 120 students and Rs 5,00,000 penalty imposed on institute.",
    order_date: "2025-11-02",
    lead_bureau: "PGRC",
  },
  {
    complaint_id: "RESOLVED-2025-042",
    title: "Faculty Salary Paid Below AICTE 7th Central Pay Commission Scale",
    category: "faculty",
    institution_type: "Management Institute",
    summary: "Assistant professors paid consolidated Rs 22,000/month instead of UGC/AICTE minimum entry pay band of Rs 57,700 with DA/HRA allowances.",
    similarity_score: 0.86,
    final_resolution_summary: "AICTE Regional Inspection committee verified bank statements. Institute ordered to clear salary arrears within 60 days on penalty of 50% intake reduction for upcoming academic year.",
    order_date: "2025-08-20",
    lead_bureau: "RB",
  },
  {
    complaint_id: "RESOLVED-2025-177",
    title: "Admitting 40 Excess Students Beyond Sanctioned Intake in B.Tech AI",
    category: "approval",
    institution_type: "Private Engineering College",
    summary: "Institute admitted 160 students against approved intake of 120 in Computer Science & Artificial Intelligence.",
    similarity_score: 0.82,
    final_resolution_summary: "Executive Committee reduced institute intake by 40 seats in next year and transferred excess enrolled students to nearby state university affiliated colleges under parity norms.",
    order_date: "2025-10-30",
    lead_bureau: "RB",
  },
  {
    complaint_id: "RESOLVED-2025-209",
    title: "Ragging in First Year Hostel & Absence of Functional CCTV",
    category: "ragging",
    institution_type: "Pharmacy College",
    summary: "Hostel wardens failed to respond to late-night physical hazing of fresher pharmacy students; CCTV in corridors was disconnected.",
    similarity_score: 0.91,
    final_resolution_summary: "Immediate FIR registered against 4 errant senior students under State Prohibition of Ragging Act. College warden dismissed and institute fined Rs 2,50,000 for non-compliance with AICTE Anti-Ragging regulations.",
    order_date: "2025-11-18",
    lead_bureau: "PGRC",
  },
];

// Official AICTE Statutory Regulations Knowledge Chunks (APH 2024-27)
export const AICTE_REGULATION_CHUNKS: RulebookClauseCitation[] = [
  {
    source_document: "AICTE Approval Process Handbook 2024-27",
    chapter: "Chapter VI: Norms for Fee Refund and Retention of Certificates",
    page_number: 84,
    clause_number: "Clause 6.3.1",
    clause_title: "Full Refund upon Withdrawal before Start of Academic Session",
    clause_text: "In the event of a student withdrawing before the start of the course or academic term, the entire fee collected from the student, after a deduction of the processing fee of not more than Rs. 1,000/- (Rupees One Thousand only) shall be refunded within seven days of the request.",
    relevance_score: 0.95,
  },
  {
    source_document: "AICTE Approval Process Handbook 2024-27",
    chapter: "Chapter VI: Norms for Fee Refund and Retention of Certificates",
    page_number: 85,
    clause_number: "Clause 6.3.3",
    clause_title: "Strict Prohibition on Withholding Original Certificates",
    clause_text: "No Technical Institution shall retain school/institute leaving certificates, mark sheets, degree certificates or any other original documents of students in their custody. Any violation shall attract withdrawal of Approval and punitive financial penalties under Section 10(u) of the AICTE Act.",
    relevance_score: 0.97,
  },
  {
    source_document: "AICTE Regulations on Pay Scales and Service Conditions 2019/2024",
    chapter: "Chapter VII: Faculty Qualifications and Cadre Ratio Norms",
    page_number: 112,
    clause_number: "Clause 7.2.4",
    clause_title: "Mandatory Payment through Electronic Banking at 7th CPC Scales",
    clause_text: "All Technical Institutions must disburse monthly salary to all teaching and non-teaching faculty directly through electronic bank transfer matching AICTE 7th CPC entry pay bands. Cash payments or unauthorized deductions are strictly prohibited.",
    relevance_score: 0.92,
  },
  {
    source_document: "AICTE Approval Process Handbook 2024-27",
    chapter: "Chapter VIII: Penal Action in Case of Violations",
    page_number: 140,
    clause_number: "Clause 8.4.1",
    clause_title: "Penalties for Excess Admissions beyond Sanctioned Intake",
    clause_text: "An institution admitting students in excess of the approved intake shall be liable to punitive actions including 5-times tuition fee penalty per excess student and reduction of sanctioned seats by 50% for the subsequent academic year.",
    relevance_score: 0.88,
  },
  {
    source_document: "AICTE Regulations on Curbing the Menace of Ragging in Technical Institutions",
    chapter: "Chapter IX: Institutional Anti-Ragging Mandate",
    page_number: 156,
    clause_number: "Clause 9.1.2",
    clause_title: "Mandatory Anti-Ragging Squad and 24x7 Monitoring",
    clause_text: "Institutions must maintain an active Anti-Ragging Committee headed by the Head of Institution, install 24x7 CCTV coverage at vulnerable hostel premises, and lodge an immediate police FIR within 24 hours of receiving any ragging complaint.",
    relevance_score: 0.94,
  },
];

export class RAGResolutionService {
  async generateDraftReply(
    complaintText: string,
    category: string,
    institutionName: string
  ): Promise<RAGDraftReply> {
    const queryEmb = await defaultEmbeddingService.embed(`${category} ${complaintText}`);

    // 1. Rank Precedents
    const scoredPrecedents: PrecedentCase[] = [];
    for (const p of SEED_PRECEDENT_CASES) {
      const pEmb = await defaultEmbeddingService.embed(`${p.category} ${p.summary} ${p.title}`);
      const sim = cosineSimilarity(queryEmb, pEmb);
      scoredPrecedents.push({
        ...p,
        similarity_score: Math.round(sim * 100) / 100,
      });
    }
    scoredPrecedents.sort((a, b) => b.similarity_score - a.similarity_score);
    const topPrecedents = scoredPrecedents.slice(0, 2);

    // 2. Rank AICTE Handbook Clauses
    const scoredClauses: RulebookClauseCitation[] = [];
    for (const c of AICTE_REGULATION_CHUNKS) {
      const cEmb = await defaultEmbeddingService.embed(`${c.chapter} ${c.clause_title} ${c.clause_text}`);
      const sim = cosineSimilarity(queryEmb, cEmb);
      scoredClauses.push({
        ...c,
        relevance_score: Math.round(sim * 100) / 100,
      });
    }
    scoredClauses.sort((a, b) => b.relevance_score - a.relevance_score);
    const topClauses = scoredClauses.slice(0, 2);

    const primaryClause = topClauses[0];

    // 3. Draft structured formal statutory reply
    const draftText = `REF: AICTE/GRV/${new Date().getFullYear()}/STAT-NOTICE

To,
The Principal / Director,
${institutionName}

SUBJECT: Direction under AICTE Statutory Regulations regarding Grievance Petition on "${category.toUpperCase()}"

Sir / Madam,

1. The All India Council for Technical Education (AICTE) has received a formal grievance docket alleging violation of statutory council norms regarding:
"${complaintText.slice(0, 240)}..."

2. Your attention is drawn to ${primaryClause.source_document}, ${primaryClause.chapter}, ${primaryClause.clause_number} ("${primaryClause.clause_title}"):
"${primaryClause.clause_text}"

3. Furthermore, precedent in similar administrative proceedings (${topPrecedents[0]?.title || "AICTE Precedent"}) established that technical institutions are legally bound to adhere strictly to prescribed guidelines.

4. ACCORDINGLY, you are hereby directed to:
   a) Immediately review the matter and submit a verified point-wise compliance report along with certified ledger/records within seven (7) calendar days of receipt of this notice.
   b) Refrain from taking any coercive action against the petitioner pending disposal of these proceedings.

Failure to submit the compliance report within the stipulated timeframe shall invite appropriate action under Chapter VIII of the AICTE Approval Process Handbook, including financial penalty and intake restriction.

By Order of Competent Authority,
AICTE Grievance Redressal Bureau`;

    return {
      draft_text: draftText,
      subject_line: `AICTE Direction: Grievance Petition under ${primaryClause.clause_number} regarding ${institutionName}`,
      citations: topClauses,
      similar_precedents: topPrecedents,
      recommended_statutory_order: `Issue 7-day show-cause direction under ${primaryClause.clause_number}`,
      confidence: 0.91,
    };
  }
}

export const defaultRAGResolution = new RAGResolutionService();
