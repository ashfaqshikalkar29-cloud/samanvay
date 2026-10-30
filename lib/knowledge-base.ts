/**
 * Samanvay AICTE Grievance Portal
 * Regulatory Knowledge Base Engine (Domain C)
 * Searchable AICTE Approval Process Handbook (APH) regulations, fee refund norms,
 * anti-ragging mandates, and scholarship guidelines.
 */

export interface KnowledgeArticle {
  id: string;
  category: string;
  title: string;
  aph_clause: string;
  summary: string;
  full_text: string;
  keywords: string[];
  last_updated: string;
  statutory_remedy: string;
}

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "KB-FEE-001",
    category: "Fee Regulation",
    title: "Mandatory Full Refund of Tuition & Caution Fee upon Seat Cancellation",
    aph_clause: "AICTE Approval Process Handbook 2026-27 Clause 7.1.3",
    summary:
      "Institutions are legally mandated to refund 100% of collected tuition, library, and laboratory fees after deducting a maximum processing fee of Rs 1,000 if cancellation is requested prior to the statutory cut-off date.",
    full_text:
      "In the event of a student withdrawing before the start of the course, the entire fee collected from the student, after a deduction of the processing fee of not more than Rs. 1000/- (Rupees One Thousand only) shall be refunded by the Institution. If a student leaves after joining the course and if the vacated seat is filled by another candidate, the Institution must refund the fee collected proportionate to monthly occupancy. Retention of original certificates is strictly prohibited.",
    keywords: ["fee refund", "seat cancellation", "caution deposit", "processing fee", "tuition refund", "withdrawing"],
    last_updated: "2026-05-15",
    statutory_remedy: "Show-cause notice and 50% intake reduction penalty under AICTE Act Section 10.",
  },
  {
    id: "KB-CERT-002",
    category: "Student Services",
    title: "Strict Prohibition on Withholding Original Certificates & Marksheets",
    aph_clause: "AICTE Regulations on Prohibition of Unfair Practices Clause 4.2(d)",
    summary:
      "No technical institution or university shall retain any original educational documents, school leaving certificates, or degree transcripts of students under any circumstances, including pending fee claims.",
    full_text:
      "It shall be unlawful for any technical institution to detain or retain any school or college leaving certificates, mark sheets, migration certificates, or degree documents submitted at the time of admission. Institutions may only physically verify originals in the presence of the candidate and promptly return them, retaining attested photocopies.",
    keywords: ["certificate", "marksheet", "withholding", "original documents", "degree", "transcript", "detention"],
    last_updated: "2026-04-10",
    statutory_remedy: "Immediate restoration directive; Suspension of Approval for the subsequent academic session.",
  },
  {
    id: "KB-RAG-003",
    category: "Campus Safety",
    title: "Zero-Tolerance Anti-Ragging Mandate & 24x7 Helpline Protocol",
    aph_clause: "AICTE Prevention & Prohibition of Ragging in Technical Institutions Regulations 2009",
    summary:
      "Ragging in any form (physical, psychological, sexual, or cyber) is a non-bailable cognizable offence. Institutions must register an FIR within 24 hours of receiving a complaint.",
    full_text:
      "Every institution must constitute an Anti-Ragging Committee headed by the Head of Institution and an Anti-Ragging Squad. On receipt of any information regarding ragging, the Head of Institution must immediately determine if a prima facie case exists, and if so, file an FIR within 24 hours with local police authorities under Bharatiya Nyaya Sanhita (BNS) 2023. Failure by the college invites immediate withdrawal of approval.",
    keywords: ["ragging", "anti-ragging", "FIR", "police", "helpline", "harassment", "hostel safety", "BNS"],
    last_updated: "2026-06-01",
    statutory_remedy: "Mandatory FIR, criminal proceedings, and withdrawal of AICTE affiliation.",
  },
  {
    id: "KB-SCH-004",
    category: "Scholarship",
    title: "AICTE Pragati & Saksham Scholarship Disbursement Guidelines",
    aph_clause: "AICTE Special Schemes for Technical Education 2026",
    summary:
      "Direct Benefit Transfer (DBT) of Rs 50,000 per annum for eligible girl students (Pragati) and differently-abled students (Saksham) admitted to AICTE approved degree/diploma courses.",
    full_text:
      "Scholarship funds are directly disbursed into Aadhaar-seeded bank accounts of students via PFMS. Colleges are strictly prohibited from demanding tuition payment upfront from Pragati scholars if fee waiver is guaranteed by state government schemes, and College Nodal Officers (CNO) must verify applications on the NSP Portal within 7 working days.",
    keywords: ["pragati", "saksham", "scholarship", "DBT", "NSP", "PFMS", "girl student", "disbursement"],
    last_updated: "2026-03-20",
    statutory_remedy: "PFMS status lookup, CNO compliance notice, and expedited nodal clearance.",
  },
  {
    id: "KB-FAC-005",
    category: "Faculty Norms",
    title: "Faculty Cadre Ratio, 7th CPC Salary Scale & Timely Disbursal",
    aph_clause: "AICTE Pay Scales, Service Conditions & Minimum Qualifications Regulations 2019",
    summary:
      "Institutions must maintain a 1:15 or 1:20 teacher-to-student ratio and disburse full salaries per 7th Central Pay Commission scales directly to bank accounts without deductions or salary withholding.",
    full_text:
      "Payment of salaries to all teaching and non-teaching staff must be executed through electronic bank transfer on or before the 7th of every calendar month. Delay in payment exceeding 60 days constitutes a severe violation, and institutions attempting to force faculty resignations or withhold service books face withdrawal of approved intake.",
    keywords: ["faculty salary", "7th CPC", "salary delay", "cadre ratio", "PF", "service book", "unpaid salary"],
    last_updated: "2026-02-18",
    statutory_remedy: "Comprehensive financial audit, Show-Cause Notice, and freezing of admission quota.",
  },
];

class KnowledgeBaseService {
  searchArticles(query: string, category?: string): KnowledgeArticle[] {
    const clean = query.trim().toLowerCase();
    return KNOWLEDGE_BASE_ARTICLES.filter((article) => {
      const matchCategory = !category || category === "ALL" || article.category === category;
      if (!matchCategory) return false;

      if (!clean) return true;

      const inTitle = article.title.toLowerCase().includes(clean);
      const inClause = article.aph_clause.toLowerCase().includes(clean);
      const inSummary = article.summary.toLowerCase().includes(clean);
      const inKeywords = article.keywords.some((k) => k.toLowerCase().includes(clean));

      return inTitle || inClause || inSummary || inKeywords;
    });
  }

  getArticleById(id: string): KnowledgeArticle | undefined {
    return KNOWLEDGE_BASE_ARTICLES.find((a) => a.id === id);
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
