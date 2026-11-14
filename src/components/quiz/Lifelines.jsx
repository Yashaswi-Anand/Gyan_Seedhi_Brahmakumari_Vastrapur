import { useLang } from '@/context/LanguageContext';

/** 50:50 and hint — each usable once per quiz, only on multiple-choice questions. */
export default function Lifelines({ canFifty, canHint, onFifty, onHint }) {
  const { t } = useLang();
  return (
    <div className="life">
      <button onClick={onFifty} disabled={!canFifty}>
        50 : 50
      </button>
      <button onClick={onHint} disabled={!canHint}>
        {t('संकेत')}
      </button>
    </div>
  );
}
