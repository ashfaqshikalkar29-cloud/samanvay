const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

async function main() {
  const dir = path.resolve(__dirname, '..');
  console.log('Staging files in', dir);

  const matrix = await git.statusMatrix({ fs, dir });
  let added = 0;
  for (const [filepath, head, workdir, stage] of matrix) {
    if (workdir !== 0) {
      await git.add({ fs, dir, filepath });
      added++;
    } else if (head === 1 && workdir === 0) {
      await git.remove({ fs, dir, filepath });
    }
  }
  console.log(`Staged ${added} files.`);

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Samanvay AICTE Team',
      email: 'team@samanvay.demo',
    },
    message: 'feat(phase2): Cross-Bureau Intelligence & Coordination (Semantic Duplicate Detection, Clustering, Lead-Bureau Merges, Auto-routing, Unified Timeline, Inter-bureau Tasks, Conflict Alerts, Watchlist)',
  });

  console.log('✅ Committed successfully! Head SHA:', sha);
}

main().catch(err => {
  console.error('Commit error:', err);
  process.exit(1);
});
