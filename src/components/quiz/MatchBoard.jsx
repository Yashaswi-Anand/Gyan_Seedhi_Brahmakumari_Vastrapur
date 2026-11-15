import { useLang } from '@/context/LanguageContext';
import { STEP_DIGITS } from '@/i18n/calendar';

/** "Match the pairs" question: pick a word on the left, then its partner on the right. */
export default function MatchBoard({ question, state, onLeft, onRight }) {
  const { t, lang, tq } = useLang();
  const np = question.pairs.length;
  const selected = state.mL != null;
  const [one, two] = STEP_DIGITS[lang];
  const badge = (mi) => <span className={`bd bd${mi}`}>{mi + 1}</span>;

  return (
    <>
      <div className="mstep">
        <span className="no">{state.done ? '✓' : selected ? two : one}</span>
        <span>
          {t(state.done ? 'सभी जोड़ियाँ मिल गईं' : selected ? 'अब दायीं ओर से इसका जोड़ीदार चुनें' : 'बायीं ओर से एक शब्द चुनें')}
        </span>
      </div>
      <p className="mprog">{t(`${state.matched.length} / ${np} जोड़ियाँ मिलीं`)}</p>
      <div className="match">
        <div className={`mcol${selected ? '' : ' hot'}`}>
          {question.pairs.map((p, k) => {
            const mi = state.matched.indexOf(k);
            const ok = mi > -1;
            return (
              <button
                key={k}
                className={`mcard${ok ? ` ok pc${mi}` : state.mL === k ? ' sel' : ''}`}
                onClick={() => onLeft(k)}
                disabled={ok || state.done}
              >
                {tq(p[0])}
                {ok && badge(mi)}
              </button>
            );
          })}
        </div>
        <div className={`mcol${selected ? ' hot' : ''}`}>
          {state.rightOrder.map((r, pos) => {
            const mi = state.matched.indexOf(r);
            const ok = mi > -1;
            return (
              <button
                key={r}
                className={`mcard${ok ? ` ok pc${mi}` : ''}${state.flash === pos ? ' shake' : ''}`}
                onClick={() => onRight(pos)}
                disabled={ok || state.done}
              >
                {tq(question.pairs[r][1])}
                {ok && badge(mi)}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
