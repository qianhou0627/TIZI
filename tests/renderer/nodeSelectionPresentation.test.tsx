// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDevYouYuApi } from '../../src/renderer/devApi';
import { NodeSelect } from '../../src/renderer/pages/NodeSelect';
import { Home } from '../../src/renderer/pages/Home';
import { NodeList } from '../../src/renderer/components/NodeList';
import { currentNodeLabel, nodeDelayClass } from '../../src/renderer/nodePresentation';
import type { AppSnapshot } from '../../src/shared/ipc';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const noop = () => undefined;
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe('node selection presentation', () => {
  it.each([
    [0, 'good'],
    [200, 'good'],
    [201, 'ok'],
    [400, 'ok'],
    [401, 'bad'],
    [900, 'bad']
  ] as const)('assigns the requested delay tier at %s ms', (delay, tier) => {
    expect(nodeDelayClass({ delay })).toBe(`delay delay-${tier}`);
  });
  it('shows failure instead of a stale successful delay', () => {
    expect(nodeDelayClass({ delay: 20, testState: 'failed' })).toBe('delay delay-failed');
    const html = renderToStaticMarkup(
      <NodeList
        nodes={[{ name: '日本 失败', delay: 20, testState: 'failed' }]}
        selectionBusy={false}
        testingBusy={false}
        onSelect={noop}
        onTestNode={noop}
      />
    );
    expect(html).toContain('失败</span>');
    expect(html).not.toContain('20 ms');
    expect(nodeDelayClass({})).toBe('delay delay-unknown');
    expect(nodeDelayClass({ delay: NaN })).toBe('delay delay-unknown');
  });
  it('defaults to latency order, groups by region, and switches selection using the real active node', async () => {
    const snapshot = await fixture();
    const onSelect = vi.fn(),
      onStrategyChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const props = {
      snapshot,
      busy: false,
      message: '',
      testingAll: false,
      onSelect,
      onStrategyChange,
      onTestNode: noop,
      onTestAll: noop,
      onCancelTestAll: noop,
      onRefresh: noop
    };
    await act(async () => root?.render(<NodeSelect {...props} />));
    expect(container.querySelector('.node-sort button[aria-pressed="true"]')?.textContent).toBe('延迟');
    expect([...container.querySelectorAll('.node-name')].map((n) => n.textContent)).toEqual([
      '香港 快',
      '日本 中',
      '日本 慢',
      '台湾 未测',
      '日本 失败'
    ]);
    expect(container.textContent).toContain('当前节点：规则自动选择');
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === '手动固定')?.click());
    expect(onSelect).toHaveBeenCalledWith('日本 慢');
    await act(async () =>
      [...container.querySelectorAll('button')].find((b) => b.textContent === '按规则选最优')?.click()
    );
    expect(onStrategyChange).toHaveBeenCalledWith('auto');
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === '分类')?.click());
    expect([...container.querySelectorAll('.node-region-heading')].map((n) => n.textContent)).toEqual([
      '香港',
      '日本',
      '台湾'
    ]);
    await act(async () => root?.render(<NodeSelect {...props} snapshot={{ ...snapshot, strategy: 'manual' }} />));
    expect(container.textContent).toContain('当前节点：日本 慢');
    expect(container.querySelector('.node-selection-mode button[aria-pressed="true"]')?.textContent).toBe('手动固定');
  });
  it.each(['auto', 'manual'] as const)(
    'uses the same current-node label on the dashboard in %s mode',
    async (strategy) => {
      const snapshot = { ...(await fixture()), strategy };
      const html = renderToStaticMarkup(
        <Home
          usageMode="advanced"
          snapshot={snapshot}
          busy={false}
          busyLabel=""
          message=""
          onQuickStart={noop}
          onStart={noop}
          onStop={noop}
          onRepair={noop}
          onModeChange={noop}
          onUsageModeChange={noop}
          onInstallUpdate={noop}
        />
      );
      const container = document.createElement('div');
      container.innerHTML = html;
      expect(container.querySelector('.connection-identity h2')?.textContent).toBe(currentNodeLabel(snapshot));
      expect(container.querySelector('.connection-health')).toBeNull();
      expect(container.querySelector('.node-mode-toggle')).toBeNull();
      expect(container.querySelector('.power-button')).not.toBeNull();
    }
  );
});

async function fixture(): Promise<AppSnapshot> {
  return {
    ...(await createDevYouYuApi({ preset: 'readme' }).getSnapshot()),
    strategy: 'auto',
    currentNode: '日本 慢',
    nodes: [
      { name: '日本 慢', delay: 500, active: true },
      { name: '香港 快', delay: 80 },
      { name: '日本 中', delay: 250 },
      { name: '台湾 未测' },
      { name: '日本 失败', delay: 1, testState: 'failed' }
    ]
  };
}
