import { AICaseSummary } from "./types";
import { CaseEvent } from "@/lib/timeline";
import { AuditEntry } from "@/lib/mock";

export interface SummarizerService {
  summarize(
    complaintId: string,
    description: string,
    category: string,
    institutionName: string,
    events?: CaseEvent[],
    audit?: AuditEntry[]
  ): Promise<AICaseSummary>;
}

// In-memory LRU-like cache for instant retrieval
const summaryCache = new Map<string, AICaseSummary>();

function createContentHash(complaintId: string, desc: string, eventCount: number): string {
  let hash = 0;
  const str = `${complaintId}:${desc.length}:${desc.slice(0, 40)}:${eventCount}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `hash-${Math.abs(hash)}`;
}

export class HeuristicSummarizer implements SummarizerService {
  async summarize(
    complaintId: string,
    description: string,
    category: string,
    institutionName: string,
    events: CaseEvent[] = [],
    audit: AuditEntry[] = []
  ): Promise<AICaseSummary> {
    const totalEvents = events.length + audit.length;
    const currentHash = createContentHash(complaintId, description || "", totalEvents);

    // Return cached summary if unchanged
    const cached = summaryCache.get(complaintId);
    if (cached && cached.content_hash === currentHash) {
      return cached;
    }

    // 1. Generate core complaint paragraph
    const cleanDesc = (description || "No complaint text provided.").replace(/\s+/g, " ").trim();
    const sentences = cleanDesc.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
    const leadSentence = sentences[0] || cleanDesc.slice(0, 160);
    const detailSentence = sentences[1] || "";

    const complaintSummary = `Complainant filed a ${category.toUpperCase()} grievance regarding ${institutionName}. Core allegation involves: ${leadSentence}. ${
      detailSentence ? `Specifically, ${detailSentence}.` : ""
    } Grievance requires verification against statutory AICTE guidelines and inter-bureau records.`;

    // 2. Generate timeline chronology digest
    const digest: string[] = [];
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);
      for (const e of sorted) {
        digest.push(`${e.bureau} [${e.event_type.toUpperCase()}]: ${e.title} (${new Date(e.created_at).toLocaleDateString("en-IN")})`);
      }
    } else if (audit.length > 0) {
      const sortedAudit = [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
      for (const a of sortedAudit) {
        digest.push(`${a.officer}: ${a.action} (${a.timestamp.slice(0, 10)})`);
      }
    } else {
      digest.push("Initial docket registered; awaiting preliminary examination by assigned bureau officer.");
    }

    // 3. Recommended immediate step
    let recStep = "Issue statutory notice to institution seeking point-wise explanation within 7 working days.";
    const lower = cleanDesc.toLowerCase();
    if (lower.includes("refund") || lower.includes("fee")) {
      recStep = "Direct institute to produce student fee ledger & bank transaction reconciliation statement under AICTE Fee Refund Norms.";
    } else if (lower.includes("ragging")) {
      recStep = "Convene emergency Anti-Ragging Committee sitting within 24 hours and secure CCTV / hostel logbooks.";
    } else if (lower.includes("faculty") || lower.includes("salary")) {
      recStep = "Requisition PF / salary bank disbursement statements for the last 6 months to verify AICTE 7th CPC compliance.";
    }

    const summaryObj: AICaseSummary = {
      complaint_id: complaintId,
      complaint_summary: complaintSummary,
      timeline_digest: digest,
      key_parties: ["AICTE Bureau", institutionName, "Complainant"],
      recommended_first_step: recStep,
      generated_at: new Date().toISOString(),
      content_hash: currentHash,
    };

    summaryCache.set(complaintId, summaryObj);
    return summaryObj;
  }
}

export const defaultSummarizer = new HeuristicSummarizer();
