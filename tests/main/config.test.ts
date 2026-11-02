import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { buildMihomoConfig } from '../../src/main/mihomo/config';

const input = { subscriptionUrl: 'https://example.com/sub', secret: 'controller-secret' };
const node = (name: string) => ({
  name,
  type: 'ss',
  server: 'example.com',
  port: 443,
  cipher: 'aes-128-gcm',
  password: 'test'
});
describe('unified Mihomo configuration', () => {
  it('uses the same routing for inline, full and provider subscriptions', () => {
    const bodies = [
      { proxies: [node('日本 01')] },
      {
        proxies: [node('日本 01')],
        'proxy-groups': [{ name: 'OLD', type: 'select', proxies: ['DIRECT'] }],
        rules: ['MATCH,DIRECT']
      },
      { 'proxy-providers': { backup: { type: 'http', url: 'https://example.com/nodes' } } }
    ];
    const configs = bodies.map((body) =>
      parse(buildMihomoConfig({ ...input, subscriptionConfigText: stringify(body) }))
    );
    expect(configs[0].rules).toEqual(configs[1].rules);
    expect(configs[1].rules).toEqual(configs[2].rules);
    for (const config of configs) {
      expect(config.rules.at(-1)).toBe('MATCH,节点选择');
      expect(config['rule-providers'].MetaChina.format).toBe('mrs');
      expect(config['rule-providers'].OpenAI.behavior).toBe('classical');
    }
  });
  it('keeps runtime ownership and discards untrusted capabilities and DNS', () => {
    const config = parse(
      buildMihomoConfig({
        ...input,
        mixedPort: 17890,
        controllerPort: 19090,
        subscriptionConfigText: stringify({
          proxies: [node('日本 01')],
          rules: ['MATCH,DIRECT'],
          'mixed-port': 1,
          secret: 'remote',
          'external-controller': '0.0.0.0:1',
          'external-ui-url': 'https://evil.invalid',
          listeners: [{ type: 'http' }],
          tun: { enable: true },
          dns: { nameserver: ['bad'] },
          'sub-rules': { bad: ['MATCH,DIRECT'] }
        })
      })
    );
    expect(config['mixed-port']).toBe(17890);
    expect(config.secret).toBe(input.secret);
    expect(config['external-controller']).toBe('127.0.0.1:19090');
    for (const key of ['external-ui-url', 'listeners', 'tun', 'dns', 'sub-rules']) expect(config[key]).toBeUndefined();
  });
  it('preserves local DNS and TUN controls, including rule-aware OpenAI resolution', () => {
    const config = parse(
      buildMihomoConfig({ ...input, dnsEnhanced: true, tunEnabled: true, strictRouteEnabled: true, dnsPort: 11053 })
    );
    expect(config.dns.listen).toBe('127.0.0.1:11053');
    expect(config.dns['respect-rules']).toBe(true);
    expect(config.dns['nameserver-policy']['+.chatgpt.com']).toHaveLength(2);
    expect(config.tun).toMatchObject({ enable: true, 'strict-route': true, stack: 'mixed' });
    expect(config.sniffer.enable).toBe(true);
  });
  it('filters notices and reserved names without dropping real carrier-optimized nodes', () => {
    const config = parse(
      buildMihomoConfig({
        ...input,
        subscriptionConfigText: stringify({
          proxies: ['日本 01', '香港 联通优化', '剩余流量 1GB', '官网公告', '节点选择', ' 日本 02 '].map(node)
        })
      })
    );
    expect(config.proxies.map((p: { name: string }) => p.name)).toEqual(['日本 01', '香港 联通优化']);
  });
  it('bounds providers, normalizes known probes and removes deleted group dependencies', () => {
    const config = parse(
      buildMihomoConfig({
        ...input,
        subscriptionConfigText: stringify({
          'proxy-providers': {
            backup: {
              type: 'http',
              url: 'https://example.com/nodes',
              path: 'C:/unsafe.yaml',
              proxy: 'REMOVED',
              interval: 1,
              'size-limit': 2 ** 40,
              'health-check': { enable: true, url: 'http://www.gstatic.com/generate_204', timeout: 0, interval: 1 }
            }
          }
        })
      })
    );
    const provider = config['proxy-providers'].backup;
    expect(provider.url).toBe('https://example.com/nodes');
    expect(provider.path).toBe('./providers/airport-0.yaml');
    expect(provider.proxy).toBeUndefined();
    expect(provider.interval).toBeGreaterThanOrEqual(3600);
    expect(provider['size-limit']).toBeLessThanOrEqual(32 * 1024 * 1024);
    expect(provider['health-check'].url).toBe('https://www.gstatic.com/generate_204');
    expect(config['proxy-groups'].find((g: { name: string }) => g.name === '节点选择').use).toEqual(['backup']);
  });
  it('falls back to fetching nodes when an inline subscription has no usable nodes', () => {
    const config = parse(
      buildMihomoConfig({
        ...input,
        subscriptionConfigText: stringify({ proxies: [node(' 日本 01 '), node('官网公告')] })
      })
    );
    expect(config['proxy-providers'].airport.url).toBe(input.subscriptionUrl);
  });
});
