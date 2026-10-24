const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

async function main() {
  const dir = path.resolve(__dirname, '..');
  console.log('Initializing git repository in', dir);
  await git.init({ fs, dir, defaultBranch: 'main' });

  console.log('Computing status matrix respecting .gitignore...');
  const matrix = await git.statusMatrix({ fs, dir });
  console.log(`Found ${matrix.length} files to check.`);

  let added = 0;
  for (const [filepath, head, workdir, stage] of matrix) {
    // workdir === 1 or 2 means file exists in worktree
    if (workdir !== 0) {
      await git.add({ fs, dir, filepath });
      added++;
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
    message: 'Initial commit: Samanvay - AICTE Integrated Grievance Dashboard (SIH MVP)',
  });

  console.log('✅ Committed successfully! Head SHA:', sha);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
