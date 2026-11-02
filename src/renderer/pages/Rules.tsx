import { useEffect, useRef, useState } from 'react';
import type { AppSettingsInput, AppSnapshot, RuleLog } from '../../shared/ipc';
import {
  customRuleError,
  defaultCustomRules,
  ruleTargets,
  type CustomRule,
  type RuleTarget
} from '../../shared/routing';
import { RulePicker } from '../components/RulePicker';
import { isActionErrorMessage } from '../actionMessages';

const targetOptions = ruleTargets.map((value) => ({ value, label: value }));
const matchOptions = [{ value: 'regex', label: '正则匹配：包含内容的所有网站' }];
export function Rules({
  snapshot,
  busy,
  message,
  onSave
}: {
  snapshot: AppSnapshot;
  busy: boolean;
  message: string;
  onSave: (settings: AppSettingsInput) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<'custom' | 'logs'>('custom'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('全部');
  const [logs, setLogs] = useState<RuleLog[]>([]),
    [paused, setPaused] = useState(false),
    [logError, setLogError] = useState('');
  const [draft, setDraft] = useState<CustomRule>(),
    [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const rules = snapshot.customRules ?? defaultCustomRules;
  useEffect(() => {
    if (tab !== 'logs' || paused) return;
    let active = true,
      pending = false;
    const read = async () => {
      if (pending) return;
      pending = true;
      try {
        const next = await window.youyu!.getRuleLogs();
        if (active) {
          setLogs(next);
          setLogError('');
        }
      } catch {
        if (active) setLogError('日志读取失败，请稍后重试');
      } finally {
        pending = false;
      }
    };
    void read();
    const timer = setInterval(() => void read(), 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tab, paused]);
  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal();
  }, [draft]);
  function edit(rule?: CustomRule) {
    setError('');
    setDraft(rule ? { ...rule } : { id: crypto.randomUUID(), pattern: '', target: '智能规则' });
  }
  async function save(next: CustomRule[]) {
    return onSave({ customRules: next });
  }
  const query = search.toLowerCase();
  const shownRules = rules.filter((r) => `${r.name ?? ''} ${r.pattern} ${r.target}`.toLowerCase().includes(query));
  const shownLogs = logs.filter(
    (l) =>
      l.host.toLowerCase().includes(query) &&
      (filter === '全部' ||
        (filter === '拦截' && l.state === 'blocked') ||
        (filter === '失败' && l.state === 'failed') ||
        (filter === '直连' && l.route.includes('DIRECT')) ||
        (filter === '代理' && l.state !== 'blocked' && !l.route.includes('DIRECT')))
  );
  return (
    <div className="workspace fill-space routing-page">
      <section className="routing-panel">
        <div className="routing-top">
          <div className="routing-tabs" role="tablist" aria-label="规则">
            <button
              role="tab"
              aria-selected={tab === 'custom'}
              onClick={() => {
                setTab('custom');
                setSearch('');
              }}
            >
              自定义规则
            </button>
            <button
              role="tab"
              aria-selected={tab === 'logs'}
              onClick={() => {
                setTab('logs');
                setSearch('');
              }}
            >
              规则日志
            </button>
          </div>
          <div className="routing-tools">
            <input
              className="routing-search"
              aria-label={tab === 'custom' ? '搜索规则' : '搜索网站'}
              placeholder={tab === 'custom' ? '搜索规则' : '搜索网站'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {tab === 'logs' && (
              <RulePicker
                label="筛选日志"
                value={filter}
                options={['全部', '代理', '直连', '拦截', '失败'].map((value) => ({ value, label: value }))}
                onChange={setFilter}
              />
            )}
            <span className="routing-count">
              {tab === 'custom' ? shownRules.length : shownLogs.length} 条
              {tab === 'custom' && snapshot.ruleProfile === 'ruleset' ? ' · 未启用' : ''}
            </span>
            {tab === 'custom' ? (
              <button className="wide-button routing-add" disabled={busy} onClick={() => edit()}>
                添加
              </button>
            ) : (
              <>
                <button className="secondary-button" onClick={() => setPaused(!paused)}>
                  {paused ? '继续' : '暂停'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void window.youyu!.clearRuleLogs().then(
                      () => {
                        setLogs([]);
                        setLogError('');
                      },
                      () => setLogError('清空失败，请重试')
                    );
                  }}
                >
                  清空
                </button>
              </>
            )}
          </div>
        </div>
        <div className="routing-scroll">
          <table className={`routing-table ${tab === 'logs' ? 'routing-logs' : ''}`}>
            <colgroup>
              {(tab === 'custom' ? [42, 25, 33] : [13, 29, 25, 33]).map((w, i) => (
                <col key={i} style={{ width: `${w}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {(tab === 'custom' ? ['匹配内容', '匹配方式', '节点'] : ['时间', '网站', '匹配规则', '实际去向']).map(
                  (t) => (
                    <th key={t}>{t}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {tab === 'custom'
                ? shownRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="routing-name">{rule.name || rule.pattern}</td>
                      <td>
                        <div className="routing-match">
                          <RulePicker
                            label="匹配方式"
                            value="regex"
                            options={matchOptions}
                            onChange={() => undefined}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="routing-target">
                          <RulePicker
                            label={`节点：${rule.name || rule.pattern}`}
                            value={rule.target}
                            options={targetOptions}
                            disabled={busy}
                            onChange={(target) => {
                              void save(rules.map((r) => (r.id === rule.id ? { ...r, target } : r)));
                            }}
                          />
                          <RulePicker
                            label="更多操作"
                            value=""
                            options={[
                              { value: 'edit', label: '编辑' },
                              { value: 'delete', label: '删除' }
                            ]}
                            className="routing-more"
                            disabled={busy}
                            onChange={(value) => {
                              if (value === 'edit') edit(rule);
                              else void save(rules.filter((r) => r.id !== rule.id));
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                : shownLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="routing-time">
                        {new Date(log.time).toLocaleTimeString('zh-CN', { hour12: false })}
                      </td>
                      <td>{log.host}</td>
                      <td>{log.rule}</td>
                      <td>
                        <details>
                          <summary>
                            <span>
                              {log.route}
                              <span className={`routing-log-state ${log.state}`}>
                                {log.state === 'blocked' ? '已拦截' : log.state === 'failed' ? '连接失败' : '已路由'}
                              </span>
                            </span>
                          </summary>
                          <p>
                            {log.host} → {log.rule} → {log.route}
                            {log.state === 'failed' ? '；连接失败，具体原因未知' : ''}
                          </p>
                        </details>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!(tab === 'custom' ? shownRules.length : shownLogs.length) && (
            <div className="empty">
              {search
                ? '换个关键词搜索'
                : tab === 'custom'
                  ? '添加一条规则'
                  : snapshot.status === 'running'
                    ? '访问网站后查看路由记录'
                    : '启动后查看路由记录'}
            </div>
          )}
        </div>
        <p className="routing-message" role="status">
          {tab === 'logs' ? logError : message}
        </p>
      </section>
      <dialog
        ref={dialog}
        className="routing-dialog"
        onCancel={() => setDraft(undefined)}
        onClose={() => setDraft(undefined)}
        aria-labelledby="routing-dialog-title"
      >
        {draft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = rules.some((r) => r.id === draft.id)
                ? rules.map((r) => (r.id === draft.id ? draft : r))
                : [...rules, draft];
              const invalid = customRuleError(next);
              if (invalid) {
                setError(invalid);
                return;
              }
              void save(next).then((ok) => {
                if (ok) dialog.current?.close();
              });
            }}
          >
            <h2 id="routing-dialog-title">{rules.some((r) => r.id === draft.id) ? '编辑规则' : '添加规则'}</h2>
            <label htmlFor="routing-pattern">匹配内容</label>
            <input
              id="routing-pattern"
              autoFocus
              value={draft.pattern}
              onChange={(e) => {
                setDraft({ ...draft, pattern: e.target.value });
                setError('');
              }}
              maxLength={512}
            />
            <label>匹配方式</label>
            <div className="routing-match">
              <RulePicker label="匹配方式" value="regex" options={matchOptions} onChange={() => undefined} />
            </div>
            <label>节点</label>
            <RulePicker
              label="节点"
              value={draft.target}
              options={targetOptions}
              onChange={(target) => setDraft({ ...draft, target: target as RuleTarget })}
            />
            <p role="alert">{error || (isActionErrorMessage(message) ? message : '')}</p>
            <footer>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => dialog.current?.close()}
              >
                取消
              </button>
              <button type="submit" className="wide-button" disabled={busy}>
                {busy ? '保存中' : '保存'}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </div>
  );
}
