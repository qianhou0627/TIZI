import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { routingSources } from './routing';

export async function seedRuleResources(source: string, workDir: string): Promise<void> {
  await mkdir(join(workDir, 'rulesets'), { recursive: true });
  for (const { file } of routingSources) {
    try {
      await copyFile(join(source, file), join(workDir, 'rulesets', file), 1);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
}

let refreshed = false;
export async function refreshRuleResources(port: number, secret: string, signal: AbortSignal): Promise<void> {
  if (refreshed) return;
  const remaining = [...routingSources];
  const results = await Promise.all(
    Array.from({ length: 3 }, async () => {
      let failures = 0;
      while (remaining.length && !signal.aborted) {
        const source = remaining.shift()!;
        try {
          const response = await fetch(`http://127.0.0.1:${port}/providers/rules/${encodeURIComponent(source.name)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${secret}` },
            signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)])
          });
          await response.body?.cancel();
          if (!response.ok) failures++;
        } catch {
          failures++;
        }
      }
      return failures;
    })
  );
  if (signal.aborted) return;
  if (results.some(Boolean)) throw new Error('规则更新未全部完成，继续使用已验证的缓存');
  refreshed = true;
}
