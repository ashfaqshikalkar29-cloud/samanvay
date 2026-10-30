// Standalone runner script to generate and verify 5,000+ fictional seed complaints
import { generate5kFictionalComplaints } from "../lib/seed-5k";
import { AICTE_INSTITUTIONS_SEED } from "../lib/institutes-seed";

console.log("=== Samanvay 5,000+ Seed Complaints Generator ===");
console.log(`Institutions available in AICTE database: ${AICTE_INSTITUTIONS_SEED.length}`);

const startTime = Date.now();
const complaints = generate5kFictionalComplaints();
const elapsed = Date.now() - startTime;

console.log(`\n✅ Generated ${complaints.length} fictional complaints in ${elapsed}ms.`);

// Compute breakdown statistics
const categoryCounts: Record<string, number> = {};
const bureauCounts: Record<string, number> = {};
const statusCounts: Record<string, number> = {};
let overlapCount = 0;

for (const c of complaints) {
  categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  bureauCounts[c.bureau] = (bureauCounts[c.bureau] || 0) + 1;
  statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  if (c.is_overlap_flagged) overlapCount++;
}

console.log("\n--- Breakdown by Bureau ---");
console.table(bureauCounts);

console.log("\n--- Breakdown by Status ---");
console.table(statusCounts);

console.log("\n--- Breakdown by Category ---");
console.table(categoryCounts);

console.log(`\nPlanted Overlap Complaints Flagged: ${overlapCount}`);
console.log(`First Docket: ${complaints[0].id} (${complaints[0].tracking_id})`);
console.log(`Last Docket: ${complaints[complaints.length - 1].id} (${complaints[complaints.length - 1].tracking_id})`);
