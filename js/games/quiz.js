// Квиз — экран игрока. Единый движок для всех 5 квизов.
import { el, vibrate } from '../ui.js';
import { submitAnswer } from '../store.js';

const LETTERS = ['А', 'Б', 'В', 'Г'];
const SHAPES = ['🔺', '🔷', '🟡', '🟢'];

// Запомненные ответы игрока по раундам, чтобы не пере-голосовать.
const myChoices = {};

export function playerQuizView(state, ctx) {
  const g = state.activeGame;
  const wrap = el('.game.quiz');

  wrap.append(el('.quiz-head', {}, [
    el('.quiz-badge', { text: `${g.emoji || '❓'} ${g.title}` }),
    el('.quiz-progress', { text: `Вопрос ${g.qIndex + 1} из ${g.questionCount}` }),
  ]));

  wrap.append(el('h2.quiz-q', { text: g.question.text }));

  const revealed = g.phase === 'reveal' && g.reveal;
  const myChoice = myChoices[g.roundId];

  if (g.phase === 'question') {
    const bar = el('.timer-bar', {}, [el('.timer-fill#tfill')]);
    wrap.append(bar);
    startTimer(wrap, g);
  }

  const opts = el('.quiz-opts');
  g.question.options.forEach((text, i) => {
    const btn = el('button.opt', {
      onclick: () => {
        if (g.phase !== 'question' || myChoices[g.roundId] != null) return;
        myChoices[g.roundId] = i;
        submitAnswer(g.roundId, ctx.myName, i);
        vibrate(30);
        rerenderSelection(opts, i);
        showAccepted(wrap);
      },
    }, [
      el('.opt-mark', { text: revealed ? SHAPES[i] : LETTERS[i] }),
      el('.opt-text', { text }),
    ]);
    if (myChoice === i) btn.classList.add('opt--mine');
    if (revealed) {
      if (i === g.reveal.correctIndex) btn.classList.add('opt--correct');
      else if (myChoice === i) btn.classList.add('opt--wrong');
      if (g.reveal.counts) {
        btn.append(el('.opt-count', { text: `${g.reveal.counts[i] || 0}` }));
      }
    }
    opts.append(btn);
  });
  wrap.append(opts);

  if (revealed) {
    const ok = myChoice === g.reveal.correctIndex;
    wrap.append(el(`.quiz-result.${ok ? 'ok' : 'no'}`, {
      text: myChoice == null ? 'Ты не успел ответить 😬' : ok ? 'Верно! 🎉' : 'Мимо 😅',
    }));
  } else if (myChoice != null) {
    showAccepted(wrap);
  }

  return wrap;
}

function rerenderSelection(opts, i) {
  [...opts.children].forEach((b, idx) => b.classList.toggle('opt--mine', idx === i));
}

function showAccepted(wrap) {
  if (wrap.querySelector('.quiz-accepted')) return;
  wrap.append(el('.quiz-accepted', { text: 'Ответ принят ✔ Ждём остальных…' }));
}

function startTimer(wrap, g) {
  const total = (g.totalTime || 20) * 1000;
  const tick = () => {
    const fill = wrap.querySelector('#tfill');
    if (!fill || !fill.isConnected) return;
    const left = Math.max(0, total - (Date.now() - g.startedAt));
    fill.style.width = `${(left / total) * 100}%`;
    if (left <= 0) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
