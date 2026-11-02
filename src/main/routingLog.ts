import type { RuleLog } from '../shared/ipc';

export class RoutingLogStore {
  private entries: RuleLog[] = [];
  private sequence = 0;
  append(raw: string): boolean {
    let message = raw.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
    const quoted = message.match(/\bmsg=("(?:\\.|[^"\\])*")/);
    if (quoted) {
      try {
        message = JSON.parse(quoted[1]) as string;
      } catch {
        return false;
      }
    }
    const destination = message.match(/(?:-->|->)\s+(\[[^\]]+\]|[^\s:]+):\d+/)?.[1];
    if (!destination || !/\[(TCP|UDP)\]/.test(message)) return false;
    const matched = message.match(/match\s+(.+?)\s+using\s+(.+)$/i);
    const failed = /dial .*error|connect.*(?:failed|timeout)|i\/o timeout/i.test(message);
    if (!matched && !failed) return false;
    const route = matched?.[2]?.trim() || '未知出口';
    const state = /REJECT|REJECT-DROP/.test(route) ? 'blocked' : failed ? 'failed' : 'routed';
    const entry: RuleLog = {
      id: ++this.sequence,
      time: new Date().toISOString(),
      host: destination,
      rule: matched?.[1] ?? '未取得匹配规则',
      route: state === 'blocked' ? '本机拦截，无出口节点' : route,
      state
    };
    const last = this.entries.at(-1);
    if (
      last &&
      last.host === entry.host &&
      last.rule === entry.rule &&
      last.route === entry.route &&
      Date.now() - Date.parse(last.time) < 250
    )
      return true;
    this.entries.push(entry);
    if (this.entries.length > 500) this.entries.shift();
    return true;
  }
  read(): RuleLog[] {
    this.entries = this.entries.filter((entry) => Date.now() - Date.parse(entry.time) < 10 * 60_000);
    return [...this.entries].reverse();
  }
  clear(): void {
    this.entries = [];
  }
}
export const routingLogStore = new RoutingLogStore();
