import YAML from 'yaml';
import { buildRouting } from './routing';
import type { CustomRule } from '../../shared/routing';
import type { MihomoMode, RemoteControlConfig, RuleProfile, StrategyKey } from '../../shared/ipc';
const selectorName = '节点选择';
const preferredDefaultNodeKeywords = ['台湾', '08', '家宽'];
const noticeNodeKeywords = [
  '失去支持',
  '更新你的代理客户端',
  '官网公告',
  '代理客户端',
  '剩余',
  '订阅',
  '官网',
  '丛雨云',
  '全部超时',
  'congyu.org'
];
const noticeNodePatterns = [
  /剩余流量[:：]/i,
  /剩余/i,
  /订阅/i,
  /距离下次重置/i,
  /重置剩余/i,
  /套餐到期/i,
  /官网地址/i,
  /官网/i,
  /(?:订阅|官网).*(?:地址|链接)|(?:地址|链接).*(?:订阅|官网)/i,
  /(?:联通|电信|移动).*(?:订阅|地址|官网|链接)|(?:订阅|地址|官网|链接).*(?:联通|电信|移动)/i,
  /失去支持/i,
  /更新.*客户端/i,
  /官网公告/i,
  /congyu\.org/i,
  /\b(?:traffic|remaining|subscription|subscribe|official|address|expire|reset)\b/i
];
const reservedSelectableNodeNames = new Set(['全球直连', '节点选择', '自动选择', '全球拦截']);
const carrierNodeKeywords = ['联通', '电信', '移动', 'unicom', 'telecom', 'mobile'];
const carrierTransitHintPattern = /(?:中转|cf|cloudflare|relay)/i;
const carrierTransitNoticePatterns = [
  /(?:联通|电信|移动|unicom|telecom|mobile).*(?:联通|电信|移动|unicom|telecom|mobile).*(?:中转|cf|cloudflare|relay)/i,
  /(?:中转|cf|cloudflare|relay).*(?:联通|电信|移动|unicom|telecom|mobile).*(?:联通|电信|移动|unicom|telecom|mobile)/i,
  /(?:联通|电信|移动).*(?:用|走|适合).*(?:中转|cf|cloudflare)/i,
  /(?:unicom|telecom|mobile).*(?:use|via|for).*(?:relay|cf|cloudflare)/i
];
const carrierNoticeHints = [
  '订阅',
  '官网',
  '地址',
  '链接',
  '公告',
  '剩余',
  '流量',
  '重置',
  '到期',
  '套餐',
  '失去支持',
  '客户端',
  '更新',
  '通知',
  'traffic',
  'remaining',
  'subscription',
  'subscribe',
  'official',
  'address',
  'expire',
  'reset'
];
const carrierOnlyNodePatterns = [/^(?:中国)?(?:联通|电信|移动)$/i, /^(?:china\s*)?(?:unicom|telecom|mobile)$/i];
const carrierTransitNoticeExcludeFilter =
  '(?:联通|电信|移动|unicom|telecom|mobile).*(?:联通|电信|移动|unicom|telecom|mobile).*(?:中转|cf|cloudflare|relay)|(?:中转|cf|cloudflare|relay).*(?:联通|电信|移动|unicom|telecom|mobile).*(?:联通|电信|移动|unicom|telecom|mobile)|(?:联通|电信|移动).*(?:用|走|适合).*(?:中转|cf|cloudflare)|(?:unicom|telecom|mobile).*(?:use|via|for).*(?:relay|cf|cloudflare)';
const carrierNoticeExcludeFilter =
  '(?:联通|电信|移动|unicom|telecom|mobile).*(?:订阅|官网|地址|链接|公告|剩余|流量|重置|到期|套餐|失去支持|客户端|更新|通知|traffic|remaining|subscription|subscribe|official|address|expire|reset)|(?:订阅|官网|地址|链接|公告|剩余|流量|重置|到期|套餐|失去支持|客户端|更新|通知|traffic|remaining|subscription|subscribe|official|address|expire|reset).*(?:联通|电信|移动|unicom|telecom|mobile)';
