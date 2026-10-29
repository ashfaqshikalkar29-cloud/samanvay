// Verification script for Phase 2 API endpoints
const http = require('http');

async function testEndpoint(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:2001${path}`);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', err => reject(err));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log("=== Testing Phase 2 Endpoints on http://localhost:2001 ===");

  try {
    // 2.1 Semantic Duplicates (POST)
    const duplicates = await testEndpoint('/api/semantic/duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'excessive capitation fee charged without receipt' }),
    });
    console.log("✓ /api/semantic/duplicates (POST):", duplicates.status, `(${duplicates.data?.matches?.length || 0} matches found)`);

    // 2.2 Systemic Clusters (GET)
    const clusters = await testEndpoint('/api/clusters');
    console.log("✓ /api/clusters (GET):", clusters.status, `(${clusters.data?.total_clusters || 0} systemic clusters)`);

    // 2.4 Routing Classifier (POST)
    const routing = await testEndpoint('/api/routing/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'faculty salary 6th pay commission irregularity' }),
    });
    console.log("✓ /api/routing/classify (POST):", routing.status, `(Predicted: ${routing.data?.predicted_bureau}, Conf: ${routing.data?.confidence})`);

    // 2.5 Cross-Bureau Timeline (GET)
    const timeline = await testEndpoint('/api/timeline?complaint_id=C-1001');
    console.log("✓ /api/timeline (GET):", timeline.status, `(${timeline.data?.events?.length || 0} events)`);

    // 2.6 Inter-Bureau Tasks (GET)
    const tasks = await testEndpoint('/api/tasks');
    console.log("✓ /api/tasks (GET):", tasks.status, tasks.data || tasks.raw);

    // 2.7 Contradiction Conflict Alerts (GET)
    const conflicts = await testEndpoint('/api/conflicts');
    console.log("✓ /api/conflicts (GET):", conflicts.status, conflicts.data || conflicts.raw);

    // 2.8 Repeat-Offender Watchlist (GET)
    const watchlist = await testEndpoint('/api/watchlist?min_complaints=2&window_months=6');
    console.log("✓ /api/watchlist (GET):", watchlist.status, `(${watchlist.data?.total_flagged || 0} repeat offenders flagged)`);

    console.log("\nPhase 2 API endpoints test finished.");
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
