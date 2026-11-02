import { assertOnlyFields, HttpError, json, readJsonObjectWithLimit } from './http';

type Env = { DB: D1Database };
type SubscriptionRow = { id: string; url: string; updated_at: string };

function safeUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new HttpError(400, 'invalid subscription url');
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes('.') ||
      host.endsWith('.local') ||
      host.endsWith('.localhost') ||
      /^[\d.]+$/.test(host) ||
      host.includes(':')
    ) {
      throw new Error('unsafe URL');
    }
    return url.href;
  } catch {
    throw new HttpError(400, 'invalid subscription url');
  }
}

function textField(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string') throw new HttpError(400, 'invalid subscription field');
  const text = value.trim();
  if (
    (required && !text) ||
    text.length > max ||
    Array.from(text).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  ) {
    throw new HttpError(400, 'invalid subscription field');
  }
  return text;
}

export async function listSubscriptions(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT s.id, s.name, s.category, s.url, s.note,
    s.upload_bytes AS uploadBytes, s.download_bytes AS downloadBytes, s.total_bytes AS totalBytes,
    s.expires_at AS expiresAt, s.synced_at AS syncedAt,
    (SELECT COUNT(*) FROM users u LEFT JOIN user_remote_config c ON c.user_id = u.id
      LEFT JOIN remote_config g ON g.id = 1
      WHERE u.status = 'active' AND u.merged_into_user_id IS NULL
        AND COALESCE(c.enabled, g.enabled, 1) = 1
        AND COALESCE(NULLIF(TRIM(c.subscription_url), ''), NULLIF(TRIM(g.subscription_url), '')) = s.url) AS userCount
    FROM subscription_catalog s ORDER BY s.name COLLATE NOCASE, s.id`
  ).all();
  const categories = await env.DB.prepare('SELECT name FROM subscription_categories ORDER BY name COLLATE NOCASE').all<{
    name: string;
  }>();
  return json({ subscriptions: rows.results, categories: categories.results.map((row) => row.name) });
}

export async function updateSubscriptionCategory(request: Request, env: Env): Promise<Response> {
  const input = await readJsonObjectWithLimit(request, 4096);
  assertOnlyFields(input, ['action', 'name', 'newName'], 'unsupported category field');
  const name = textField(input.name, 80, true);
  if (input.action === 'rename') {
    const next = textField(input.newName, 80, true);
    if (next === name) return json({ ok: true });
    try {
      const results = await env.DB.batch([
        env.DB.prepare('UPDATE subscription_categories SET name = ? WHERE name = ?').bind(next, name),
        env.DB.prepare('UPDATE subscription_catalog SET category = ? WHERE category = ?').bind(next, name)
      ]);
      if (!results[0].meta.changes) throw new HttpError(404, 'unknown category');
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message))
        throw new HttpError(409, 'category exists');
      throw error;
    }
  } else if (input.action === 'delete') {
    const result = await env.DB.prepare(
      'DELETE FROM subscription_categories WHERE name = ? AND NOT EXISTS (SELECT 1 FROM subscription_catalog WHERE category = ?)'
    )
      .bind(name, name)
      .run();
    if (!result.meta.changes) {
      const exists = await env.DB.prepare('SELECT name FROM subscription_categories WHERE name = ?').bind(name).first();
      throw new HttpError(exists ? 409 : 404, exists ? 'category in use' : 'unknown category');
    }
  } else {
    throw new HttpError(400, 'invalid category action');
  }
  return json({ ok: true });
}

export async function saveSubscription(request: Request, env: Env, id?: string): Promise<Response> {
  const input = await readJsonObjectWithLimit(request, 8192);
  assertOnlyFields(input, ['name', 'category', 'url', 'note'], 'unsupported subscription field');
  const name = textField(input.name, 120, true);
  const category = textField(input.category, 80, true);
  const url = safeUrl(input.url);
  const note = textField(input.note ?? '', 1000);
  const now = new Date().toISOString();
  const subscriptionId = id ?? crypto.randomUUID();
  try {
    if (id && !(await env.DB.prepare('SELECT id FROM subscription_catalog WHERE id = ?').bind(id).first())) {
      throw new HttpError(404, 'unknown subscription');
    }
    const categoryStatement = env.DB.prepare('INSERT OR IGNORE INTO subscription_categories (name) VALUES (?)').bind(
      category
    );
    if (id) {
      const update = env.DB.prepare(
        `UPDATE subscription_catalog SET name = ?, category = ?, note = ?,
        upload_bytes = CASE WHEN url <> ? THEN NULL ELSE upload_bytes END,
        download_bytes = CASE WHEN url <> ? THEN NULL ELSE download_bytes END,
        total_bytes = CASE WHEN url <> ? THEN NULL ELSE total_bytes END,
        expires_at = CASE WHEN url <> ? THEN NULL ELSE expires_at END,
        synced_at = CASE WHEN url <> ? THEN NULL ELSE synced_at END, url = ?, updated_at = ? WHERE id = ?`
      ).bind(name, category, note, url, url, url, url, url, url, now, id);
      await env.DB.batch([categoryStatement, update]);
    } else {
      const insert = env.DB.prepare(
        'INSERT INTO subscription_catalog (id, name, category, url, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(subscriptionId, name, category, url, note, now, now);
      await env.DB.batch([categoryStatement, insert]);
    }
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message))
      throw new HttpError(409, 'subscription exists');
    throw error;
  }
  return json({ ok: true, id: subscriptionId });
}

export function parseSubscriptionUsage(value: string | null) {
  if (!value) throw new HttpError(502, 'subscription usage unavailable');
  const fields = new Map<string, number>();
  for (const part of value.split(';')) {
    const match = /^\s*(upload|download|total|expire)\s*=\s*(\d+)\s*$/i.exec(part);
    if (!match) continue;
    const number = Number(match[2]);
    if (!Number.isSafeInteger(number)) throw new HttpError(502, 'invalid subscription usage');
    fields.set(match[1].toLowerCase(), number);
  }
  if (!fields.has('upload') || !fields.has('download') || !fields.has('total')) {
    throw new HttpError(502, 'subscription usage unavailable');
  }
  const expire = fields.get('expire');
  const date = expire ? new Date(expire * 1000) : null;
  if (date && !Number.isFinite(date.getTime())) throw new HttpError(502, 'invalid subscription usage');
  return {
    upload: fields.get('upload')!,
    download: fields.get('download')!,
    total: fields.get('total')!,
    expiresAt: date?.toISOString() ?? null
  };
}

export async function syncSubscription(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT id, url, updated_at FROM subscription_catalog WHERE id = ?')
    .bind(id)
    .first<SubscriptionRow>();
  if (!row) throw new HttpError(404, 'unknown subscription');
  let url = safeUrl(row.url);
  let response: Response;
  const signal = AbortSignal.timeout(10000);
  for (let redirects = 0; ; redirects++) {
    try {
      response = await fetch(url, { method: 'GET', redirect: 'manual', signal });
    } catch {
      throw new HttpError(502, 'subscription sync failed');
    }
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    await response.body?.cancel().catch(() => undefined);
    if (!location || redirects >= 3) throw new HttpError(502, 'subscription sync failed');
    try {
      url = safeUrl(new URL(location, url).href);
    } catch {
      throw new HttpError(502, 'subscription sync failed');
    }
  }
  const header = response.headers.get('subscription-userinfo');
  await response.body?.cancel().catch(() => undefined);
  if (!response.ok) throw new HttpError(502, 'subscription sync failed');
  const usage = parseSubscriptionUsage(header);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE subscription_catalog SET upload_bytes = ?, download_bytes = ?, total_bytes = ?,
    expires_at = ?, synced_at = ? WHERE id = ? AND url = ? AND updated_at = ?`
  )
    .bind(usage.upload, usage.download, usage.total, usage.expiresAt, now, id, row.url, row.updated_at)
    .run();
  if (!result.meta.changes) throw new HttpError(409, 'subscription changed');
  return json({ ok: true });
}
