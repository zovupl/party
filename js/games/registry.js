// Реестр мини-игр (кроме квизов, у которых свой движок).
import * as cards from './cards.js';
import * as mostlikely from './mostlikely.js';
import * as buzzer from './buzzer.js';
import * as whowrote from './whowrote.js';

const modules = [buzzer, mostlikely, cards, whowrote];

export const GAMES = {};      // type -> module { player, launch, controls }
export const GAME_LIST = [];  // [{ type, emoji, name, cat, module }]

for (const m of modules) {
  for (const meta of m.meta) {
    GAMES[meta.type] = m;
    GAME_LIST.push({ ...meta, module: m });
  }
}
