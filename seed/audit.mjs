import fs from 'node:fs';
import path from 'node:path';

const files = [
  'js/app.js', 'js/admin.js', 'js/store.js', 'js/firebase.js', 'js/ui.js', 'js/config.js',
  'js/games/quiz.js', 'js/games/registry.js', 'js/games/cards.js', 'js/games/mostlikely.js',
  'js/games/buzzer.js', 'js/games/whowrote.js', 'js/games/roulette.js', 'js/games/crocodile.js',
  'js/games/whoami.js', 'js/games/alias.js',
];

const exp = {};
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const names = new Set();
  let m;
  const re1 = /export\s+(?:const|function|let|var)\s+([A-Za-z0-9_]+)/g;
  while ((m = re1.exec(s))) names.add(m[1]);
  const re2 = /export\s*\{([^}]*)\}/g;
  while ((m = re2.exec(s))) {
    m[1].split(',').forEach((x) => {
      const n = x.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    });
  }
  exp[f] = names;
}

let problems = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /import\s*(?:\*\s*as\s*[A-Za-z0-9_]+|\{([^}]*)\})?\s*from\s*["'](\.[^"']+)["']/g;
  let m;
  while ((m = re.exec(s))) {
    const named = m[1];
    const rel = m[2];
    const target = path.normalize(path.join(path.dirname(f), rel)).split(path.sep).join('/');
    if (!named) continue;
    if (!exp[target]) { console.log(`? ${f}: target not tracked: ${rel}`); continue; }
    named.split(',').forEach((x) => {
      const n = x.trim().split(/\s+as\s+/)[0].trim();
      if (n && !exp[target].has(n)) {
        console.log(`MISSING: ${f} imports {${n}} from ${rel} — not exported by ${target}`);
        problems += 1;
      }
    });
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nВсе импорты сходятся с экспортами ✓');
