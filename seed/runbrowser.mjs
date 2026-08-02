// Прогон реального графа модулей в Node с заглушками DOM/Firebase.
import { register } from 'node:module';
register('./hook.mjs', import.meta.url);

function makeEl(tag = 'div') {
  const node = {
    tagName: tag, nodeType: 1, isConnected: true, id: '', innerHTML: '', textContent: '',
    _children: [], style: {}, firstChild: null, disabled: false,
    classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); }, remove(...c) { c.forEach((x) => this._s.delete(x)); }, toggle(c, f) { if (f) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, addEventListener() {}, removeEventListener() {},
    append(...ch) { ch.forEach((c) => { const n = (c && c.nodeType) ? c : document.createTextNode(String(c)); this._children.push(n); if (!this.firstChild) this.firstChild = n; }); },
    appendChild(c) { this.append(c); return c; }, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    get children() { return this._children; },
  };
  return node;
}

const appNode = makeEl('div'); appNode.id = 'app';
globalThis.document = {
  createElement: (t) => makeEl(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  getElementById: (id) => (id === 'app' ? appNode : null),
  addEventListener() {}, body: makeEl('body'),
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { vibrate() {} }, configurable: true }); } catch (_) {}
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.requestAnimationFrame = (cb) => { try { cb(1); } catch (e) { throw e; } return 1; };
globalThis.performance = { now: () => 0 };
globalThis.innerWidth = 800; globalThis.innerHeight = 600;
globalThis.addEventListener = () => {};

try {
  await import('../js/app.js');
  await new Promise((r) => setTimeout(r, 50));
  console.log('✅ Граф модулей загрузился и первый render() отработал без исключений.');
} catch (e) {
  console.log('❌ ОШИБКА при загрузке/рендере:\n');
  console.log(e && e.stack ? e.stack : e);
  process.exit(2);
}
