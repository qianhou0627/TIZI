import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parse } from 'yaml';
import { routingSources } from '../src/main/mihomo/routing';

const root = join(process.cwd(), 'resources/rulesets');
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const execute = promisify(execFile);
const licenses = [
  {
    file: 'LICENSE-blackmatrix7-GPL-2.0.txt',
    url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/LICENSE',
    format: 'license'
  },
  {
    file: 'LICENSE-MetaCubeX-GPL-3.0.txt',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/master/LICENSE',
    format: 'license'
  }
];
const sourceLists = routingSources
  .filter((s) => s.format === 'mrs')
  .map((s) => ({
    file: s.file.replace('.mrs', '.source.list'),
    url: s.url.replace('.mrs', '.list'),
    format: 'source'
  }));
await mkdir(root, { recursive: true });
if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')) as {
    files: Array<{ file: string; sha256: string; bytes: number }>;
  };
  for (const source of [...routingSources, ...licenses, ...sourceLists]) {
    const entry = manifest.files.find((e) => e.file === source.file),
      body = await readFile(join(root, source.file));
    if (!entry || entry.sha256 !== hash(body) || entry.bytes !== body.length)
      throw Error(`规则资源校验失败：${source.file}`);
  }
  console.log('Rule resource manifest verified');
} else {
  const queue = [...routingSources, ...licenses, ...sourceLists],
    files: Array<{ file: string; url: string; sha256: string; bytes: number }> = [];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const source = queue.shift()!,
          candidate = join(root, source.file + '.candidate');
        try {
          await execute(
            'curl.exe',
            [
              '--fail',
              '--silent',
              '--show-error',
              '--location',
              '--ssl-no-revoke',
              '--max-time',
              '45',
              '--retry',
              '2',
              '--max-filesize',
              '33554432',
              '--output',
              candidate,
              source.url
            ],
            { windowsHide: true, timeout: 145000, maxBuffer: 4096 }
          );
          const body = await readFile(candidate);
          if (body.length < 32) throw Error('empty resource');
          if (source.format === 'yaml' && !Array.isArray(parse(body.toString('utf8'))?.payload))
            throw Error('invalid payload');
          if (source.format === 'mrs' && body.subarray(0, 4).toString('hex') !== '28b52ffd')
            throw Error('invalid compressed MRS');
          if (source.format === 'license' && !body.toString().includes('GNU GENERAL PUBLIC LICENSE'))
            throw Error('invalid license');
          await rename(candidate, join(root, source.file));
          files.push({ file: source.file, url: source.url, sha256: hash(body), bytes: body.length });
          console.log(`Rules: ${source.file} (${body.length} bytes)`);
        } catch {
          throw Error(`下载或校验规则失败：${source.file}`);
        } finally {
          await rm(candidate, { force: true });
        }
      }
    })
  );
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), files: files.sort((a, b) => a.file.localeCompare(b.file)) },
      null,
      2
    ) + '\n'
  );
}
