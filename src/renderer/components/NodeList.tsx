import type { ProxyNode } from '../../shared/ipc';
import { detectNodeRegion } from '../../main/mihomo/nodeSelectionPolicy';
import { nodeFlags } from '../nodeFlags';
import { nodeDelayClass } from '../nodePresentation';
import { Fragment } from 'react';
import { exitRegionLabel } from '../../main/mihomo/nodeSelectionPolicy';

type NodeListProps = {
  nodes: ProxyNode[];
  selectionBusy: boolean;
  testingBusy: boolean;
  switchingNode?: string;
  emptyText?: string;
  groupByRegion?: boolean;
  onSelect: (name: string) => void;
  onTestNode: (name: string) => void;
};

export function NodeList({
  nodes,
  selectionBusy,
  testingBusy,
  switchingNode,
  emptyText = '先更新订阅',
  groupByRegion = false,
  onSelect,
  onTestNode
}: NodeListProps) {
  if (nodes.length === 0) {
    return <div className="empty">{emptyText}</div>;
  }

  return (
    <div className="node-list">
      {nodes.map((node, index) => {
        const switching = switchingNode === node.name;
        const className = ['node', node.active ? 'active' : '', switching ? 'switching' : ''].filter(Boolean).join(' ');

        return (
          <Fragment key={node.name}>
            {groupByRegion &&
              (index === 0 || detectNodeRegion(nodes[index - 1].name) !== detectNodeRegion(node.name)) && (
                <h3 className="node-region-heading">{exitRegionLabel(detectNodeRegion(node.name))}</h3>
              )}
            <div className={className}>
              <button
                className="node-main"
                disabled={selectionBusy || Boolean(switchingNode)}
                aria-pressed={node.active}
                onClick={() => onSelect(node.name)}
              >
                <span
                  className="node-flag"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: nodeFlags[detectNodeRegion(node.name) ?? 'unknown'] }}
                />
                <span className="node-label">
                  <span className="node-name">{node.name}</span>
                  {node.active && <span className="node-current-mark">当前</span>}
                </span>
              </button>
              <span className={nodeDelayClass(node)}>{formatDelay(node, switching)}</span>
              <button
                className="node-test"
                disabled={testingBusy || switching}
                aria-label={`${node.name} 测速`}
                onClick={() => onTestNode(node.name)}
              >
                测速
              </button>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function formatDelay(node: ProxyNode, switching: boolean): string {
  if (switching) return '切换中';
  if (node.testState === 'testing') return '测速中';
  if (node.testState === 'failed') return '失败';
  if (typeof node.delay === 'number' && Number.isFinite(node.delay) && node.delay >= 0) return `${node.delay} ms`;
  return '未测速';
}
