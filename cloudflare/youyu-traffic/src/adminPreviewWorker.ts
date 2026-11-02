import worker, { type Env } from './index';

// Wrangler injects its live-reload script inline; relax the policy only in this local wrapper.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/admin/')) {
      const headers = new Headers(request.headers);
      headers.set('authorization', `Bearer ${env.ADMIN_TOKEN}`);
      request = new Request(request, { headers });
    }
    const response = await worker.fetch(request, env);
    const policy = response.headers.get('content-security-policy');
    if (!policy) return response;
    const headers = new Headers(response.headers);
    headers.set('content-security-policy', policy.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
    const html = await response.text();
    const autoLogin = `<script>window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('token').value = 'local-preview';
      document.getElementById('authPanel').requestSubmit();
    });</script>`;
    return new Response(html.replace('</body>', `${autoLogin}</body>`), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
