// Запускает headless Chrome, открывает сайт через CDP и снимает
// исключения консоли + итоговый #app. Node 24 (global fetch + WebSocket).
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] || 'https://zovupl.github.io/party/?t=' + Math.floor(Math.random() * 1e9);
const PORT = 9222;

const child = spawn(CHROME, [
  '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=C:/Users/matsv/AppData/Local/Temp/claude/cdpprof-${Math.floor(Math.random() * 1e9)}`,
  'about:blank',
], { detached: false, stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await fetch(`http://localhost:${PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('CDP не поднялся');
}

const errors = [];
const logs = [];

async function main() {
  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));

  await new Promise((res) => { ws.onopen = res; });

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      const ex = d.exception || {};
      errors.push((ex.description || d.text || 'exception') + (d.url ? `\n  @ ${d.url}:${d.lineNumber}` : ''));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      logs.push('console.error: ' + m.params.args.map((a) => a.value || a.description || '').join(' '));
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry;
      if (e.level === 'error') logs.push(`log(${e.source}): ${e.text}${e.url ? ' @ ' + e.url : ''}`);
    }
  };

  send('Runtime.enable');
  send('Log.enable');
  send('Page.enable');
  send('Network.enable');
  send('Network.setCacheDisabled', { cacheDisabled: true });
  await sleep(200);
  send('Page.navigate', { url: URL });
  await sleep(9000);

  // Снять #app
  const evalId = ++id;
  ws.send(JSON.stringify({ id: evalId, method: 'Runtime.evaluate',
    params: { expression: "document.getElementById('app') ? document.getElementById('app').innerHTML.slice(0,1200) : 'NO #app'", returnByValue: true } }));
  const appHtml = await new Promise((res) => {
    const h = (ev) => { const m = JSON.parse(ev.data); if (m.id === evalId) { ws.removeEventListener('message', h); res(m.result && m.result.result && m.result.result.value); } };
    ws.addEventListener('message', h);
  });

  console.log('=== EXCEPTIONS (' + errors.length + ') ===');
  errors.forEach((e) => console.log(e, '\n'));
  console.log('=== ERROR LOGS (' + logs.length + ') ===');
  logs.forEach((l) => console.log(l));
  console.log('\n=== #app innerHTML (first 1200) ===');
  console.log(appHtml);

  ws.close();
  child.kill();
  process.exit(0);
}

main().catch((e) => { console.error('runner error:', e.message); child.kill(); process.exit(1); });
