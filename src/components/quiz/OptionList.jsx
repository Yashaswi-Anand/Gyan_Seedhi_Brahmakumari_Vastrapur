import { useLang } from '@/context/LanguageContext';
import { OPTION_LETTERS } from '@/i18n/calendar';

/** Multiple-choice options in the shuffled order for this attempt. */
export default function OptionList({ question, state, onPick }) {
  const { t, lang, tq } = useLang();
  const letters = OPTION_LETTERS[lang];
  return (
    <div className="opts">
      {state.order.map((k, pos) => {
        const gone = state.removed.includes(k);
        const struck = state.struck.includes(k);
        let cls = 'opt';
        if (gone) cls += ' gone';
        else if (struck) cls += ' wrong';
        else if (state.done && k === question.ans) cls += ' right';
        else if (state.sel === k) cls += ' sel';
        return (
          <button key={k} className={cls} onClick={() => onPick(k)} disabled={state.done || gone || struck}>
            <span className="lt">{letters[pos]}</span>
            <span className="ot">{tq(question.opts[k])}</span>
          </button>
        );
      })}
    </div>
  );
}
