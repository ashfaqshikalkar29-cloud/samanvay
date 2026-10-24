const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');

async function commitPendingChanges() {
  const matrix = await git.statusMatrix({ fs, dir });
  let changes = 0;
  for (const [filepath, head, workdir, stage] of matrix) {
    if (head !== workdir || head !== stage) {
      await git.add({ fs, dir, filepath });
      changes++;
    }
  }
  if (changes > 0) {
    const sha = await git.commit({
      fs,
      dir,
      author: {
        name: 'Samanvay AICTE Team',
        email: 'team@samanvay.demo',
      },
      message: 'Update: prepare Samanvay for GitHub and Vercel deployment',
    });
    console.log(`📦 Committed ${changes} updated files (SHA: ${sha.slice(0, 7)})`);
  } else {
    console.log('✅ Working tree clean, nothing new to commit.');
  }
}

async function main() {
  const repoUrl = process.argv[2] || process.env.GITHUB_REPO_URL;
  const token = process.argv[3] || process.env.GITHUB_TOKEN;

  console.log('============================================');
  console.log('  SAMANVAY — GitHub Sync & Publisher');
  console.log('============================================');

  await commitPendingChanges();

  if (!repoUrl) {
    console.log('\nℹ️  To push this repository to GitHub, run:');
    console.log('   npm run github:push <YOUR_GITHUB_REPO_URL> <GITHUB_PAT_TOKEN>');
    console.log('   Example:');
    console.log('   npm run github:push https://github.com/your-username/samanvay.git ghp_xxxxxx\n');
    return;
  }

  console.log(`\n🔗 Configuring remote origin: ${repoUrl}`);
  try {
    await git.deleteRemote({ fs, dir, remote: 'origin' });
  } catch (e) {
    // Ignore if didn't exist
  }
  await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl });

  console.log('🚀 Pushing main branch to GitHub...');
  try {
    const res = await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      force: true,
      onAuth: () => {
        if (!token) {
          console.warn('⚠️ No token provided; attempting unauthenticated or system credential push...');
          return {};
        }
        return { username: token };
      },
    });

    if (res.ok) {
      console.log('\n🎉 Successfully published to GitHub!');
      console.log(`Repository is live at: ${repoUrl.replace(/\.git$/, '')}`);
    } else {
      console.error('❌ Push error:', res);
    }
  } catch (err) {
    console.error('❌ Failed to push to GitHub:', err.message || err);
    if (err.data && err.data.response) {
      console.error('Server response:', err.data.response);
    }
    console.log('\n💡 Tip: Make sure your GitHub Personal Access Token (PAT) has "repo" scope enabled.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