const noticeNodeExcludeFilter = `(?i)(剩余流量|剩余|订阅|官网|官网地址|订阅地址|订阅链接|距离下次重置|重置剩余|套餐到期|失去支持|更新.*客户端|丛雨云|全部超时|congyu\\.org|全球直连|节点选择|自动选择|全球拦截|traffic|remaining|subscription|subscribe|official|address|expire|reset|${carrierTransitNoticeExcludeFilter}|${carrierNoticeExcludeFilter})`;
const microsoftStoreDirectDomains = [
  'apps.microsoft.com',
  'mp.microsoft.com',
  'delivery.mp.microsoft.com',
  'storeedgefd.dsx.mp.microsoft.com',
  'displaycatalog.mp.microsoft.com',
  'purchase.mp.microsoft.com',
  'licensing.mp.microsoft.com',
  'dl.delivery.mp.microsoft.com',
  'tlu.dl.delivery.mp.microsoft.com',
  'fe3.delivery.mp.microsoft.com',
  'store-images.s-microsoft.com',
  'store-images.microsoft.com',
  'storecatalogrevocation.storequality.microsoft.com',
  'sls.update.microsoft.com',
  'login.live.com',
  'login.microsoftonline.com',
  'windowsupdate.com',
  'update.microsoft.com',
  'xboxlive.com',
  'xboxservices.com',
  'assets1.xboxlive.com',
  'assets2.xboxlive.com'
];
const microsoftStoreFakeIpFilterDomains = [
  ...new Set(microsoftStoreDirectDomains.flatMap((domain) => [domain, `*.${domain}`]))
];
const steamAccelerationDomains = [
  'steampowered.com',
  'api.steampowered.com',
  'checkout.steampowered.com',
  'help.steampowered.com',
  'login.steampowered.com',
  'steamcommunity.com',
  'steamstatic.com',
  'steamcontent.com',
  'steamserver.net',
  'steam-chat.com',
  'steamgames.com',
  'steamusercontent.com',
  'valvesoftware.com',
  'cdn.cloudflare.steamstatic.com',
  'community.cloudflare.steamstatic.com',
  'store.cloudflare.steamstatic.com',
  'avatars.cloudflare.steamstatic.com',
  'clan.cloudflare.steamstatic.com',
  'shared.cloudflare.steamstatic.com',
  'steamcdn-a.akamaihd.net',
  'steamstore-a.akamaihd.net',
  'steamuserimages-a.akamaihd.net',
  'shared.akamai.steamstatic.com',
  'clan.akamai.steamstatic.com',
  'steamcloud-ugc.storage.googleapis.com',
  'steamcloud-eu-ams.storage.googleapis.com',
  'steamcloud-eu-fra.storage.googleapis.com',
  'steamcloud-eu.storage.googleapis.com',
  'steamcloud-finland.storage.googleapis.com',
  'steamcloud-saopaulo.storage.googleapis.com',
  'steamcloud-singapore.storage.googleapis.com',
  'steamcloud-sydney.storage.googleapis.com',
  'steamcloud-taiwan.storage.googleapis.com'
];
const stableProxyDnsResolvers = ['https://1.1.1.1/dns-query#RULES', 'https://8.8.8.8/dns-query#RULES'];
// Codex keeps a long-lived response WebSocket on the ChatGPT edge.  Resolve
// just that OpenAI edge family through the same rule-aware public resolvers we
// already use for Steam, rather than letting a domestic resolver pin it to a
// transient or unsuitable edge.  The proxy target remains the user's current
// manual/automatic selection.
const codexDnsDomains = ['openai.com', 'chatgpt.com', 'oaistatic.com', 'oaiusercontent.com'];
const gamingFakeIpFilterDomains = [
  '*.steampowered.com',
  '*.steamcommunity.com',
  '*.steamstatic.com',
  '*.steamcontent.com',
  '*.steamserver.net',
  '*.steam-chat.com',
  '*.steamgames.com',
  '*.steamusercontent.com',
  '*.valvesoftware.com',
  'steamcdn-a.akamaihd.net',
  'steamstore-a.akamaihd.net',
  'steamuserimages-a.akamaihd.net',
  '*.cloudflare.steamstatic.com',
  '*.akamai.steamstatic.com',
  'steamcloud-ugc.storage.googleapis.com',
  'steamcloud-eu-ams.storage.googleapis.com',
  'steamcloud-eu-fra.storage.googleapis.com',
  'steamcloud-eu.storage.googleapis.com',
  'steamcloud-finland.storage.googleapis.com',
  'steamcloud-saopaulo.storage.googleapis.com',
  'steamcloud-singapore.storage.googleapis.com',
  'steamcloud-sydney.storage.googleapis.com',
  'steamcloud-taiwan.storage.googleapis.com',
  'stun.*.*'
];
export const remoteDesktopProcessNames = [
  'ToDesk.exe',
  'ToDesk_Service.exe',
  'ToDesk_Lite.exe',
  'SunloginClient.exe',
  'SunloginClient_Desktop.exe',
  'SunloginService.exe',
  'AnyDesk.exe',
  'RustDesk.exe',
  'rustdesk.exe',
  'UU.exe',
  'UURemote.exe',
  'UUDesktop.exe',
  'UURemoteDesktop.exe',
  'UUAccelerator.exe',
  'NeteaseUU.exe'
];
const builtInProxyNames = new Set(['COMPATIBLE', 'DIRECT', 'PASS', 'REJECT', 'REJECT-DROP']);
const healthCheckProxyGroupTypes = new Set(['url-test', 'fallback', 'load-balance']);
const nodeHealthCheckIntervalSeconds = 1800;
const autoSelectToleranceMs = 150;
const secureHealthCheckUrl = 'https://www.gstatic.com/generate_204';
const insecureGoogleHealthCheckUrl = 'http://www.gstatic.com/generate_204';
const secureCloudflareHealthCheckUrl = 'https://cp.cloudflare.com/generate_204';
const insecureCloudflareHealthCheckUrl = 'http://1.1.1.1/generate_204';
const healthCheckExpectedStatus = 204;
const proxyProviderSizeLimitBytes = 8 * 1024 * 1024;
const ruleProviderSizeLimitBytes = 32 * 1024 * 1024;
const providerRefreshIntervalMinSeconds = 60 * 60;
const providerRefreshIntervalMaxSeconds = 7 * 24 * 60 * 60;
const proxyProviderRefreshIntervalSeconds = 12 * 60 * 60;
const ruleProviderRefreshIntervalSeconds = 24 * 60 * 60;
const providerHealthCheckIntervalMinSeconds = 5 * 60;
const providerHealthCheckIntervalMaxSeconds = 24 * 60 * 60;
const providerHealthCheckTimeoutMinMs = 1000;
const providerHealthCheckTimeoutMaxMs = 10_000;
const providerHealthCheckTimeoutMs = 5000;

