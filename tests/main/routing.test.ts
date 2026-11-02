import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { buildMihomoConfig } from '../../src/main/mihomo/config';
import { buildRouting } from '../../src/main/mihomo/routing';
import { seedRuleResources } from '../../src/main/mihomo/ruleResources';
import { customRuleError, defaultCustomRules } from '../../src/shared/routing';
import { SettingsStore } from '../../src/main/storage/settings';
import { RoutingLogStore } from '../../src/main/routingLog';
import { parseIpcArguments } from '../../src/main/ipcSchemas';
import { ipcChannels } from '../../src/shared/ipc';

const names = ['韩国 01', '台湾 01', '日本 01', '美国 01', '香港 01', '新加坡 01'];
const subscription = YAML.stringify({
  proxies: names.map((name) => ({
    name,
    type: 'ss',
    server: '127.0.0.1',
    port: 9,
    cipher: 'aes-128-gcm',
    password: 'test'
  })),
  'proxy-groups': [{ name: '恶意旧策略', type: 'select', proxies: ['DIRECT'] }],
  'rule-providers': { old: { type: 'http', url: 'https://example.invalid/old', path: './old' } },
  rules: ['DOMAIN-SUFFIX,chatgpt.com,DIRECT', 'MATCH,DIRECT'],
  dns: { nameserver: ['bad'] },
  'sub-rules': { old: ['MATCH,DIRECT'] }
});
describe('unified routing', () => {
  it('drops all imported routing and gives custom rules priority over smart applications', () => {
    const config = YAML.parse(
      buildMihomoConfig({
        subscriptionUrl: 'https://example.invalid',
        secret: 'test-secret',
        subscriptionConfigText: subscription,
        ruleProfile: 'smart-custom',
        customRules: [{ id: 'own', pattern: 'chatgpt', target: '日本' }]
      })
    );
    expect(config.rules).not.toContain('DOMAIN-SUFFIX,chatgpt.com,DIRECT');
    expect(config['sub-rules']).toBeUndefined();
    expect(config['rule-providers'].old).toBeUndefined();
    expect(config.dns).toBeUndefined();
    expect(config['proxy-groups'].some((g: { name: string }) => g.name === '恶意旧策略')).toBe(false);
    expect(config.rules.indexOf('DOMAIN-REGEX,chatgpt,有鱼 · 日本')).toBeLessThan(
      config.rules.indexOf('RULE-SET,OpenAI,有鱼 · ChatGPT')
    );
    expect(config.rules.at(-1)).toBe('MATCH,节点选择');
    const chat = config['proxy-groups'].find((g: { name: string }) => g.name === '有鱼 · ChatGPT');
    expect(chat.proxies).toEqual(['有鱼 · 韩国', '有鱼 · 台湾', '有鱼 · 日本', '有鱼 · 美国']);
    expect(config['proxy-groups'].find((g: { name: string }) => g.name === '有鱼 · Gemini').proxies).toEqual([
      '有鱼 · 香港',
      '有鱼 · 新加坡',
      '有鱼 · 日本',
      '有鱼 · 美国'
    ]);
  });
  it('keeps the baseline in custom mode and never substitutes DIRECT for a missing region', () => {
    const routing = buildRouting(['日本 01'], [], 'custom', []);
    expect(routing.rules).toContain('RULE-SET,OpenAI,节点选择');
    expect(routing.rules.at(-1)).toBe('MATCH,节点选择');
    expect(routing.groups.find((g) => (g as { name: string }).name === '有鱼 · 韩国')).toMatchObject({
      proxies: ['REJECT']
    });
    expect(buildRouting([], ['airport'], 'ruleset').groups[0]).toMatchObject({
      'empty-fallback': 'REJECT',
      use: ['airport']
    });
  });
  it('rejects injected, incompatible and oversized custom rules at the IPC boundary', () => {
    for (const pattern of ['a,MATCH,DIRECT', '(?=a)', '(a)\\1', '['])
      expect(customRuleError([{ id: 'x', pattern, target: '日本' }])).toBeTruthy();
    expect(() =>
      parseIpcArguments(ipcChannels.saveSettings, [
        { customRules: [{ id: 'x', pattern: 'a,b', target: '日本' }] },
        'advanced-save'
      ])
    ).toThrow();
    expect(customRuleError(defaultCustomRules)).toBeUndefined();
  });
  it('migrates old airport mode and persists an intentionally empty custom list', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'youyu-rules-store-'));
    try {
      await writeFile(join(dir, 'settings.json'), JSON.stringify({ settingsVersion: 6, ruleProfile: 'subscription' }));
      const store = new SettingsStore(dir);
      expect((await store.read()).ruleProfile).toBe('ruleset');
      expect((await store.read()).customRules).toHaveLength(2);
      await store.update({ ruleProfile: 'custom', customRules: [] });
      expect((await new SettingsStore(dir).read()).customRules).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('records actual routing, local blocks and bounds memory', () => {
    const logs = new RoutingLogStore();
    expect(
      logs.append(
        '[mihomo] level=info msg="[TCP] 127.0.0.1:1234 --> chatgpt.com:443 match RuleSet(OpenAI) using 有鱼 · ChatGPT[韩国 01]"'
      )
    ).toBe(true);
    expect(logs.read()[0]).toMatchObject({ host: 'chatgpt.com', route: '有鱼 · ChatGPT[韩国 01]', state: 'routed' });
    logs.append('[TCP] 127.0.0.1:1234 --> example.com:443 match DomainRegex(example) using REJECT');
    expect(logs.read()[0]).toMatchObject({ state: 'blocked', route: '本机拦截，无出口节点' });
    for (let i = 0; i < 600; i++) logs.append(`[TCP] 127.0.0.1:1234 --> domain${i}.com:443 match Match using DIRECT`);
    expect(logs.read()).toHaveLength(500);
    logs.clear();
    expect(logs.read()).toEqual([]);
  });
  it.skipIf(process.platform !== 'win32')(
    'validates every mode with the real bundled Mihomo and offline seeds',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'youyu-rules-core-'));
      try {
        await seedRuleResources(resolve('resources/rulesets'), dir);
        for (const ruleProfile of ['ruleset', 'smart-custom', 'custom'] as const) {
          const config = buildMihomoConfig({
            subscriptionUrl: 'https://example.invalid',
            secret: 'test-secret',
            subscriptionConfigText: subscription,
            ruleProfile,
            customRules: defaultCustomRules
          });
          await writeFile(join(dir, 'config.yaml'), config);
          const result = spawnSync(
            resolve('resources/mihomo/win-x64/mihomo.exe'),
            ['-t', '-d', dir, '-f', join(dir, 'config.yaml')],
            { encoding: 'utf8', timeout: 15000, windowsHide: true }
          );
          expect(result.status, result.stdout + result.stderr).toBe(0);
        }
        expect((await readFile(join(dir, 'rulesets', 'OpenAI.yaml'))).length).toBeGreaterThan(0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    50000
  );
});
