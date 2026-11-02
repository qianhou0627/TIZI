import { describe, expect, it } from 'vitest';
import { ruleProfileOptions } from '../../src/renderer/pages/Settings';

describe('settings rule profiles', () => {
  it('offers the three local routing modes', () => {
    expect(ruleProfileOptions).toEqual([
      { value: 'ruleset', label: '智能规则' },
      { value: 'smart-custom', label: '智能规则+自定义规则' },
      { value: 'custom', label: '完全自定义（小白勿选）' }
    ]);
  });
});
