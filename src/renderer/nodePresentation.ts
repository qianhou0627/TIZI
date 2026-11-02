import type { AppSnapshot, ProxyNode } from '../shared/ipc';

export function currentNodeLabel(snapshot: Pick<AppSnapshot, 'strategy' | 'currentNode'>): string {
  if (snapshot.strategy === 'direct') return '直连';
  return snapshot.strategy === 'manual' ? snapshot.currentNode || '未选择' : '规则自动选择';
}

export function nodeDelayClass(node: Pick<ProxyNode, 'delay' | 'testState'>): string {
  if (node.testState === 'testing') return 'delay delay-testing';
  if (node.testState === 'failed') return 'delay delay-failed';
  if (typeof node.delay !== 'number' || !Number.isFinite(node.delay) || node.delay < 0) return 'delay delay-unknown';
  if (node.delay <= 200) return 'delay delay-good';
  if (node.delay <= 400) return 'delay delay-ok';
  return 'delay delay-bad';
}
