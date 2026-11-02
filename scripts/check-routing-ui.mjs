import { build } from 'vite';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
await build({
  configFile: false,
  build: {
    ssr: 'tests/electron/routingLayout.ts',
    outDir: 'output/routing-ui-runner',
    target: 'node24',
    rollupOptions: { external: ['electron'], output: { entryFileNames: 'check.mjs' } }
  }
});
process.exitCode = await new Promise((resolveExit, reject) => {
  const child = spawn(
    require('electron'),
    [resolve('output/routing-ui-runner/check.mjs'), `--user-data-dir=${resolve('output/routing-ui-profile')}`],
    { stdio: 'inherit', windowsHide: true, timeout: 30000 }
  );
  child.once('error', reject);
  child.once('exit', (code) => resolveExit(code ?? 1));
});
