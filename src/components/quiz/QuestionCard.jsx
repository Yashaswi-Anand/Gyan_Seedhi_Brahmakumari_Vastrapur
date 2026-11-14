import { useLang } from '@/context/LanguageContext';

export default function QuestionCard({ question }) {
  const { t } = useLang();
  const isSelf = question.type === 'self';
  return (
    <div className="qbox">
      <div className="qtags">
        <span className={`chip cat${isSelf ? ' ch' : ''}`}>{t(isSelf ? 'चार्ट' : 'मुरली')}</span>
        {!isSelf && <span className="chip">{t(question.tag)}</span>}
        {question.ctxChip && <span className="chip gold">{t(question.ctxChip)}</span>}
      </div>
      <p className="qtext">{t(question.q)}</p>
    </div>
  );
}
