import { useState } from 'react';
import { RulePicker } from '../components/RulePicker';
import { ruleProfileOptions } from '../../shared/routing';
import type { RuleProfile, StrategyKey } from '../../shared/ipc';
import { memo } from 'react';
import type { AppSnapshot } from '../../shared/ipc';
import { NodeList } from '../components/NodeList';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { currentNodeLabel } from '../nodePresentation';
import { detectNodeRegion } from '../../main/mihomo/nodeSelectionPolicy';

type NodeSelectProps = {
  snapshot: AppSnapshot;
  busy: boolean;
  message: string;
  testingAll: boolean;
  switchingNode?: string;
  onSelect: (name: string) => void;
  onTestNode: (name: string) => void;
  onTestAll: () => void;
  onCancelTestAll: () => void;
  onRefresh: () => void;
  onRuleProfileChange?: (profile: RuleProfile) => void;
  onStrategyChange?: (strategy: StrategyKey) => void;
};

export const NodeSelect = memo(NodeSelectView, areNodeSelectPropsEqual);

function NodeSelectView({
  snapshot,
  busy,
  message,
  testingAll,
  switchingNode,
  onSelect,
  onTestNode,
  onTestAll,
  onCancelTestAll,
  onRefresh,
  onRuleProfileChange = () => undefined,
  onStrategyChange = () => undefined
}: NodeSelectProps) {
  const [sort, setSort] = useState<'category' | 'latency'>('latency');
  const sortedNodes =
    sort === 'latency'
      ? [...snapshot.nodes].sort(
          (a, b) =>
            (a.testState === 'failed' ? Infinity : (a.delay ?? Infinity)) -
            (b.testState === 'failed' ? Infinity : (b.delay ?? Infinity))
        )
      : [...snapshot.nodes].sort((a, b) =>
          (detectNodeRegion(a.name) ?? 'zz').localeCompare(detectNodeRegion(b.name) ?? 'zz')
        );
  const fixedNode =
    snapshot.nodes.find((node) => node.active)?.name ??
    snapshot.nodes.find((node) => node.name === snapshot.currentNode)?.name;
  const emptyText = snapshot.subscriptionUrl
    ? snapshot.status === 'running'
      ? '先更新订阅'
      : '启动后显示节点'
    : '先保存订阅';

  return (
    <div className="workspace fill-space node-page">
      <WorkspaceHeader
        title="节点"
        description={`当前节点：${currentNodeLabel(snapshot)}`}
        actions={
          <>
            <button
              className="wide-button"
              disabled={busy && !testingAll}
              onClick={testingAll ? onCancelTestAll : onTestAll}
            >
              {testingAll ? '停止' : '全部测速'}
            </button>
            <button className="secondary-button" disabled={busy} onClick={onRefresh}>
              {snapshot.status === 'running' ? '更新订阅' : '启动并更新'}
            </button>
          </>
        }
      />
      <section className="panel list-panel routing-node-panel">
        <div className="node-routing-toolbar">
          <div className="node-sort-group">
            <span className="node-sort-label">排序</span>
            <div className="node-sort">
              <button aria-pressed={sort === 'latency'} onClick={() => setSort('latency')}>
                延迟
              </button>
              <button aria-pressed={sort === 'category'} onClick={() => setSort('category')}>
                分类
              </button>
            </div>
          </div>
          <div className="node-selection-controls">
            <div className="node-sort node-selection-mode" aria-label="节点选择方式">
              <button
                aria-pressed={snapshot.strategy === 'manual'}
                disabled={busy || !fixedNode}
                onClick={() => fixedNode && onSelect(fixedNode)}
              >
                手动固定
              </button>
              <button
                aria-pressed={snapshot.strategy !== 'manual' && snapshot.strategy !== 'direct'}
                disabled={busy}
                onClick={() => onStrategyChange('auto')}
              >
                按规则选最优
              </button>
            </div>
            <RulePicker
              label={snapshot.managedRuleProfile ? '规则来源（管理端）' : '规则来源'}
              value={snapshot.ruleProfile}
              options={ruleProfileOptions}
              disabled={busy || Boolean(snapshot.managedRuleProfile)}
              onChange={onRuleProfileChange}
            />
          </div>
        </div>
        <div className="node-section-line">
          <span>代理节点</span>
          <span>{snapshot.nodes.length} 个节点</span>
        </div>
        <NodeList
          nodes={sortedNodes}
          groupByRegion={sort === 'category'}
          selectionBusy={busy && !testingAll}
          testingBusy={busy}
          switchingNode={switchingNode}
          emptyText={emptyText}
          onSelect={onSelect}
          onTestNode={onTestNode}
        />
      </section>
      <p className="inline-message">{message || ' '}</p>
    </div>
  );
}

function areNodeSelectPropsEqual(previous: NodeSelectProps, next: NodeSelectProps): boolean {
  return (
    previous.onRuleProfileChange === next.onRuleProfileChange &&
    previous.onStrategyChange === next.onStrategyChange &&
    previous.snapshot.ruleProfile === next.snapshot.ruleProfile &&
    previous.snapshot.managedRuleProfile === next.snapshot.managedRuleProfile &&
    previous.busy === next.busy &&
    previous.message === next.message &&
    previous.testingAll === next.testingAll &&
    previous.switchingNode === next.switchingNode &&
    previous.onSelect === next.onSelect &&
    previous.onTestNode === next.onTestNode &&
    previous.onTestAll === next.onTestAll &&
    previous.onCancelTestAll === next.onCancelTestAll &&
    previous.onRefresh === next.onRefresh &&
    getNodeSelectRenderKey(previous.snapshot) === getNodeSelectRenderKey(next.snapshot)
  );
}

export function getNodeSelectRenderKey(snapshot: AppSnapshot): string {
  return JSON.stringify([
    snapshot.subscriptionUrl,
    snapshot.status,
    snapshot.strategy,
    snapshot.currentNode,
    snapshot.nodes.map((node) => [node.name, node.delay ?? null, node.active ?? false, node.testState ?? ''])
  ]);
}