export type MihomoConfigInput = {
  subscriptionUrl: string;
  secret: string;
  mode?: MihomoMode;
  strategy?: StrategyKey;
  ruleProfile?: RuleProfile;
  customRules?: CustomRule[];
  systemProxyEnabled?: boolean;
  dnsEnhanced?: boolean;
  snifferEnabled?: boolean;
  tunEnabled?: boolean;
  strictRouteEnabled?: boolean;
  allowLan?: boolean;
  subscriptionConfigText?: string;
  remoteConfig?: RemoteControlConfig;
  mixedPort?: number;
  controllerPort?: number;
  dnsPort?: number;
};

export function buildMihomoConfig(input: MihomoConfigInput): string {
  let sources: Record<string, unknown> | undefined;
  try {
    const parsed = YAML.parse(input.subscriptionConfigText ?? '');
    if (
      isRecord(parsed) &&
      ((Array.isArray(parsed.proxies) &&
        parsed.proxies.some(
          (p) => isRecord(p) && typeof p.name === 'string' && isDirectlyRoutableInlineProxyName(p.name)
        )) ||
        (isRecord(parsed['proxy-providers']) && Object.keys(parsed['proxy-providers']).length))
    )
      sources = parsed;
  } catch {
    /* Non-YAML node subscriptions are handled by Mihomo's provider. */
  }
  sources ??= {
    'proxy-providers': {
      airport: {
        type: 'http',
        url: input.subscriptionUrl,
        path: './providers/airport.yaml',
        interval: proxyProviderRefreshIntervalSeconds,
        'size-limit': proxyProviderSizeLimitBytes,
        'exclude-filter': noticeNodeExcludeFilter,
        'health-check': {
          enable: true,
          url: secureHealthCheckUrl,
          'expected-status': healthCheckExpectedStatus,
          interval: nodeHealthCheckIntervalSeconds,
          timeout: providerHealthCheckTimeoutMs,
          lazy: true
        }
      }
    }
  };
  sanitizeSubscriptionNoticeNodes(sources);
  sanitizeHealthCheckUrls(sources);
  return YAML.stringify(applyUnifiedRouting(sources, input));
}

