import { useLang } from '@/context/LanguageContext';

/** Shown after a question is answered or times out. */
export default function AnswerFeedback({ question, result }) {
  const { t, tq } = useLang();
  const miss = result.timeout;
  const isSelf = question.type === 'self';
  const isMatch = question.type === 'match';

  if (isSelf) {
    return miss ? (
      <div className="feed miss">
        <h3>{t('समय पूरा हुआ')}</h3>
      </div>
    ) : null;
  }

  const title = miss ? 'समय पूरा हुआ' : result.first ? 'सही उत्तर!' : 'सही, अब समझ गए';
  return (
    <div className={`feed${miss ? ' miss' : ''}`}>
      <h3>
        {t(title)}
        {result.pts ? t(` · +${result.pts} अंक`) : ''}
      </h3>
      {miss && !isMatch && (
        <div className="blk">
          <b>{t('सही उत्तर')}</b>
          {tq(question.opts[question.ans])}
        </div>
      )}
      {question.exp && (
        <div className="blk">
          <b>{t('मुरली का बिंदु')}</b>
          {tq(question.exp)}
        </div>
      )}
      {question.life && (
        <div className="blk">
          <b>{t('आपके जीवन में कैसे मदद करेगा')}</b>
          {tq(question.life)}
        </div>
      )}
    </div>
  );
}
