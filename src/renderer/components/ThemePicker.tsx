import { useEffect, useRef, useState } from 'react';
import { applyThemeChoice, readThemeChoice, themes, type ThemeChoice } from '../theme';

export function ThemePicker() {
  const [choice, setChoice] = useState(readThemeChoice),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    applyThemeChoice(choice);
  }, [choice]);
  function choose(next: ThemeChoice) {
    setChoice(next);
    setError(applyThemeChoice(next, true) ? '' : '当前环境无法保存选色');
  }
  return (
    <div className="theme-controls">
      <button
        type="button"
        className="theme-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls="software-theme-popup"
        onClick={() => {
          const p = popup.current,
            t = trigger.current;
          if (!p || !t) return;
          if (p.matches(':popover-open')) {
            p.hidePopover();
            return;
          }
          p.showPopover();
          const r = t.getBoundingClientRect();
          p.style.left = `${Math.min(r.right + 8, innerWidth - p.offsetWidth - 8)}px`;
          p.style.top = `${Math.max(8, Math.min(innerHeight - p.offsetHeight - 8, r.top + (r.height - p.offsetHeight) / 2))}px`;
        }}
      >
        <span className="theme-trigger-dot" />
        软件选色
      </button>
      <div
        id="software-theme-popup"
        ref={popup}
        className="theme-popup"
        popover="auto"
        aria-label="软件选色"
        onToggle={(e) => setOpen(e.newState === 'open')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            popup.current?.hidePopover();
            trigger.current?.focus();
          }
        }}
      >
        <div className="theme-swatches">
          {[4, 1, 0, 2, 3].map((i) => (
            <button
              key={i}
              type="button"
              className="theme-swatch"
              aria-label={`软件选色：${themes[i].name}`}
              aria-pressed={choice.chosen === `preset-${i}`}
              onClick={() => choose({ ...choice, chosen: `preset-${i}` })}
            >
              <span style={{ background: themes[i].accent }} />
            </button>
          ))}
          <label className="theme-custom" data-active={choice.chosen === 'custom'}>
            <span />
            <input
              type="color"
              value={choice.custom}
              aria-label="自定义颜色"
              onClick={() => choose({ ...choice, chosen: 'custom' })}
              onChange={(e) => choose({ chosen: 'custom', custom: e.target.value })}
            />
          </label>
        </div>
        <span className="theme-current">
          {choice.chosen === 'custom' ? '自定义' : themes[Number(choice.chosen.slice(7))].name}
        </span>
        {error && <span role="status">{error}</span>}
      </div>
    </div>
  );
}
