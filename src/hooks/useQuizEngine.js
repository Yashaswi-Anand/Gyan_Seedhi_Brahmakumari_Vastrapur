/* Quiz engine: question flow, timer, lifelines and scoring.
   Scoring per question: right on 1st try = full marks, 2nd try = half, later = 0, timeout = 0.
   Chart (self-check) questions score whatever the person enters (0 up to the question's own marks, 10 or 20). */
import { useEffect, useReducer, useState } from 'react';
import { maxMarks, POINTS_PER_QUESTION as PERQ, TIME_LIMIT as TLIM } from '@/constants/config';
import { shuffle } from '@/utils/helpers';

const MSG_RETRY = 'फिर से कोशिश करें। शान्ति से सोचकर दूसरा उत्तर चुनें।';
const MSG_PICK_LEFT = 'पहले बायीं ओर से एक शब्द छुएँ।';
const MSG_WRONG_PAIR = 'फिर से कोशिश करें। यह जोड़ी सही नहीं है।';

const award = (wrongs) => (wrongs === 0 ? PERQ : wrongs === 1 ? Math.round(PERQ / 2) : 0);

/** Fresh per-question state. Randomness lives here (outside the reducer). */
function makeQuestionState(question) {
  return {
    start: Date.now(),
    done: false,
    leftAt: null,
    sel: null,
    struck: [],
    removed: [],
    hint: false,
    msg: '',
    wrongs: 0,
    order: question.opts ? shuffle(question.opts.map((_, k) => k)) : null,
    // self-check
    sv: null,
    sraw: '',
    sbad: false,
    // match
    mL: null,
    matched: [],
    mistakes: 0,
    flash: null,
    rightOrder: question.type === 'match' ? shuffle(question.pairs.map((_, k) => k)) : null,
  };
}

function finishQuestion(state, wrongs, timeout, now) {
  const { q, game } = state;
  const question = game.qs[game.i];
  const elapsed = (now - q.start) / 1000;
  const res = game.res.slice();
  res[game.i] = {
    pts: timeout ? 0 : award(wrongs),
    first: !timeout && wrongs === 0,
    time: timeout ? TLIM : Math.min(TLIM, Math.round(elapsed)),
    timeout: !!timeout,
    wrong: q.struck.slice(), // options picked before the right one (for the day's answer review)
  };
  return {
    ...state,
    game: { ...game, res },
    q: {
      ...q,
      done: true,
      leftAt: timeout ? 0 : Math.max(0, TLIM - elapsed),
      matched: question.type === 'match' && timeout ? question.pairs.map((_, k) => k) : q.matched,
    },
  };
}

function reducer(state, a) {
  const { q, game } = state;
  const question = game.qs[game.i];
  switch (a.type) {
    case 'pick':
      if (q.done) return state;
      return { ...state, q: { ...q, sel: a.k, msg: '' } };

    case 'lock': {
      if (q.done) return state;
      if (question.type === 'self') {
        if (q.sv == null) return state;
        const elapsed = (a.now - q.start) / 1000;
        const res = game.res.slice();
        res[game.i] = { pts: q.sv, first: q.sv === maxMarks(question), time: Math.min(TLIM, Math.round(elapsed)), timeout: false, mode: 'num' };
        return { ...state, game: { ...game, res }, q: { ...q, done: true, leftAt: Math.max(0, TLIM - elapsed) } };
      }
      if (q.sel == null) return state;
      if (q.sel === question.ans) return finishQuestion(state, q.wrongs, false, a.now);
      return { ...state, q: { ...q, wrongs: q.wrongs + 1, struck: [...q.struck, q.sel], sel: null, msg: MSG_RETRY } };
    }

    case 'fifty': {
      if (!game.fifty || q.done || !a.remove?.length) return state;
      return {
        ...state,
        game: { ...game, fifty: false },
        q: { ...q, removed: [...q.removed, ...a.remove], sel: a.remove.includes(q.sel) ? null : q.sel },
      };
    }

    case 'hint':
      if (!game.hint || q.done) return state;
      return { ...state, game: { ...game, hint: false }, q: { ...q, hint: true } };

    case 'selfInput':
      if (q.done) return state;
      return { ...state, q: { ...q, sraw: a.raw, sbad: a.bad, sv: a.sv } };

    case 'matchLeft':
      if (q.done) return state;
      return { ...state, q: { ...q, mL: a.k, flash: null } };

    case 'matchRight': {
      if (q.done) return state;
      if (q.mL == null) return { ...state, q: { ...q, msg: MSG_PICK_LEFT, flash: null } };
      const r = q.rightOrder[a.pos];
      if (r === q.mL) {
        const next = { ...state, q: { ...q, matched: [...q.matched, r], mL: null, msg: '', flash: null } };
        return next.q.matched.length === question.pairs.length
          ? finishQuestion(next, q.mistakes, false, a.now)
          : next;
      }
      return { ...state, q: { ...q, mistakes: q.mistakes + 1, flash: a.pos, msg: MSG_WRONG_PAIR } };
    }

    case 'timeout':
      if (q.done || state.quit) return state;
      return finishQuestion(state, q.wrongs || q.mistakes, true, a.now);

    case 'next':
      return { ...state, game: { ...game, i: game.i + 1 }, q: a.q };

    case 'quitAsk':
      return { ...state, quit: true, pauseAt: a.now };

    case 'quitNo':
      return {
        ...state,
        quit: false,
        q: !q.done && state.pauseAt ? { ...q, start: q.start + (a.now - state.pauseAt) } : q,
      };

    default:
      return state;
  }
}

