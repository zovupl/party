// Реестр мини-игр (кроме квизов, у которых свой движок).
import * as cards from './cards.js';
import * as mostlikely from './mostlikely.js';
import * as whowrote from './whowrote.js';
import * as roulette from './roulette.js';
import * as crocodile from './crocodile.js';
import * as whoami from './whoami.js';
import * as alias from './alias.js';

// «Угадай мелодию» теперь видео-игра (YouTube), отдельный баззер-модуль не нужен.
const modules = [mostlikely, cards, whowrote, crocodile, whoami, alias, roulette];

export const GAMES = {};      // type -> module { player, launch, controls }
export const GAME_LIST = [];  // [{ type, emoji, name, cat, module }]

for (const m of modules) {
  for (const meta of m.meta) {
    GAMES[meta.type] = m;
    GAME_LIST.push({ ...meta, module: m });
  }
}
