import type { RuleProfile } from './ipc';

export const ruleProfileOptions = [
  { value: 'ruleset', label: '智能规则' },
  { value: 'smart-custom', label: '智能规则+自定义规则' },
  { value: 'custom', label: '完全自定义（小白勿选）' }
] as const;
export const ruleTargets = ['智能规则', '香港', '台湾', '日本', '韩国', '美国', '新加坡', '直连', '拦截'] as const;
export type RuleTarget = (typeof ruleTargets)[number];
export type CustomRule = { id: string; name?: string; pattern: string; target: RuleTarget };
export const defaultCustomRules: CustomRule[] = [
  { id: 'chatgpt', name: 'ChatGPT', pattern: 'chatgpt|openai|oaistatic|oaiusercontent', target: '智能规则' },
  { id: 'gemini', name: 'Gemini', pattern: 'gemini|generativelanguage|aistudio', target: '智能规则' }
];

export function normalizeRuleProfile(value: unknown): RuleProfile {
  return value === 'smart-custom' || value === 'custom' ? value : 'ruleset';
}

// Restrict expressions to the regular-expression syntax shared by JavaScript and Go/RE2.
export function customRuleError(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length > 100) return '规则最多 100 条';
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return '规则格式无效';
    const r = item as CustomRule;
    if (typeof r.id !== 'string' || !/^[\w-]{1,80}$/.test(r.id) || ids.has(r.id)) return '规则编号无效或重复';
    ids.add(r.id);
    if (r.name !== undefined && (typeof r.name !== 'string' || r.name.length > 80)) return '规则名称过长';
    if (!ruleTargets.includes(r.target)) return '请选择有效节点';
    if (
      typeof r.pattern !== 'string' ||
      !r.pattern.trim() ||
      r.pattern.length > 512 ||
      /[,\r\n]/.test(r.pattern) ||
      r.pattern.includes(String.fromCharCode(0))
    )
      return '匹配内容不能为空，且不能包含逗号或换行';
    if (/\(\?|\\[1-9]|\\[bBkK]|\*\+|\+\+|\?\+/.test(r.pattern)) return '不支持环视、反向引用或特殊分组';
    try {
      new RegExp(r.pattern);
    } catch {
      return '正则表达式无效，请检查后保存';
    }
  }
  return undefined;
}
