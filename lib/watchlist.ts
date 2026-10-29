// ==============================================================================
// SAMANVAY: Repeat-Offender Watchlist Engine (2.8)
// Cross-Bureau Anomaly Detection & Institute Risk Profiling
// ==============================================================================

import type { Complaint, Institution } from "@/lib/mock";

export interface MonthlyCount {
  month: string; // e.g., "May", "Jun", "Jul", "Aug", "Sep", "Oct"
  count: number;
}

export interface WatchlistedInstitute {
  institution_id: string;
  name: string;
  aicte_id: string;
  region: string;
  state?: string;
  district?: string;
  total_complaints: number;
  rb_count: number;
  pgrc_count: number;
  pending_count: number;
  disposed_count: number;
  monthly_trend: MonthlyCount[];
  complaint_ids: string[];
  latest_complaint_date: string;
  risk_score: number; // 0..100
  primary_concerns: string[];
}

export interface WatchlistConfig {
  minComplaints: number; // N threshold
  windowMonths: number;  // M lookback months
}

export const DEFAULT_WATCHLIST_CONFIG: WatchlistConfig = {
  minComplaints: 2, // In demo, threshold 2 or 3 ensures institutes like Apex & Modern Inst are highlighted
  windowMonths: 6,
};

/**
 * Aggregates grievances per institution within the lookback window
 * and flags repeat offenders exceeding threshold N
 */
export function computeWatchlist(
  complaints: Complaint[],
  institutions: Institution[],
  config: WatchlistConfig = DEFAULT_WATCHLIST_CONFIG,
  referenceDate = "2026-10-24"
): WatchlistedInstitute[] {
  const ref = new Date(referenceDate);
  const cutoff = new Date(ref);
  cutoff.setMonth(cutoff.getMonth() - config.windowMonths);

  const instComplaintsMap = new Map<string, Complaint[]>();

  for (const c of complaints) {
    const cDate = new Date(c.date_received);
    if (cDate >= cutoff && cDate <= ref) {
      const list = instComplaintsMap.get(c.institution_id) || [];
      list.push(c);
      instComplaintsMap.set(c.institution_id, list);
    }
  }

  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const watchlisted: WatchlistedInstitute[] = [];

  for (const [instId, instCases] of instComplaintsMap.entries()) {
    if (instCases.length >= config.minComplaints) {
      const inst = institutions.find((i) => i.id === instId);
      if (!inst) continue;

      const rbCount = instCases.filter((c) => c.bureau === "RB").length;
      const pgrcCount = instCases.filter((c) => c.bureau === "PGRC").length;
      const pendingCount = instCases.filter((c) => c.status !== "Disposed").length;
      const disposedCount = instCases.filter((c) => c.status === "Disposed").length;

      // Compute monthly trend for sparkline
      const monthBuckets = new Map<number, number>();
      for (let m = 0; m < 6; m++) monthBuckets.set(m, 0);

      for (const c of instCases) {
        const d = new Date(c.date_received);
        const diffMonths = (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
        if (diffMonths >= 0 && diffMonths < 6) {
          const slot = 5 - diffMonths; // 0=May .. 5=Oct
          monthBuckets.set(slot, (monthBuckets.get(slot) || 0) + 1);
        }
      }

      const monthlyTrend: MonthlyCount[] = months.map((month, idx) => ({
        month,
        count: monthBuckets.get(idx) || 0,
      }));

      // Extract unique categories
      const categories = Array.from(new Set(instCases.map((c) => c.category)));

      // Calculate composite risk score
      // Factors: total count (weight 40), pending ratio (weight 30), cross-bureau presence (weight 30)
      const crossBureauFactor = (rbCount > 0 && pgrcCount > 0) ? 30 : 15;
      const volumeFactor = Math.min(40, (instCases.length / 5) * 40);
      const pendingFactor = (pendingCount / instCases.length) * 30;
      const riskScore = Math.min(100, Math.round(volumeFactor + crossBureauFactor + pendingFactor));

      const sortedByDate = [...instCases].sort((a, b) => b.date_received.localeCompare(a.date_received));

      watchlisted.push({
        institution_id: instId,
        name: inst.name,
        aicte_id: inst.aicte_id,
        region: inst.region,
        state: inst.state,
        district: inst.district,
        total_complaints: instCases.length,
        rb_count: rbCount,
        pgrc_count: pgrcCount,
        pending_count: pendingCount,
        disposed_count: disposedCount,
        monthly_trend: monthlyTrend,
        complaint_ids: instCases.map((c) => c.id),
        latest_complaint_date: sortedByDate[0]?.date_received || referenceDate,
        risk_score: riskScore,
        primary_concerns: categories,
      });
    }
  }

  return watchlisted.sort((a, b) => b.risk_score - a.risk_score);
}
