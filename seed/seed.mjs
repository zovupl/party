// Заливка контента в Firebase Realtime Database + создание админ-аккаунта.
//
// Запуск (PowerShell):   $env:ADMIN_PASSWORD="твой_пароль"; node seed/seed.mjs
// Запуск (bash):         ADMIN_PASSWORD="твой_пароль" node seed/seed.mjs
// Или короче:            node seed/seed.mjs твой_пароль
//
// Пароль НЕ хранится в коде и НЕ коммитится — его знаешь только ты (админ).
import { readFile } from 'node:fs/promises';
import { firebaseConfig, CONFIG } from '../js/config.js';

const password = process.env.ADMIN_PASSWORD || process.argv[2];
if (!password || password.length < 6) {
  console.error('❌ Укажи пароль админа (мин. 6 символов):');
  console.error('   node seed/seed.mjs твой_пароль');
  process.exit(1);
}

const API = firebaseConfig.apiKey;
const DB = firebaseConfig.databaseURL;
const email = CONFIG.adminEmail;

async function authAdmin() {
  // Пытаемся создать аккаунт; если уже есть — просто входим.
  const signUp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) },
  ).then((r) => r.json());

  if (signUp.idToken) {
    console.log(`✅ Админ создан: ${email}`);
    return signUp.idToken;
  }
  if (signUp.error && signUp.error.message === 'EMAIL_EXISTS') {
    const signIn = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }) },
    ).then((r) => r.json());
    if (signIn.idToken) { console.log(`✅ Вход админом: ${email}`); return signIn.idToken; }
    throw new Error('Аккаунт существует, но пароль неверный: ' + JSON.stringify(signIn.error));
  }
  throw new Error('Не удалось создать/войти админом: ' + JSON.stringify(signUp.error || signUp));
}

async function main() {
  const raw = await readFile(new URL('./content.json', import.meta.url), 'utf8');
  const content = JSON.parse(raw);

  let idToken = null;
  try {
    idToken = await authAdmin();
  } catch (e) {
    console.warn('⚠️  Auth не сработал (возможно, Email/Password ещё не включён в консоли).');
    console.warn('   ' + e.message);
    console.warn('   Заливаю контент без авторизации (сработает, пока БД в test mode).');
  }

  const url = `${DB}/content.json` + (idToken ? `?auth=${idToken}` : '');
  const res = await fetch(url, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Заливка не удалась (${res.status}): ${t}`);
  }
  const q = Object.keys(content.quizzes).length;
  console.log(`✅ Контент залит в ${DB}/content`);
  console.log(`   Квизов: ${q}, персонажей: ${content.characters.length}, слов «Крокодила»: ${
    content.crocodile.easy.length + content.crocodile.hard.length + content.crocodile.hardcore.length}`);
  console.log('🎉 Готово. Теперь можно ужесточить правила (database.rules.json).');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