export function isSubscriptionNoticeNodeName(name: string): boolean {
  return (
    isCarrierNoticeNodeName(name) ||
    noticeNodeKeywords.some((keyword) => name.includes(keyword)) ||
    noticeNodePatterns.some((pattern) => pattern.test(name))
  );
}

export function isReservedSelectableNodeName(name: string): boolean {
  return reservedSelectableNodeNames.has(name.trim());
}

export function isBlockedSelectableNodeName(name: string): boolean {
  return isSubscriptionNoticeNodeName(name) || isReservedSelectableNodeName(name);
}

function isCarrierNoticeNodeName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  if (carrierOnlyNodePatterns.some((pattern) => pattern.test(normalized))) return true;
  if (carrierTransitNoticePatterns.some((pattern) => pattern.test(normalized))) return true;

  const hasCarrier = carrierNodeKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (!hasCarrier) return false;
  const carrierKeywordCount = carrierNodeKeywords.filter((keyword) =>
    normalized.includes(keyword.toLowerCase())
  ).length;
  if (carrierKeywordCount >= 2 && carrierTransitHintPattern.test(normalized)) return true;

  return carrierNoticeHints.some((hint) => normalized.includes(hint.toLowerCase()));
}

function orderProxyNames(proxyNames: string[]): string[] {
  const preferred = proxyNames.find((name) => preferredDefaultNodeKeywords.every((keyword) => name.includes(keyword)));
  if (!preferred) {
    return proxyNames;
  }

  return [preferred, ...proxyNames.filter((name) => name !== preferred)];
}

export const strategyTargets: Record<Exclude<StrategyKey, 'manual'>, string> = {
  auto: '自动选择',
  fallback: '故障转移',
  'load-balance': '负载均衡',
  direct: 'DIRECT'
};

export const strategyLabels: Record<StrategyKey, string> = {
  manual: '手动',
  auto: '自动',
  fallback: '故障转移',
  'load-balance': '均衡',
  direct: '直连'
};

function buildProviderProxyGroups() {
  return [
    {
      name: selectorName,
      type: 'select',
      use: ['airport'],
      proxies: [strategyTargets.auto, strategyTargets.fallback, strategyTargets['load-balance'], strategyTargets.direct]
    },
    {
      name: strategyTargets.auto,
      type: 'url-test',
      use: ['airport'],
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      tolerance: autoSelectToleranceMs,
      lazy: true
    },
    {
      name: strategyTargets.fallback,
      type: 'fallback',
      use: ['airport'],
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      lazy: true
    },
    {
      name: strategyTargets['load-balance'],
      type: 'load-balance',
      strategy: 'consistent-hashing',
      use: ['airport'],
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      lazy: true
    }
  ];
}