/**
 * @param questions  the day's question list
 * @param practice   true when today's score is already saved (replay for practice)
 */
export function useQuizEngine(questions, practice) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    game: { qs: questions, i: 0, res: [], practice, fifty: true, hint: true },
    q: makeQuestionState(questions[0]),
    quit: false,
    pauseAt: null,
  }));
  const [now, setNow] = useState(Date.now);

  const { game, q, quit } = state;
  const question = game.qs[game.i];
  const timeLeft = q.done ? q.leftAt : Math.min(TLIM, Math.max(0, TLIM - (now - q.start) / 1000));

  // Tick every 250 ms while the question is open and the quit sheet is not showing.
  useEffect(() => {
    if (q.done || quit) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (TLIM - (t - q.start) / 1000 <= 0) dispatch({ type: 'timeout', now: t });
    }, 250);
    return () => clearInterval(id);
  }, [q.done, q.start, quit]);

  const actions = {
    pick: (k) => dispatch({ type: 'pick', k }),
    lock: () => dispatch({ type: 'lock', now: Date.now() }),
    // 50:50 leaves the right answer and one wrong one: 4 options lose 2, 3 options lose 1
    // (wrong answers already tried count as gone)
    fifty: () => {
      if (!question.opts || question.opts.length < 3) return;
      const c = question.opts
        .map((_, k) => k)
        .filter((k) => k !== question.ans && !q.removed.includes(k) && !q.struck.includes(k));
      if (c.length < 2) return;
      dispatch({ type: 'fifty', remove: shuffle(c).slice(0, c.length - 1) });
    },
    hint: () => dispatch({ type: 'hint' }),
    selfInput: (value) => {
      const raw = String(value).replace(/\D/g, '').slice(0, 2);
      const n = raw === '' ? null : parseInt(raw, 10);
      const ok = n != null && n >= 0 && n <= maxMarks(question);
      dispatch({ type: 'selfInput', raw, bad: raw !== '' && !ok, sv: ok ? n : null });
    },
    matchLeft: (k) => dispatch({ type: 'matchLeft', k }),
    matchRight: (pos) => dispatch({ type: 'matchRight', pos, now: Date.now() }),
    next: () => {
      const nq = makeQuestionState(game.qs[game.i + 1]);
      setNow(nq.start);
      dispatch({ type: 'next', q: nq });
    },
    quitAsk: () => dispatch({ type: 'quitAsk', now: Date.now() }),
    quitNo: () => dispatch({ type: 'quitNo', now: Date.now() }),
  };

  return {
    game,
    q,
    quit,
    question,
    timeLeft,
    isLast: game.i === game.qs.length - 1,
    actions,
  };
}
