import { defaultCustomRules, normalizeRuleProfile, type CustomRule } from '../../shared/routing';
import type { RuleProfile } from '../../shared/ipc';
import { detectNodeRegion } from './nodeSelectionPolicy';

export const routingPrefix = '有鱼 · ';
const selector = '节点选择';
const health = {
  url: 'https://cp.cloudflare.com/generate_204',
  'expected-status': 204,
  interval: 300,
  timeout: 5000,
  lazy: false
};
const regions = [
  ['hk', '香港', '(?i)香港|hong[ -]?kong|\\b(hk|hkg)\\b|🇭🇰'],
  ['tw', '台湾', '(?i)台湾|台灣|台北|taiwan|taipei|\\b(tw|twn)\\b|🇹🇼'],
  ['jp', '日本', '(?i)日本|东京|東京|大阪|japan|tokyo|osaka|\\b(jp|jpn)\\b|🇯🇵'],
  ['kr', '韩国', '(?i)韩国|韓國|首尔|首爾|korea|seoul|\\b(kr|kor)\\b|🇰🇷'],
  ['us', '美国', '(?i)美国|美國|洛杉矶|西雅图|america|united[ -]?states|\\b(us|usa)\\b|🇺🇸'],
  ['sg', '新加坡', '(?i)新加坡|狮城|singapore|\\b(sg|sgp)\\b|🇸🇬']
] as const;

const bm = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash';
export const routingSources = [
  ...['OpenAI', 'Claude', 'Gemini', 'Telegram', 'Discord', 'GitHub', 'Google', 'YouTube', 'Netflix', 'Steam'].map(
    (name) => ({ name, url: `${bm}/${name}/${name}.yaml`, behavior: 'classical', format: 'yaml', file: `${name}.yaml` })
  ),
  ...[
    ['MetaPrivate', 'geosite/private', 'domain'],
    ['MetaChina', 'geosite/cn', 'domain'],
    ['MetaGlobal', 'geosite/geolocation-!cn', 'domain'],
    ['MetaChinaIP', 'geoip/cn', 'ipcidr']
  ].map(([name, path, behavior]) => ({
    name,
    url: `https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/${path}.mrs`,
    behavior,
    format: 'mrs',
    file: `${name}.mrs`
  }))
];

export function buildRouting(names: string[], providers: string[], profile?: RuleProfile, customRules?: CustomRule[]) {
  const mode = normalizeRuleProfile(profile);
  const smart = mode !== 'custom';
  const regionName = (label: string) => `${routingPrefix}${label}`;
  const appName = (app: string) => `${routingPrefix}${app}`;
  const regionGroups = regions.map(([code, label, filter]) => {
    const matches = names.filter((name) => detectNodeRegion(name) === code);
    return {
      name: regionName(label),
      type: 'url-test',
      proxies: matches.length ? matches : providers.length ? [] : ['REJECT'],
      ...(providers.length ? { use: providers, filter } : {}),
      'empty-fallback': 'REJECT',
      tolerance: 80,
      ...health
    };
  });
  const groups: unknown[] = [...regionGroups];
  if (smart) {
    for (const [app, order] of [
      ['ChatGPT', ['韩国', '台湾', '日本', '美国']],
      ['Gemini', ['香港', '新加坡', '日本', '美国']]
    ] as const) {
      // Omit empty static regions so a REJECT placeholder cannot beat a real region.
      const available = order.filter(
        (label) =>
          providers.length || names.some((name) => detectNodeRegion(name) === regions.find((r) => r[1] === label)?.[0])
      );
      groups.push({
        name: appName(app),
        type: 'fallback',
        proxies: available.length ? available.map(regionName) : ['REJECT'],
        ...health
      });
    }
  }
  const rules: string[] = [
    'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,172.16.0.0/12,DIRECT,no-resolve',
    'IP-CIDR,192.168.0.0/16,DIRECT,no-resolve',
    'IP-CIDR,169.254.0.0/16,DIRECT,no-resolve',
    'IP-CIDR6,::1/128,DIRECT,no-resolve',
    'IP-CIDR6,fc00::/7,DIRECT,no-resolve',
    'IP-CIDR6,fe80::/10,DIRECT,no-resolve',
    'RULE-SET,MetaPrivate,DIRECT'
  ];
  if (mode !== 'ruleset')
    for (const rule of customRules ?? defaultCustomRules) {
      const automatic =
        smart && rule.id === 'chatgpt'
          ? appName('ChatGPT')
          : smart && rule.id === 'gemini'
            ? appName('Gemini')
            : selector;
      const target =
        rule.target === '智能规则'
          ? automatic
          : rule.target === '直连'
            ? 'DIRECT'
            : rule.target === '拦截'
              ? 'REJECT'
              : regionName(rule.target);
      rules.push(`DOMAIN-REGEX,${rule.pattern},${target}`);
    }
  rules.push(
    `RULE-SET,OpenAI,${smart ? appName('ChatGPT') : selector}`,
    `RULE-SET,Gemini,${smart ? appName('Gemini') : selector}`
  );
  for (const name of ['Claude', 'Telegram', 'Discord', 'GitHub', 'YouTube', 'Netflix', 'Steam', 'Google'])
    rules.push(`RULE-SET,${name},${selector}`);
  rules.push(
    'RULE-SET,MetaChina,DIRECT',
    `RULE-SET,MetaGlobal,${selector}`,
    'RULE-SET,MetaChinaIP,DIRECT',
    `MATCH,${selector}`
  );
  return {
    groups,
    rules,
    providers: Object.fromEntries(
      routingSources.map((source) => [
        source.name,
        {
          type: 'http',
          behavior: source.behavior,
          format: source.format,
          url: source.url,
          path: `./rulesets/${source.file}`,
          interval: 86400,
          'size-limit': 32 * 1024 * 1024,
          proxy: selector
        }
      ])
    )
  };
}