function buildInlineProxyGroups(orderedProxyNames: string[]) {
  return [
    {
      name: selectorName,
      type: 'select',
      proxies: [
        strategyTargets.auto,
        orderedProxyNames[0],
        strategyTargets.fallback,
        strategyTargets['load-balance'],
        strategyTargets.direct,
        ...orderedProxyNames.slice(1)
      ]
    },
    {
      name: strategyTargets.auto,
      type: 'url-test',
      proxies: orderedProxyNames,
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      tolerance: autoSelectToleranceMs,
      lazy: true
    },
    {
      name: strategyTargets.fallback,
      type: 'fallback',
      proxies: orderedProxyNames,
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      lazy: true
    },
    {
      name: strategyTargets['load-balance'],
      type: 'load-balance',
      proxies: orderedProxyNames,
      url: secureHealthCheckUrl,
      'expected-status': healthCheckExpectedStatus,
      interval: nodeHealthCheckIntervalSeconds,
      strategy: 'consistent-hashing',
      lazy: true
    }
  ];
}

function buildRuntimeOptions(input: MihomoConfigInput) {
  const options: Record<string, unknown> = {
    'mixed-port': input.mixedPort ?? 7897,
    'allow-lan': input.allowLan ?? false,
    mode: input.mode ?? 'rule',
    'log-level': 'info',
    'external-controller': `127.0.0.1:${input.controllerPort ?? 9090}`,
    secret: input.secret,
    ipv6: false,
    'unified-delay': true,
    'tcp-concurrent': true,
    'disable-keep-alive': false,
    'keep-alive-idle': 30,
    'keep-alive-interval': 15,
    'find-process-mode': 'strict',
    'geodata-mode': false,
    'geo-auto-update': false,
    'geodata-loader': 'memconservative',
    'global-ua': 'Clash Verge/2.3.2',
    profile: {
      'store-selected': true,
      'store-fake-ip': true
    }
  };

  if (input.dnsEnhanced === true) {
    options.dns = {
      enable: true,
      listen: `127.0.0.1:${input.dnsPort ?? 1053}`,
      ipv6: false,
      'cache-algorithm': 'arc',
      'prefer-h3': false,
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      'fake-ip-filter': [
        '*.lan',
        '*.local',
        'localhost.ptlogin2.qq.com',
        'dns.msftncsi.com',
        'www.msftconnecttest.com',
        '*.msftconnecttest.com',
        '*.msftncsi.com',
        ...microsoftStoreFakeIpFilterDomains,
        ...gamingFakeIpFilterDomains
      ],
      'default-nameserver': ['223.5.5.5', '119.29.29.29'],
      nameserver: ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
      'nameserver-policy': Object.fromEntries(
        [...new Set([...steamAccelerationDomains, ...codexDnsDomains])].map((domain) => [
          `+.${domain}`,
          [...stableProxyDnsResolvers]
        ])
      ),
      'direct-nameserver': ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
      'proxy-server-nameserver': ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
      'direct-nameserver-follow-policy': false,
      'respect-rules': true
    };
  }

  if (input.snifferEnabled ?? true) {
    options.sniffer = {
      enable: true,
      'parse-pure-ip': true,
      'force-dns-mapping': true,
      sniff: {
        HTTP: {
          ports: ['80', '8080-8880'],
          'override-destination': true
        },
        TLS: {
          ports: ['443', '8443']
        },
        QUIC: {
          ports: ['443', '8443']
        }
      }
    };
  }

  if (input.tunEnabled) {
    options.tun = {
      enable: true,
      stack: 'mixed',
      'dns-hijack': ['any:53', 'tcp://any:53'],
      'auto-route': true,
      'auto-detect-interface': true,
      'strict-route': input.strictRouteEnabled ?? true
    };
  }

  return options;
}

