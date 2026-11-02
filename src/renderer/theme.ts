export type Theme = {
  name: string;
  main: string;
  sidebar: string;
  panel: string;
  surface: string;
  accent: string;
  accentText: string;
  line: string;
  muted: string;
  compact: string;
  onAccent?: string;
  outline?: string;
};
export const themes: Theme[] = [
  {
    name: '紫色',
    main: '#f5f1fa',
    sidebar: '#fcfaff',
    panel: '#ffffff',
    surface: '#ede5fa',
    accent: '#7044b7',
    accentText: '#532e8f',
    line: '#ded3ea',
    muted: '#685b74',
    compact: '#f1edf6'
  },
  {
    name: '蓝色',
    main: '#f0f5fc',
    sidebar: '#f9fbff',
    panel: '#fcfeff',
    surface: '#e2eefc',
    accent: '#2869b5',
    accentText: '#1b4d8a',
    line: '#d5e2f2',
    muted: '#566c80',
    compact: '#eaf1f9'
  },
  {
    name: '绿色',
    main: '#eff7f3',
    sidebar: '#f9fdfb',
    panel: '#fcfffd',
    surface: '#def2e7',
    accent: '#16745b',
    accentText: '#145744',
    line: '#d3e7dc',
    muted: '#536b5e',
    compact: '#e7f2ec'
  },
  {
    name: '暖色',
    main: '#fbf4ed',
    sidebar: '#fffbf6',
    panel: '#fffdfa',
    surface: '#fbe9d9',
    accent: '#a6532b',
    accentText: '#7b381e',
    line: '#eedccd',
    muted: '#796052',
    compact: '#f6ece2'
  },
  {
    name: '灰色',
    main: '#f1f3f6',
    sidebar: '#fafbfc',
    panel: '#fcfcfd',
    surface: '#e4e9f0',
    accent: '#536176',
    accentText: '#384555',
    line: '#d8dde4',
    muted: '#626b74',
    compact: '#e9edf1'
  }
];
type RGB = [number, number, number];
const hex = (rgb: RGB) => '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('');
const rgb = (value: string): RGB => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as RGB;
const blend = (value: RGB, white: number) => value.map((n) => Math.round(n * (1 - white) + 255 * white)) as RGB;
const luminance = (value: RGB) =>
  value
    .map((n) => n / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
    .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
export const themeContrast = (a: RGB, b: RGB) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
export function createCustomTheme(color: string): Theme {
  if (!/^#[\da-f]{6}$/i.test(color)) throw Error('Invalid theme color');
  const base = rgb(color),
    surface = blend(base, 0.9),
    sidebar = blend(base, 0.98);
  let text: RGB = [...base];
  while (
    Math.min(themeContrast(text, surface), themeContrast(text, [255, 255, 255]), themeContrast(text, sidebar)) < 4.5
  )
    text = text.map((n) => Math.floor(n * 0.85)) as RGB;
  return {
    name: '自定义',
    main: hex(blend(base, 0.94)),
    sidebar: hex(sidebar),
    panel: '#ffffff',
    surface: hex(surface),
    accent: color,
    accentText: hex(text),
    line: hex(blend(base, 0.78)),
    muted: '#4a5560',
    compact: hex(blend(base, 0.92)),
    onAccent: themeContrast(base, [255, 255, 255]) >= themeContrast(base, [0, 0, 0]) ? '#ffffff' : '#000000',
    outline: themeContrast(base, blend(base, 0.94)) < 2.5 ? '#667180' : color
  };
}
export type ThemeChoice = { chosen: string; custom: string };
const storageKey = 'youyu-theme-v1';
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (stored && /^(preset-[0-4]|custom)$/.test(stored.chosen) && /^#[\da-f]{6}$/i.test(stored.custom)) return stored;
  } catch {
    /* Use the default when storage is unavailable. */
  }
  return { chosen: 'custom', custom: '#000000' };
}
export function applyThemeChoice(choice: ThemeChoice, save = false): boolean {
  const t =
    choice.chosen === 'custom'
      ? createCustomTheme(choice.custom)
      : (themes[Number(choice.chosen.slice(7))] ?? themes[1]);
  const properties = {
    '--surface': t.main,
    '--surface-raised': t.sidebar,
    '--panel': t.panel,
    '--accent': t.accent,
    '--accent-strong': t.accentText,
    '--accent-soft': t.surface,
    '--accent-secondary': t.surface,
    '--accent-secondary-hover': t.surface,
    '--accent-tint': t.sidebar,
    '--interactive-hover': t.surface,
    '--interactive-hover-strong': t.surface,
    '--ink': '#241b31',
    '--ink-soft': t.muted,
    '--muted': t.muted,
    '--line': t.line,
    '--line-strong': t.line,
    '--compact-bg': t.compact,
    '--on-accent': t.onAccent ?? '#ffffff',
    '--accent-outline': t.outline ?? t.accent
  };
  for (const [key, value] of Object.entries(properties)) document.documentElement.style.setProperty(key, value);
  if (save) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(choice));
    } catch {
      return false;
    }
  }
  return true;
}
