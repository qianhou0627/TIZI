import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('traffic backend routing', () => {
  it('packages the custom backend domain and preserves the workers.dev route', async () => {
    const [endpoint, wranglerConfig] = await Promise.all([
      readFile(resolve('resources/traffic-api-url.txt'), 'utf8'),
      readFile(resolve('cloudflare/youyu-traffic/wrangler.toml'), 'utf8')
    ]);

    expect(endpoint.trim()).toBe('https://qianhou-tizi.52052099.xyz');
    expect(wranglerConfig).toMatch(/^workers_dev\s*=\s*true$/m);
    expect(wranglerConfig).toMatch(/^preview_urls\s*=\s*false$/m);
    expect(wranglerConfig).toMatch(
      /\[\[routes\]\][\s\S]*?^pattern\s*=\s*"qianhou-tizi\.52052099\.xyz"$[\s\S]*?^custom_domain\s*=\s*true$/m
    );
  });
});
