import type { Complaint, OverlapLink } from "./mock";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "has", "have", "are", "was", "were",
  "been", "being", "into", "after", "before", "per", "its", "their", "his", "her", "any",
  "all", "not", "but", "such", "also", "institute", "institution",
]);

/** Lowercase, strip punctuation, drop stopwords, crude plural stemming. */
export function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
  );
}

/** Jaccard similarity of two descriptions (0..1). */
export function jaccard(a: string | null | undefined, b: string | null | undefined): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / (A.size + B.size - inter);
}

/** Tokens shared between two texts — for highlighting. */
export function sharedTokens(a: string | null | undefined, b: string | null | undefined): Set<string> {
  const A = tokenize(a);
  const B = tokenize(b);
  const out = new Set<string>();
  A.forEach((t) => B.has(t) && out.add(t));
  return out;
}

export const OVERLAP_CONFIG = {
  /** word-match similarity at/above which two complaints count as the same issue */
  threshold: 0.35,
  /** flag only when the two cases sit in DIFFERENT bureaus (the actual silo problem). */
  crossBureauOnly: true,
};

const isActive = (c: Complaint) => c.status !== "Disposed";

/**
 * Pure function: returns a NEW array with is_overlap_flagged + overlap_links recomputed.
 * @param complaints  Full complaint list.
 * @param dismissedPairs  Set of sorted "|"-joined id pairs to skip (officer dismissed them).
 * @param threshold   Override for OVERLAP_CONFIG.threshold (for live slider).
 */
export function detectOverlaps(
  complaints: Complaint[],
  dismissedPairs: Set<string> = new Set(),
  threshold = OVERLAP_CONFIG.threshold
): Complaint[] {
  const out: Complaint[] = complaints.map((c) => ({ ...c, is_overlap_flagged: false, overlap_links: [] }));

  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i];
      const b = out[j];
      if (!isActive(a) || !isActive(b)) continue;
      if (OVERLAP_CONFIG.crossBureauOnly && a.bureau === b.bureau) continue;

      // Skip dismissed pairs
      const pairKey = [a.id, b.id].sort().join("|");
      if (dismissedPairs.has(pairKey)) continue;

      const sameInst = a.institution_id === b.institution_id;
      const score = jaccard(a.description, b.description);
      const similar = score >= threshold;
      if (!sameInst && !similar) continue;

      const parts: string[] = [];
      if (sameInst) parts.push("Same institution");
      if (similar) parts.push(`${Math.round(score * 100)}% text similarity`);
      const reason = parts.join(" + ");

      const link = (other: Complaint): OverlapLink => ({
        complaint_id: other.id, reason, score, same_institution: sameInst,
      });
      a.is_overlap_flagged = true;
      b.is_overlap_flagged = true;
      a.overlap_links.push(link(b));
      b.overlap_links.push(link(a));
    }
  }
  return out;
}
