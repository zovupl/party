// Мелкие помощники для DOM / анимаций.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Создать элемент: el('button.big#go', {onclick}, ['текст'])
export function el(spec, props = {}, children = []) {
  const [tag, ...rest] = spec.split(/(?=[.#])/);
  const node = document.createElement(tag || 'div');
  for (const token of rest) {
    if (token[0] === '.') node.classList.add(token.slice(1));
    else if (token[0] === '#') node.id = token.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Отрисовать экран в #app с плавным появлением.
export function mount(node) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  node.classList.add('screen');
  app.append(node);
  requestAnimationFrame(() => node.classList.add('screen--in'));
}

export function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

export function toast(msg) {
  const t = el('.toast', { text: msg });
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('toast--in'));
  setTimeout(() => { t.classList.remove('toast--in'); setTimeout(() => t.remove(), 300); }, 2200);
}

// Конфетти без библиотек.
export function confetti(durationMs = 4000) {
  const cvs = el('canvas.confetti');
  document.body.append(cvs);
  const ctx = cvs.getContext('2d');
  const resize = () => { cvs.width = innerWidth; cvs.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const colors = ['#ff2e97', '#7a5cff', '#00e5ff', '#ffd166', '#06ffa5'];
  const N = 160;
  const parts = Array.from({ length: N }, () => ({
    x: Math.random() * cvs.width,
    y: -20 - Math.random() * cvs.height,
    r: 4 + Math.random() * 7,
    c: colors[(Math.random() * colors.length) | 0],
    vy: 2 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
  }));
  const start = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > cvs.height + 20) { p.y = -20; p.x = Math.random() * cvs.width; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (now - start < durationMs) requestAnimationFrame(frame);
    else { removeEventListener('resize', resize); cvs.remove(); }
  })(start);
}

// Таблица лидеров как DOM-узел.
export function leaderboardNode(scores, opts = {}) {
  const rows = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  const wrap = el('.leaderboard');
  if (opts.title) wrap.append(el('h2.lb-title', { text: opts.title }));
  const list = el('.lb-list');
  rows.forEach(([name, pts], i) => {
    const row = el('.lb-row', { style: `animation-delay:${i * 80}ms` }, [
      el('.lb-rank', { text: medals[i] || `${i + 1}` }),
      el('.lb-name', { text: name }),
      el('.lb-pts', { text: `${pts}` }),
    ]);
    if (i === 0 && rows.length > 1) row.classList.add('lb-row--first');
    list.append(row);
  });
  if (!rows.length) list.append(el('.lb-empty', { text: 'Пока нет очков' }));
  wrap.append(list);
  return wrap;
}

export const fmtTime = (s) => `${Math.max(0, Math.ceil(s))}`;

// Обратный отсчёт как DOM-узел (бар + число), сам останавливается при отключении.
export function countdownNode(startedAt, totalSec) {
  const wrap = el('.countdown');
  const bar = el('.timer-bar', {}, [el('.timer-fill')]);
  const num = el('.cd-num');
  wrap.append(bar, num);
  const total = totalSec * 1000;
  const tick = () => {
    if (!wrap.isConnected) return;
    const left = Math.max(0, total - (Date.now() - startedAt));
    num.textContent = left > 0 ? `${Math.ceil(left / 1000)} сек` : '⏰ Время!';
    bar.firstChild.style.width = `${(left / total) * 100}%`;
    if (left > 0) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return wrap;
}
