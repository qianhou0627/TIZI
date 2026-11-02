import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

const portAvailable = await new Promise((resolvePort) => {
  const server = createServer();
  server.once('error', () => resolvePort(false));
  server.listen(8788, '127.0.0.1', () => server.close(() => resolvePort(true)));
});
if (!portAvailable) {
  console.error('8788 端口已被占用，请打开 http://127.0.0.1:8788/admin 查看已有预览。');
  process.exit(1);
}

const cli = resolve('node_modules/wrangler/bin/wrangler.js');
const config = resolve('cloudflare/youyu-traffic/wrangler.toml');
const state = resolve('output/admin-preview-state');
const env = { ...process.env, XDG_CONFIG_HOME: resolve('output/wrangler-config') };
const base = ['--local', '--config', config, '--persist-to', state];
const init = spawnSync(
  process.execPath,
  [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--file', 'cloudflare/youyu-traffic/schema.sql'],
  {
    env,
    stdio: ['ignore', 'ignore', 'inherit']
  }
);
if (init.error || init.status !== 0) throw init.error ?? new Error('本地数据库初始化失败');
const inspect = spawnSync(
  process.execPath,
  [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--command', 'PRAGMA table_info(users)', '--json'],
  {
    env,
    encoding: 'utf8'
  }
);
if (inspect.error || inspect.status !== 0) throw inspect.error ?? new Error('本地数据库检查失败');
if (!JSON.parse(inspect.stdout)[0].results.some((column) => column.name === 'nickname')) {
  const migrate = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'youyu_traffic',
      ...base,
      '--command',
      'ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT NULL'
    ],
    {
      env,
      stdio: ['ignore', 'ignore', 'inherit']
    }
  );
  if (migrate.error || migrate.status !== 0) throw migrate.error ?? new Error('本地数据库迁移失败');
}
const inspectRules = spawnSync(
  process.execPath,
  [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--command', 'PRAGMA table_info(user_remote_config)', '--json'],
  { env, encoding: 'utf8' }
);
if (inspectRules.error || inspectRules.status !== 0) throw inspectRules.error ?? new Error('本地数据库检查失败');
if (!JSON.parse(inspectRules.stdout)[0].results.some((column) => column.name === 'managed_rule_profile')) {
  const migrate = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'youyu_traffic',
      ...base,
      '--command',
      'ALTER TABLE user_remote_config ADD COLUMN managed_rule_profile TEXT'
    ],
    { env, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  if (migrate.error || migrate.status !== 0) throw migrate.error ?? new Error('本地数据库迁移失败');
}

for (const [column, definition] of [
  ['hardware_info', 'TEXT'],
  ['access_status', "TEXT NOT NULL DEFAULT 'active'"]
]) {
  const inspect = spawnSync(
    process.execPath,
    [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--command', 'PRAGMA table_info(devices)', '--json'],
    { env, encoding: 'utf8' }
  );
  if (inspect.status !== 0) throw new Error('设备数据库检查失败');
  if (!JSON.parse(inspect.stdout)[0].results.some((item) => item.name === column)) {
    const migrate = spawnSync(
      process.execPath,
      [
        cli,
        'd1',
        'execute',
        'youyu_traffic',
        ...base,
        '--command',
        'ALTER TABLE devices ADD COLUMN ' + column + ' ' + definition
      ],
      { env, stdio: ['ignore', 'ignore', 'inherit'] }
    );
    if (migrate.status !== 0) throw new Error('设备数据库迁移失败');
  }
}

const periodColumns = spawnSync(
  process.execPath,
  [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--command', 'PRAGMA table_info(subscription_catalog)', '--json'],
  { env, encoding: 'utf8' }
);
if (periodColumns.status !== 0) throw new Error('订阅数据库检查失败');
if (!JSON.parse(periodColumns.stdout)[0].results.some((item) => item.name === 'started_at')) {
  const migration = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'youyu_traffic',
      ...base,
      '--command',
      'ALTER TABLE subscription_catalog ADD COLUMN started_at TEXT'
    ],
    { env, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  if (migration.status !== 0) throw new Error('订阅数据库迁移失败');
}
const modeColumns = spawnSync(
  process.execPath,
  [cli, 'd1', 'execute', 'youyu_traffic', ...base, '--command', 'PRAGMA table_info(user_remote_config)', '--json'],
  { env, encoding: 'utf8' }
);
if (modeColumns.status !== 0) throw new Error('配置数据库检查失败');
if (!JSON.parse(modeColumns.stdout)[0].results.some((item) => item.name === 'management_mode')) {
  const result = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'youyu_traffic',
      ...base,
      '--command',
      'ALTER TABLE user_remote_config ADD COLUMN management_mode TEXT'
    ],
    { env, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  if (result.status !== 0) throw new Error('配置数据库迁移失败');
}
const token = randomBytes(24).toString('hex');
console.log('管理端预览：http://127.0.0.1:8788/admin');
console.log('请保持此窗口打开，本地预览会自动登录。');
const child = spawn(
  process.execPath,
  [
    cli,
    'dev',
    'cloudflare/youyu-traffic/src/adminPreviewWorker.ts',
    ...base,
    '--ip',
    '127.0.0.1',
    '--port',
    '8788',
    '--live-reload',
    '--show-interactive-dev-session=false',
    '--var',
    `ADMIN_TOKEN:${token}`
  ],
  {
    env,
    stdio: 'inherit'
  }
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
