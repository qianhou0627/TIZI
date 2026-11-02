import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.some((a) => !['--team', '--refresh-rules'].includes(a)))
  throw Error('Usage: npm run deliver:win -- [--team] [--refresh-rules]');
if (args.includes('--team') && !existsSync('resources/default-subscription.in.txt'))
  throw Error('团队双包需要本机 resources/default-subscription.in.txt；标准包请去掉 --team');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw Error('Run through npm run deliver:win');
async function run(script) {
  console.log(`\n[deliver] ${script}`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'run', script], {
      stdio: 'inherit',
      windowsHide: true,
      env: process.env
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0 && !signal ? resolve() : reject(Error(`${script} failed (${signal ?? code})`))
    );
  });
}
if (args.includes('--refresh-rules')) {
  await run('release:network:preflight');
  await run('rules:sync');
}
await run('rules:check');
await run('test:critical');
await run('test:window');
await run('site:build');
await run('test:routing-ui');
if (existsSync(join(process.cwd(), '.git'))) await run('validate:repo');
else {
  await run('site:check');
  console.log('[deliver] Source archive has no Git metadata; tracked-file checks unavailable.');
}
// Each packaging command already performs TypeScript, payload, channel and hash validation.
await run(args.includes('--team') ? 'dist:win:team' : 'dist:win');
if (!args.includes('--team')) await run('smoke');
console.log(
  args.includes('--team')
    ? '\nReady: team-builds/ (private dual installers)'
    : '\nReady: release/ (standard installer, no bundled subscription)'
);