function sanitizeHealthCheckUrls(config: Record<string, unknown>) {
  const groups = config['proxy-groups'];
  if (Array.isArray(groups)) {
    for (const group of groups) {
      if (isRecord(group)) normalizeKnownHealthCheck(group);
    }
  }

  const providers = config['proxy-providers'];
  if (isRecord(providers)) {
    for (const provider of Object.values(providers)) {
      if (!isRecord(provider) || !isRecord(provider['health-check'])) continue;
      normalizeKnownHealthCheck(provider['health-check']);
    }
  }
}

function normalizeKnownHealthCheck(healthCheck: Record<string, unknown>) {
  if (healthCheck.url === insecureGoogleHealthCheckUrl) {
    healthCheck.url = secureHealthCheckUrl;
    healthCheck['expected-status'] = healthCheckExpectedStatus;
  } else if (healthCheck.url === insecureCloudflareHealthCheckUrl) {
    healthCheck.url = secureCloudflareHealthCheckUrl;
    healthCheck['expected-status'] = healthCheckExpectedStatus;
  }
}

function sanitizeProviderResourceBounds(config: Record<string, unknown>) {
  sanitizeProxyGroupResourceBounds(config['proxy-groups']);
  sanitizeHttpProviders(config['proxy-providers'], {
    sizeLimitBytes: proxyProviderSizeLimitBytes,
    refreshIntervalSeconds: proxyProviderRefreshIntervalSeconds,
    sanitizeHealthCheck: true
  });
  sanitizeHttpProviders(config['rule-providers'], {
    sizeLimitBytes: ruleProviderSizeLimitBytes,
    refreshIntervalSeconds: ruleProviderRefreshIntervalSeconds,
    sanitizeHealthCheck: false
  });
}

function sanitizeProxyGroupResourceBounds(groups: unknown) {
  if (!Array.isArray(groups)) {
    return;
  }

  for (const group of groups) {
    if (!isRecord(group) || typeof group.type !== 'string') {
      continue;
    }
    const type = group.type.trim().toLowerCase();
    const hasHealthCheckUrl = typeof group.url === 'string' && Boolean(group.url.trim());
    if (!healthCheckProxyGroupTypes.has(type) || !hasHealthCheckUrl) {
      continue;
    }

    group.interval = clampInteger(
      group.interval,
      providerHealthCheckIntervalMinSeconds,
      providerHealthCheckIntervalMaxSeconds,
      nodeHealthCheckIntervalSeconds
    );
    group.timeout = clampInteger(
      group.timeout,
      providerHealthCheckTimeoutMinMs,
      providerHealthCheckTimeoutMaxMs,
      providerHealthCheckTimeoutMs
    );
    group.lazy = true;
  }
}

function sanitizeHttpProviders(
  providers: unknown,
  options: {
    sizeLimitBytes: number;
    refreshIntervalSeconds: number;
    sanitizeHealthCheck: boolean;
  }
) {
  if (!isRecord(providers)) {
    return;
  }

  for (const provider of Object.values(providers)) {
    if (!isRecord(provider) || typeof provider.type !== 'string' || provider.type.trim().toLowerCase() !== 'http') {
      continue;
    }

    provider['size-limit'] = clampPositiveInteger(
      provider['size-limit'],
      options.sizeLimitBytes,
      options.sizeLimitBytes
    );
    provider.interval = clampInteger(
      provider.interval,
      providerRefreshIntervalMinSeconds,
      providerRefreshIntervalMaxSeconds,
      options.refreshIntervalSeconds
    );

    if (options.sanitizeHealthCheck && isRecord(provider['health-check'])) {
      const healthCheck = provider['health-check'];
      healthCheck.interval = clampInteger(
        healthCheck.interval,
        providerHealthCheckIntervalMinSeconds,
        providerHealthCheckIntervalMaxSeconds,
        nodeHealthCheckIntervalSeconds
      );
      healthCheck.timeout = clampInteger(
        healthCheck.timeout,
        providerHealthCheckTimeoutMinMs,
        providerHealthCheckTimeoutMaxMs,
        providerHealthCheckTimeoutMs
      );
      healthCheck.lazy = true;
    }
  }
}

