// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyThemeChoice, createCustomTheme, readThemeChoice, themeContrast, themes } from '../../src/renderer/theme';

describe('prototype theme behavior', () => {
  it('preserves the five presets and defaults to black', () => {
    localStorage.clear();
    expect(themes.map((t) => t.name)).toEqual(['紫色', '蓝色', '绿色', '暖色', '灰色']);
    expect(readThemeChoice()).toEqual({ chosen: 'custom', custom: '#000000' });
    applyThemeChoice(readThemeChoice());
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#000000');
  });
  it('persists a custom choice and restores its application tokens', () => {
    expect(applyThemeChoice({ chosen: 'custom', custom: '#ffffff' }, true)).toBe(true);
    expect(readThemeChoice()).toEqual({ chosen: 'custom', custom: '#ffffff' });
    expect(document.documentElement.style.getPropertyValue('--on-accent')).toBe('#000000');
    localStorage.setItem('youyu-theme-v1', 'invalid');
    expect(readThemeChoice()).toEqual({ chosen: 'custom', custom: '#000000' });
  });
  it('keeps custom foregrounds readable at the brightest and darkest extremes', () => {
    const rgb = (value: string): [number, number, number] =>
      [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
    for (const color of ['#ffffff', '#000000', '#ffff00', '#ff77ff', '#2869b5']) {
      const t = createCustomTheme(color);
      expect(themeContrast(rgb(t.accentText), rgb(t.surface))).toBeGreaterThanOrEqual(4.5);
      expect(themeContrast(rgb(t.accent), rgb(t.onAccent!))).toBeGreaterThanOrEqual(4.5);
    }
    expect(() => createCustomTheme('not-a-color')).toThrow();
  });
});
