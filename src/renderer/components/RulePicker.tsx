import { useId, useRef, useState } from 'react';

export function RulePicker<T extends string>({
  value,
  options,
  label,
  disabled,
  onChange,
  className = ''
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  function toggle() {
    const p = popup.current,
      t = trigger.current;
    if (!p || !t) return;
    if (p.matches(':popover-open')) {
      p.hidePopover();
      return;
    }
    p.showPopover();
    const r = t.getBoundingClientRect(),
      w = Math.max(p.offsetWidth, r.width);
    p.style.minWidth = `${w}px`;
    p.style.left = `${Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))}px`;
    p.style.top = `${r.bottom + p.offsetHeight + 6 > window.innerHeight ? Math.max(8, r.top - p.offsetHeight - 6) : r.bottom + 6}px`;
    p.querySelector<HTMLButtonElement>('[aria-selected="true"],button')?.focus();
  }
  return (
    <div className={`rule-picker ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="rule-picker-trigger"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {!className.includes('routing-more') && (
          <span>{value === 'regex' ? '正则匹配' : (options.find((o) => o.value === value)?.label ?? value)}</span>
        )}
        <svg viewBox="0 0 20 20" aria-hidden="true">
          {className.includes('routing-more') ? (
            <>
              <circle cx="4" cy="10" r=".8" />
              <circle cx="10" cy="10" r=".8" />
              <circle cx="16" cy="10" r=".8" />
            </>
          ) : (
            <path d="m6 8 4 4 4-4" />
          )}
        </svg>
      </button>
      <div
        ref={popup}
        id={id}
        className="rule-picker-popup"
        popover="auto"
        role="listbox"
        aria-label={label}
        onToggle={(e) => setOpen(e.newState === 'open')}
        onKeyDown={(e) => {
          const p = popup.current;
          if (!p) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            p.hidePopover();
            trigger.current?.focus();
          }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const items = [...p.querySelectorAll<HTMLButtonElement>('button')],
              i = items.indexOf(document.activeElement as HTMLButtonElement);
            items[
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? items.length - 1
                  : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
            ]?.focus();
          }
        }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            onClick={() => {
              popup.current?.hidePopover();
              trigger.current?.focus();
              onChange(o.value);
            }}
          >
            <span>{o.label}</span>
            {o.value === value && (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m4 10 4 4 8-9" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
