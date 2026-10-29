// ==============================================================================
// SAMANVAY: Related-Complaint Clustering Engine (2.2)
// Hierarchical / Agglomerative Clustering for Systemic AICTE Issues
// ==============================================================================

import type { Bureau, Complaint, Institution } from "@/lib/mock";
import { cosineSimilarity, defaultEmbeddingService } from "@/lib/embeddings";

export interface ComplaintCluster {
  id: string;
  title: string;
  category: string;
  complaint_ids: string[];
  complaints: Complaint[];
  institutions: { id: string; name: string; region: string }[];
  complaint_count: number;
  bureaus_involved: Bureau[];
  date_range: { start: string; end: string };
  severity: "Critical" | "High" | "Medium" | "Low";
  summary: string;
  suggested_action: string;
}

const CATEGORY_TITLES: Record<string, string> = {
  fees: "Systemic Capitation & Certificate Retention Irregularities",
  approval: "Unsanctioned Intake & Land Norm Non-Compliance Patterns",
  faculty: "7th CPC Pay Scale Deficiencies & Cadre Ratio Violations",
  scholarship: "Delayed GATE / Pragati Fellowship Disbursement Bottlenecks",
  exams: "Admit Card Denial & Examination Evaluation Anomalies",
  infrastructure: "Fire NOC & Laboratory Minimum Standards Deficits",
  ragging: "Cross-Campus Student Safety & Anti-Ragging Retaliation Incidents",
};

/**
 * Clusters grievances into systemic groupings based on:
 * 1. Same institution (high priority co-occurrence)
 * 2. Category matching
 * 3. Semantic vector similarity (cosine threshold >= 0.65)
 */
export async function generateComplaintClusters(
  complaints: Complaint[],
  getInstitution: (id: string) => Institution | undefined
): Promise<ComplaintCluster[]> {
  if (!complaints || complaints.length === 0) return [];

  // Pre-calculate embeddings if missing
  const embeddingsMap = new Map<string, number[]>();
  for (const c of complaints) {
    if (c.description) {
      if (c.embedding && c.embedding.length === 384) {
        embeddingsMap.set(c.id, c.embedding);
      } else {
        const vec = await defaultEmbeddingService.embed(c.description);
        embeddingsMap.set(c.id, vec);
      }
    }
  }

  // Distance matrix computation
  // Cluster adjacency graph
  const n = complaints.length;
  const visited = new Set<string>();
  const rawClusters: Complaint[][] = [];

  for (let i = 0; i < n; i++) {
    const root = complaints[i];
    if (visited.has(root.id)) continue;

    const currentCluster: Complaint[] = [root];
    visited.add(root.id);

    const rootVec = embeddingsMap.get(root.id);

    for (let j = i + 1; j < n; j++) {
      const candidate = complaints[j];
      if (visited.has(candidate.id)) continue;

      let isLinked = false;

      // Rule A: Same institution and related category
      if (root.institution_id === candidate.institution_id) {
        if (root.category === candidate.category || root.is_overlap_flagged) {
          isLinked = true;
        }
      }

      // Rule B: Overlap link exists between pair
      if (root.overlap_links.some((l) => l.complaint_id === candidate.id)) {
        isLinked = true;
      }

      // Rule C: High semantic similarity (cosine >= 0.68) within same or related category
      if (!isLinked && rootVec && candidate.description) {
        const candVec = embeddingsMap.get(candidate.id);
        if (candVec) {
          const sim = cosineSimilarity(rootVec, candVec);
          if (sim >= 0.68 && (root.category === candidate.category || root.institution_id === candidate.institution_id)) {
            isLinked = true;
          }
        }
      }

      if (isLinked) {
        currentCluster.push(candidate);
        visited.add(candidate.id);
      }
    }

    if (currentCluster.length >= 2) {
      rawClusters.push(currentCluster);
    }
  }

  // Format clusters with metadata, dates, affected institutes, severity
  const formattedClusters: ComplaintCluster[] = rawClusters.map((clusterComplaints, idx) => {
    const category = clusterComplaints[0].category;
    const instIds = Array.from(new Set(clusterComplaints.map((c) => c.institution_id)));
    const institutions = instIds
      .map((id) => {
        const inst = getInstitution(id);
        return inst ? { id: inst.id, name: inst.name, region: inst.region } : { id, name: id, region: "National" };
      });

    const bureausInvolved = Array.from(new Set(clusterComplaints.map((c) => c.bureau)));

    // Sort dates
    const dates = clusterComplaints
      .map((c) => c.date_received)
      .sort((a, b) => a.localeCompare(b));
    const start = dates[0] || "2026-10-01";
    const end = dates[dates.length - 1] || "2026-10-24";

    // Severity calculation
    let severity: ComplaintCluster["severity"] = "Medium";
    if (category === "ragging" || clusterComplaints.length >= 4) {
      severity = "Critical";
    } else if (institutions.length > 1 || bureausInvolved.length > 1) {
      severity = "High";
    }

    const baseTitle = CATEGORY_TITLES[category] || `${category.toUpperCase()} Cross-Bureau Irregularities`;
    const instSummary = institutions.length === 1 ? `at ${institutions[0].name}` : `across ${institutions.length} institutions (${institutions.map(i => i.region).join(", ")})`;

    return {
      id: `cluster-${category}-${idx + 1}`,
      title: `${baseTitle} ${instSummary}`,
      category,
      complaint_ids: clusterComplaints.map((c) => c.id),
      complaints: clusterComplaints,
      institutions,
      complaint_count: clusterComplaints.length,
      bureaus_involved: bureausInvolved,
      date_range: { start, end },
      severity,
      summary: `Detected ${clusterComplaints.length} correlated complaints impacting ${institutions.length} institutions across ${bureausInvolved.join(" and ")} bureaus with high semantic concordance.`,
      suggested_action:
        bureausInvolved.length > 1
          ? "Constitute Joint Inquiry Committee with designated Lead Bureau to avoid fragmented proceedings."
          : `Initiate expedited compliance scrutiny under ${bureausInvolved[0]} standard SOP.`,
    };
  });

  return formattedClusters.sort((a, b) => b.complaint_count - a.complaint_count);
}