function clampPositiveInteger(value: unknown, maximum: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), maximum);
}

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), minimum), maximum);
}

function sanitizeSubscriptionNoticeNodes(config: Record<string, unknown>) {
  const proxies = config.proxies;
  if (!Array.isArray(proxies)) {
    return;
  }

  const blockedProxyNames = new Set<string>();
  const filteredProxies = proxies.filter((proxy) => {
    const name = isRecord(proxy) && typeof proxy.name === 'string' ? proxy.name : '';
    const isBlocked = Boolean(name) && isBlockedSelectableNodeName(name);
    if (isBlocked) {
      blockedProxyNames.add(name);
    }
    return Boolean(name) && !isBlocked;
  });
  config.proxies = filteredProxies;

  if (!Array.isArray(config['proxy-groups'])) {
    return;
  }

  const proxyNames = new Set(
    filteredProxies
      .map((proxy) => (isRecord(proxy) && typeof proxy.name === 'string' ? proxy.name : undefined))
      .filter((name): name is string => Boolean(name))
  );
  const groupNames = new Set(
    config['proxy-groups']
      .map((group) => (isRecord(group) && typeof group.name === 'string' ? group.name : undefined))
      .filter((name): name is string => Boolean(name))
  );

  for (const group of config['proxy-groups']) {
    if (!isRecord(group) || !Array.isArray(group.proxies)) {
      continue;
    }

    group.proxies = group.proxies.filter((name) => {
      if (typeof name !== 'string') return true;
      const reservedGroupReference = isReservedSelectableNodeName(name) && groupNames.has(name);
      return (
        reservedGroupReference ||
        (!blockedProxyNames.has(name) &&
          !isBlockedSelectableNodeName(name) &&
          (proxyNames.has(name) || groupNames.has(name) || builtInProxyNames.has(name)))
      );
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDirectlyRoutableInlineProxyName(name: string): boolean {
  const normalizedName = name.trim();
  return Boolean(normalizedName) && normalizedName === name && !isBlockedSelectableNodeName(normalizedName);
}

function applyUnifiedRouting(config: Record<string, unknown>, input: MihomoConfigInput) {
  const proxies = Array.isArray(config.proxies)
    ? config.proxies.filter(
        (p) =>
          isRecord(p) &&
          typeof p.name === 'string' &&
          isDirectlyRoutableInlineProxyName(p.name) &&
          !p.name.startsWith('有鱼 · ')
      )
    : [];
  const names = proxies.map((p) => (p as { name: string }).name);
  const providers = isRecord(config['proxy-providers']) ? config['proxy-providers'] : {};
  for (const [index, provider] of Object.values(providers).entries()) {
    if (!isRecord(provider)) continue;
    if (provider.type === 'http') provider.path = `./providers/airport-${index}.yaml`;
    // Removed airport policy groups must not remain as downloader dependencies.
    if (provider.proxy !== 'DIRECT') delete provider.proxy;
  }
  // Subscription groups, rules, DNS and sub-rules are never imported.
  const merged: Record<string, unknown> = {
    ...buildRuntimeOptions(input),
    ...(proxies.length ? { proxies } : {}),
    ...(Object.keys(providers).length ? { 'proxy-providers': providers } : {})
  };
  sanitizeProviderResourceBounds(merged);
  const providerNames = Object.keys(providers);
  const baseGroups = names.length ? buildInlineProxyGroups(orderProxyNames(names)) : buildProviderProxyGroups();
  for (const group of baseGroups) {
    if (providerNames.length) Object.assign(group, { use: providerNames });
    else delete (group as Record<string, unknown>).use;
  }
  const routing = buildRouting(names, providerNames, input.ruleProfile, input.customRules);
  merged['proxy-groups'] = [...baseGroups, ...routing.groups];
  merged['rule-providers'] = routing.providers;
  merged.rules = routing.rules;
  return merged;
}
