// ==========================================================================
//  НАСТРОЙКИ ВЕЧЕРИНКИ — меняй здесь
// ==========================================================================

export const CONFIG = {
  // --- Имена игроков (ровно те, что появятся на экране выбора) ---
  players: ['Митя', 'Марина', 'Саша', 'Полина', 'Маша', 'Томаш'],

  // --- Админ ---
  // Email фиксирован (он НЕ секретный, может лежать в исходниках).
  // Пароль админа НИГДЕ в коде не хранится — ты вводишь его на экране входа.
  // Это и есть защита контента: игроки пароля не знают → базу вопросов не прочитают.
  adminEmail: 'admin@zovu.pl',

  // --- Квизы ---
  quizTime: 20,          // секунд на вопрос
  quizBasePoints: 100,   // базовые очки за правильный ответ
  quizSpeedBonus: 100,   // максимальный бонус за скорость

  // --- Прочее ---
  crocodileTime: 75,     // секунд на раунд «Крокодил» / «Кто я»
  aliasTime: 60,         // секунд на раунд «Алиас»
};

// Конфиг Firebase (из ТЗ). Analytics намеренно НЕ подключаем.
export const firebaseConfig = {
  apiKey: 'AIzaSyD_MU0aAr2n8ILtfDO6TQTnvpCHmnuhdaE',
  authDomain: 'party-app-18f63.firebaseapp.com',
  databaseURL: 'https://party-app-18f63-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'party-app-18f63',
  storageBucket: 'party-app-18f63.firebasestorage.app',
  messagingSenderId: '261649786039',
  appId: '1:261649786039:web:8267d5ef5c4c8231c0d932',
};
