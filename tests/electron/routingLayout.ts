import { app, BrowserWindow } from 'electron';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, join, sep } from 'node:path';
import assert from 'node:assert/strict';

app.on('window-all-closed', () => undefined);
app.disableHardwareAcceleration();
void run();
async function run() {
  await app.whenReady();

  const root = resolve('docs/demo'),
    output = resolve('output/routing-ui');
  const server = createServer(async (req, res) => {
    try {
      const file = resolve(root, '.' + decodeURIComponent(new URL(req.url!, 'http://localhost').pathname));
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const mime: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.webp': 'image/webp'
      };
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address() as { port: number };
  const errors: string[] = [];
  let win: BrowserWindow | undefined;
  try {
    await app.whenReady();
    await mkdir(output, { recursive: true });
    win = new BrowserWindow({
      width: 900,
      height: 600,
      useContentSize: true,
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, offscreen: true }
    });
    win.webContents.on('console-message', (details) => {
      if (details.level === 'error') errors.push(details.message);
    });
    await win.loadURL(`http://127.0.0.1:${address.port}/index.html?mode=advanced&page=rules`);
    const js = <T = unknown>(code: string) => win!.webContents.executeJavaScript(code, true) as Promise<T>;
    const ready = async (selector: string) => {
      for (let i = 0; i < 60; i++) {
        if (await js(`!!document.querySelector(${JSON.stringify(selector)})`)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw Error('Missing ' + selector);
    };
    const click = (selector: string) => js(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const nav = async (text: string) => {
      await js(`[...document.querySelectorAll('nav button')].find(b=>b.textContent==='${text}').click()`);
      await new Promise((r) => setTimeout(r, 100));
    };
    const shot = async (name: string) => {
      await js(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      await new Promise((r) => setTimeout(r, 100));
      await writeFile(join(output, name), (await win!.webContents.capturePage()).toPNG());
    };
    await ready('.routing-table');
    assert.equal(await js(`document.querySelectorAll('.routing-table tbody tr').length`), 2);
    assert.equal(await js(`document.querySelector('.routing-table tbody').textContent.includes('oaistatic')`), false);
    assert.equal(await js(`document.querySelector('.routing-search').closest('.routing-top')!==null`), true);
    assert.equal(await js(`document.querySelector('.routing-scroll').clientHeight>300`), true);
    await shot('rules-900x600.png');
    await click('.routing-add');
    await ready('.routing-dialog[open]');
    await js(
      `{const p=document.querySelector('#routing-pattern');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(p,'example');p.dispatchEvent(new Event('input',{bubbles:true}));}`
    );
    await click('.routing-dialog button[type=submit]');
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(await js(`document.querySelectorAll('.routing-table tbody tr').length`), 3);
    await nav('节点');
    await ready('.node-routing-toolbar');
    assert.equal(
      await js(`getComputedStyle(document.querySelector('.node-list')).gridTemplateColumns.split(' ').length`),
      2
    );
    assert.equal(
      await js(`document.querySelectorAll('.node-flag svg').length===document.querySelectorAll('.node').length`),
      true
    );
    await shot('nodes-900x600.png');
    await click('.theme-trigger');
    await click('.theme-swatch[aria-label="软件选色：绿色"]');
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(await js(`document.documentElement.style.getPropertyValue('--accent')`), '#16745b');
    await shot('nodes-green-900x600.png');
    await win.loadURL(`http://127.0.0.1:${address.port}/index.html?mode=advanced&page=nodes`);
    await ready('.node-routing-toolbar');
    assert.equal(await js(`document.documentElement.style.getPropertyValue('--accent')`), '#16745b');
    await click('.theme-trigger');
    await click('.theme-swatch[aria-label="软件选色：蓝色"]');
    await click('.theme-trigger');
    await click('.node-routing-toolbar .rule-picker-trigger');
    await click('.node-routing-toolbar [role=option]:nth-child(2)');
    await new Promise((r) => setTimeout(r, 200));
    await nav('设置');
    await ready('.settings-panel');
    assert.equal(await js(`document.querySelector('.settings-select-value').textContent`), '智能规则+自定义规则');
    assert.equal(await js(`document.querySelectorAll('.settings-form-grid>.settings-row').length`), 6);
    await shot('settings-900x600.png');
    await nav('规则');
    await click('.routing-tabs button:nth-child(2)');
    await ready('.routing-logs');
    await shot('logs-900x600.png');
    for (const size of [
      [900, 600],
      [1000, 650]
    ]) {
      win.setContentSize(size[0], size[1]);
      await new Promise((r) => setTimeout(r, 80));
      const overflowing = await js<string[]>(
        `[...document.querySelectorAll('.routing-panel,.routing-top,.routing-tools,.routing-table')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className)`
      );
      assert.deepEqual(overflowing, [], `No overflow at ${size.join('x')}`);
    }
    assert.deepEqual(errors, []);
    console.log('Routing UI: rules CRUD, shared mode, original settings and compact layout passed');
    win.destroy();
    server.close();
    app.exit(0);
  } catch (error) {
    console.error(error);
    win?.destroy();
    server.close();
    app.exit(1);
  }
}
